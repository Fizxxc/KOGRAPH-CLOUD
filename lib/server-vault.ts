import fs from "node:fs/promises";
import path from "node:path";
import { del, head, put } from "@vercel/blob";

export type StoredVaultFile = {
  id: string;
  createdAt: string;
  size: number;
  fileExt: string;
  mimeType: string;
  attempts: number;
  payload: unknown;
};

type VaultIndexRecord = {
  id: string;
  createdAt: string;
  size: number;
  fileExt: string;
  mimeType: string;
  attempts: number;
};

type VaultIndex = {
  files: VaultIndexRecord[];
};

const LOCAL_DIR = path.join(process.cwd(), "data", "vault");
const LOCAL_INDEX_PATH = path.join(LOCAL_DIR, "vault-index.json");

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

function getBlobPath(id: string) {
  return `vault/${id}.json`;
}

function getBlobIndexPath() {
  return "vault/vault-index.json";
}

function getLocalPath(id: string) {
  return path.join(LOCAL_DIR, `${id}.json`);
}

async function ensureLocalVaultDir() {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
}

async function readLocalJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeLocalJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function readBlobTextByUrl(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`blob_fetch_failed:${res.status}`);
  }

  return await res.text();
}

async function readBlobIndex(): Promise<VaultIndex> {
  try {
    const meta = await head(getBlobIndexPath());
    const text = await readBlobTextByUrl(meta.url);
    const parsed = JSON.parse(text) as VaultIndex;

    return {
      files: Array.isArray(parsed.files) ? parsed.files : []
    };
  } catch {
    return { files: [] };
  }
}

async function writeBlobIndex(index: VaultIndex) {
  try {
    await del(getBlobIndexPath());
  } catch {
    // ignore
  }

  await put(getBlobIndexPath(), JSON.stringify(index, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false
  });
}

async function upsertIndexRecord(record: StoredVaultFile) {
  if (isVercelRuntime()) {
    const index = await readBlobIndex();

    const next: VaultIndexRecord = {
      id: record.id,
      createdAt: record.createdAt,
      size: record.size,
      fileExt: record.fileExt,
      mimeType: record.mimeType,
      attempts: Number(record.attempts ?? 0)
    };

    const existingIndex = index.files.findIndex((item) => item.id === record.id);

    if (existingIndex >= 0) {
      index.files[existingIndex] = next;
    } else {
      index.files.push(next);
    }

    await writeBlobIndex(index);
    return;
  }

  await ensureLocalVaultDir();
  const index =
    (await readLocalJson<VaultIndex>(LOCAL_INDEX_PATH)) ?? { files: [] };

  const next: VaultIndexRecord = {
    id: record.id,
    createdAt: record.createdAt,
    size: record.size,
    fileExt: record.fileExt,
    mimeType: record.mimeType,
    attempts: Number(record.attempts ?? 0)
  };

  const existingIndex = index.files.findIndex((item) => item.id === record.id);

  if (existingIndex >= 0) {
    index.files[existingIndex] = next;
  } else {
    index.files.push(next);
  }

  await writeLocalJson(LOCAL_INDEX_PATH, index);
}

async function removeIndexRecord(id: string) {
  if (isVercelRuntime()) {
    const index = await readBlobIndex();
    index.files = index.files.filter((item) => item.id !== id);
    await writeBlobIndex(index);
    return;
  }

  await ensureLocalVaultDir();
  const index =
    (await readLocalJson<VaultIndex>(LOCAL_INDEX_PATH)) ?? { files: [] };
  index.files = index.files.filter((item) => item.id !== id);
  await writeLocalJson(LOCAL_INDEX_PATH, index);
}

export async function writeStoredFile(record: StoredVaultFile) {
  if (isVercelRuntime()) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("missing_blob_token");
    }

    try {
      await del(getBlobPath(record.id));
    } catch {
      // ignore
    }

    await put(getBlobPath(record.id), JSON.stringify(record), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false
    });

    await upsertIndexRecord(record);
    return;
  }

  await ensureLocalVaultDir();
  await writeLocalJson(getLocalPath(record.id), record);
  await upsertIndexRecord(record);
}

export async function readStoredFile(
  id: string
): Promise<StoredVaultFile | null> {
  if (isVercelRuntime()) {
    try {
      const meta = await head(getBlobPath(id));
      const text = await readBlobTextByUrl(meta.url);
      return JSON.parse(text) as StoredVaultFile;
    } catch (error) {
      console.error("readStoredFile error:", error);
      return null;
    }
  }

  return await readLocalJson<StoredVaultFile>(getLocalPath(id));
}

export async function listStoredFiles(): Promise<VaultIndexRecord[]> {
  if (isVercelRuntime()) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("missing_blob_token");
    }

    const index = await readBlobIndex();

    return [...index.files].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  await ensureLocalVaultDir();
  const index =
    (await readLocalJson<VaultIndex>(LOCAL_INDEX_PATH)) ?? { files: [] };

  return [...index.files].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function deleteStoredFile(id: string) {
  if (isVercelRuntime()) {
    try {
      await del(getBlobPath(id));
    } catch {
      // ignore
    }

    await removeIndexRecord(id);
    return;
  }

  try {
    await fs.unlink(getLocalPath(id));
  } catch {
    // ignore
  }

  await removeIndexRecord(id);
}

export async function incrementAttempts(id: string): Promise<number> {
  const record = await readStoredFile(id);

  if (!record) {
    throw new Error("file_not_found");
  }

  record.attempts = Number(record.attempts ?? 0) + 1;
  await writeStoredFile(record);

  return record.attempts;
}

export async function resetAttempts(id: string): Promise<void> {
  const record = await readStoredFile(id);

  if (!record) {
    throw new Error("file_not_found");
  }

  record.attempts = 0;
  await writeStoredFile(record);
}