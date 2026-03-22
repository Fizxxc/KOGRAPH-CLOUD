import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ensureDataDirs, VAULT_DIR } from './fs';

export type VaultRecord = {
  id: string;
  encryptedNameBase64: string;
  ciphertextBase64: string;
  saltBase64: string;
  contentIvBase64: string;
  nameIvBase64: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

function filePath(id: string) {
  return path.join(VAULT_DIR, `${id}.json`);
}

export async function listVaultRecords(): Promise<VaultRecord[]> {
  await ensureDataDirs();
  const files = await fs.readdir(VAULT_DIR);
  const records = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => JSON.parse(await fs.readFile(path.join(VAULT_DIR, file), 'utf8')) as VaultRecord)
  );
  return records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createVaultRecord(input: Omit<VaultRecord, 'id' | 'createdAt'>) {
  await ensureDataDirs();
  const record: VaultRecord = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString()
  };
  await fs.writeFile(filePath(record.id), JSON.stringify(record, null, 2), 'utf8');
  return record;
}

export async function getVaultRecord(id: string) {
  const raw = await fs.readFile(filePath(id), 'utf8');
  return JSON.parse(raw) as VaultRecord;
}

export async function deleteVaultRecord(id: string) {
  await fs.unlink(filePath(id));
}
