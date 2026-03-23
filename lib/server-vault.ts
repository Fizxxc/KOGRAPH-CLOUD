import fs from "node:fs/promises";
import path from "node:path";
import { put, list, del, head, get } from "@vercel/blob";

export type StoredVaultFile = {
  id: string;
  createdAt: string;
  size: number;
  fileExt: string;
  mimeType: string;
  attempts: number;
  payload: unknown;
};

const LOCAL_DIR = path.join(process.cwd(), "data", "vault");

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

function getBlobPath(id: string) {
  return `vault/${id}.json`;
}

function getLocalPath(id: string) {
  return path.join(LOCAL_DIR, `${id}.json`);
}

async function ensureLocalVaultDir() {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
}

export async function writeStoredFile(record: StoredVaultFile) {
  if (isVercelRuntime()) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("missing_blob_token");
    }

    await put(getBlobPath(record.id), JSON.stringify(record), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false
    });

    return;
  }

  await ensureLocalVaultDir();
  await fs.writeFile(getLocalPath(record.id), JSON.stringify(record), "utf8");
}

export async function readStoredFile(id: string): Promise<StoredVaultFile | null> {
  if (isVercelRuntime()) {
    try {
      await head(getBlobPath(id));

      const result = await get(getBlobPath(id), {
        access: "private"
      });

      if (!result) return null;
      if (result.statusCode !== 200) return null;
      if (!result.stream) return null;

      const text = await new Response(result.stream).text();
      return JSON.parse(text) as StoredVaultFile;
    } catch (error) {
      console.error("readStoredFile error:", error);
      throw error;
    }
  }

  try {
    const raw = await fs.readFile(getLocalPath(id), "utf8");
    return JSON.parse(raw) as StoredVaultFile;
  } catch {
    return null;
  }
}

export async function listStoredFiles(): Promise<StoredVaultFile[]> {
  if (isVercelRuntime()) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("missing_blob_token");
    }

    const result = await list({ prefix: "vault/" });

    const files = await Promise.all(
      result.blobs.map(async (item) => {
        const blobResult = await get(item.pathname, {
          access: "private"
        });

        if (!blobResult) {
          throw new Error(`blob_not_found:${item.pathname}`);
        }

        if (blobResult.statusCode !== 200 || !blobResult.stream) {
          throw new Error(`blob_read_failed:${item.pathname}:${blobResult.statusCode}`);
        }

        const text = await new Response(blobResult.stream).text();
        return JSON.parse(text) as StoredVaultFile;
      })
    );

    return files.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  await ensureLocalVaultDir();
  const names = await fs.readdir(LOCAL_DIR);

  const items = await Promise.all(
    names
      .filter((name) => name.endsWith(".json"))
      .map(async (name) => {
        const raw = await fs.readFile(path.join(LOCAL_DIR, name), "utf8");
        return JSON.parse(raw) as StoredVaultFile;
      })
  );

  return items.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function deleteStoredFile(id: string) {
  if (isVercelRuntime()) {
    await del(getBlobPath(id));
    return;
  }

  try {
    await fs.unlink(getLocalPath(id));
  } catch {
    // ignore
  }
}

export async function incrementAttempts(id: string): Promise<number> {
  const record = await readStoredFile(id);

  if (!record) {
    throw new Error("file_not_found");
  }

  record.attempts += 1;
  await writeStoredFile(record);
  return record.attempts;
}

export async function resetAttempts(id: string) {
  const record = await readStoredFile(id);
  if (!record) return;

  record.attempts = 0;
  await writeStoredFile(record);
}