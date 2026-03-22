"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import HumanCheck from "@/components/HumanCheck";
import KographWidget from "@/components/KographWidget";
import {
  decryptPayload,
  encryptFile,
  type EncryptedPayload
} from "@/lib/crypto";

type VaultItem = {
  id: string;
  createdAt: string;
  size: number;
  fileExt: string;
  mimeType: string;
  attempts: number;
};

export default function Page() {
  const [booted, setBooted] = useState(false);
  const [humanVerified, setHumanVerified] = useState(false);
  const [vault, setVault] = useState<VaultItem[]>([]);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Vault siap.");
  const [burningId, setBurningId] = useState<string | null>(null);
  const [burned, setBurned] = useState(false);

  const burnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const activeFileCount = useMemo(() => vault.length, [vault]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (burnTimerRef.current) {
        clearTimeout(burnTimerRef.current);
      }
    };
  }, []);

  const writeLog = useCallback(
    async (
      level: string,
      event: string,
      message: string,
      meta?: Record<string, unknown>
    ) => {
      try {
        await fetch("/api/security/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level,
            source: "EMBER.VAULT",
            event,
            message,
            meta
          })
        });
      } catch (error) {
        console.error("writeLog failed:", error);
      }
    },
    []
  );

  const loadVault = useCallback(async () => {
    try {
      const res = await fetch("/api/vault/list", {
        method: "GET",
        cache: "no-store"
      });

      if (!res.ok) {
        throw new Error(`Failed to load vault: ${res.status}`);
      }

      const json = await res.json();

      if (mountedRef.current) {
        setVault(Array.isArray(json.files) ? json.files : []);
      }
    } catch (error) {
      console.error(error);

      if (mountedRef.current) {
        setStatus("Gagal memuat vault.");
      }
    }
  }, []);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
  }, []);

  const handleHumanVerified = useCallback(() => {
    setHumanVerified(true);
  }, []);

  useEffect(() => {
    if (!humanVerified) return;

    void (async () => {
      await loadVault();
      await writeLog(
        "info",
        "human_presence_verified",
        "Interactive human verification passed"
      );
    })();
  }, [humanVerified, loadVault, writeLog]);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) {
        setStatus("Pilih file terlebih dahulu.");
        return;
      }

      if (!key.trim()) {
        setStatus("Masukkan key dulu.");
        return;
      }

      setBusy(true);
      setStatus("Mengenkripsi file...");

      try {
        for (const file of Array.from(fileList)) {
          const payload = await encryptFile(file, key);

          const uploadRes = await fetch("/api/vault/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed for ${file.name}`);
          }

          await writeLog("info", "file_encrypted", "Encrypted file stored", {
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream"
          });
        }

        if (mountedRef.current) {
          setStatus("File terenkripsi dan tersimpan.");
        }

        await loadVault();
      } catch (error) {
        console.error(error);

        if (mountedRef.current) {
          setStatus("Upload gagal.");
        }

        await writeLog("warn", "file_encrypt_upload_failed", "Upload failed", {
          reason: error instanceof Error ? error.message : "unknown"
        });
      } finally {
        if (mountedRef.current) {
          setBusy(false);
        }
      }
    },
    [key, loadVault, writeLog]
  );

  const decryptItem = useCallback(
    async (id: string) => {
      if (!key.trim()) {
        setStatus("Masukkan key untuk decrypt.");
        return;
      }

      setBusy(true);
      setStatus("Mencoba decrypt file...");

      try {
        const res = await fetch(`/api/vault/file?id=${encodeURIComponent(id)}`, {
          method: "GET",
          cache: "no-store"
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch file ${id}`);
        }

        const json = await res.json();
        const payload = json.file as EncryptedPayload & { attempts: number };

        const { fileName, blob } = await decryptPayload(payload, key);

        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(href);

        if (mountedRef.current) {
          setStatus(`Decrypt berhasil: ${fileName}`);
        }

        await writeLog("info", "file_decrypted", `Decrypted file ${id}`, {
          id,
          fileName
        });
      } catch (error) {
        console.error("decrypt failed:", error);

        try {
          const patch = await fetch("/api/vault/file", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
          });

          if (!patch.ok) {
            throw new Error(`Failed to increment attempts for ${id}`);
          }

          const patchJson = await patch.json();
          const attempts = patchJson.attempts ?? 1;

          if (attempts >= 5) {
            if (mountedRef.current) {
              setBurningId(id);
              setStatus("Burn protocol aktif...");
            }

            await writeLog(
              "critical",
              "burn_protocol_armed",
              "Failed key threshold reached",
              { id, attempts }
            );

            burnTimerRef.current = setTimeout(async () => {
              try {
                await fetch("/api/vault/burn", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id })
                });

                await writeLog(
                  "critical",
                  "burn_protocol_complete",
                  "File removed after five failures",
                  { id, attempts }
                );

                await loadVault();

                if (mountedRef.current) {
                  setBurningId(null);
                  setBurned(true);
                  setStatus("Burn protocol selesai. File dihapus.");
                }
              } catch (burnError) {
                console.error("burn failed:", burnError);

                if (mountedRef.current) {
                  setBurningId(null);
                  setStatus("Burn protocol gagal dijalankan.");
                }
              }
            }, 2400);
          } else {
            if (mountedRef.current) {
              setStatus(`Key salah. Percobaan ${attempts}/5`);
            }

            await writeLog("warn", "decrypt_failed", "Wrong key", {
              id,
              attempts
            });

            await loadVault();
          }
        } catch (attemptError) {
          console.error("attempt tracking failed:", attemptError);

          if (mountedRef.current) {
            setStatus("Decrypt gagal.");
          }
        }
      } finally {
        if (mountedRef.current) {
          setBusy(false);
        }
      }
    },
    [key, loadVault, writeLog]
  );

  if (!booted) {
    return <LoadingScreen onComplete={handleBootComplete} />;
  }

  if (!humanVerified) {
    return <HumanCheck onVerified={handleHumanVerified} />;
  }

  return (
    <main className="page-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero-card">
        <div>
          <div className="eyebrow">LOCAL ENCRYPTED CLOUD</div>
          <h1>KOGRAPH CLOUD</h1>
          <p>
            Vault terenkripsi dengan burn protocol, human verification, dan perlindungan oleh
            <span className="text-cyan-300 font-semibold"> KOGRAPH.INT</span>.
          </p>
        </div>
        <div className="status-badge">Guard active</div>
      </section>

      <section className="stats-grid">
        <article className="glass-card">
          <span>Vault</span>
          <strong>{activeFileCount} file</strong>
        </article>

        <article className="glass-card">
          <span>Guard</span>
          <strong>Active</strong>
        </article>

        <article className="glass-card">
          <span>Access</span>
          <strong>Key Locked</strong>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel-card">
          <div className="panel-head">
            <div>
              <div className="eyebrow">ENCRYPTION KEY</div>
              <h2>Akses vault</h2>
            </div>
          </div>

          <input
            className="text-input"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Masukkan key rahasia"
          />

          <label className={`upload-drop ${busy ? "is-busy" : ""}`}>
            <input
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />
            <strong>{busy ? "Memproses..." : "Upload file untuk dienkripsi"}</strong>
            <span>File disimpan ke server dalam bentuk ciphertext.</span>
          </label>

          <div className="system-note">{status}</div>
        </div>

        <div className="panel-card">
          <div className="panel-head">
            <div>
              <div className="eyebrow">SYSTEM</div>
              <h2>KOGRAPH.INT integrated</h2>
            </div>

            <div className="mini-robot">
              <span className="robot-mark">
                <span className="ring ring-1" />
                <span className="robot-face">
                  <span className="eye left" />
                  <span className="eye right" />
                  <span className="mouth" />
                </span>
              </span>
            </div>
          </div>

          <p className="panel-copy">
            Dilindungi oleh KOGRAPH.INT — enkripsi, deteksi ancaman, dan pengawasan aktif dalam satu sistem.
          </p>

          <div className="pill-row">
            <span className="pill">Chat Bot 2.1</span>
            <span className="pill">Privacy Security 2.1</span>
            <span className="pill">Encryption Security 3.0</span>
          </div>
        </div>
      </section>

      <section className="vault-list panel-card">
        <div className="panel-head">
          <div>
            <div className="eyebrow">CLOUD CONTENT</div>
            <h2>Encrypted Cloud</h2>
          </div>
        </div>

        <div className="file-list">
          {vault.length === 0 ? (
            <div className="empty-state">Belum ada file terenkripsi.</div>
          ) : (
            vault.map((item) => (
              <article className="file-card" key={item.id}>
                <div>
                  <strong>Encrypted .{item.fileExt}</strong>
                  <span>{new Date(item.createdAt).toLocaleString("id-ID")}</span>
                  <small>
                    {Math.round(item.size / 1024)} KB • attempts {item.attempts}
                    /5
                  </small>
                </div>

                <button
                  className="action-btn"
                  onClick={() => decryptItem(item.id)}
                  disabled={busy || burningId === item.id}
                >
                  {burningId === item.id ? "Burning..." : "Decrypt"}
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <KographWidget />

      {burningId && (
        <div className="burn-overlay">
          <div className="burn-flame burn-1" />
          <div className="burn-flame burn-2" />
          <div className="burn-flame burn-3" />
          <div className="burn-text">Burn protocol active</div>
        </div>
      )}

      {burned && (
        <div className="toast" onClick={() => setBurned(false)}>
          File sudah hilang dari vault.
        </div>
      )}
    </main>
  );
}