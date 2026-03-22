import { promises as fs } from "fs";
import path from "path";

export type StoredVaultFile = {
  id: string;
  originalNameEnc: string;
  fileExt: string;
  mimeType: string;
  cipherText: string;
  salt: string;
  contentIv: string;
  nameIv: string;
  createdAt: string;
  size: number;
  attempts: number;
};

const vaultDir = path.join(process.cwd(), "data", "vault");

async function ensureVaultDir() {
  await fs.mkdir(vaultDir, { recursive: true });
}

export async function listStoredFiles(): Promise<StoredVaultFile[]> {
  await ensureVaultDir();
  const files = await fs.readdir(vaultDir);
  const result: StoredVaultFile[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(vaultDir, file), "utf8");
    result.push(JSON.parse(raw) as StoredVaultFile);
  }
  return result.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function readStoredFile(id: string): Promise<StoredVaultFile | null> {
  await ensureVaultDir();
  const filePath = path.join(vaultDir, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as StoredVaultFile;
  } catch {
    return null;
  }
}

export async function writeStoredFile(file: StoredVaultFile) {
  await ensureVaultDir();
  const filePath = path.join(vaultDir, `${file.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(file, null, 2), "utf8");
}

export async function deleteStoredFile(id: string) {
  await ensureVaultDir();
  const filePath = path.join(vaultDir, `${id}.json`);
  await fs.rm(filePath, { force: true });
}
