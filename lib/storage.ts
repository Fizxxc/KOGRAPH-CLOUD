import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { VaultRecord } from './types';

const vaultDir = path.join(process.cwd(), 'data', 'vault');

async function ensureDir() {
  await fs.mkdir(vaultDir, { recursive: true });
}

function filePath(id: string) {
  return path.join(vaultDir, `${id}.json`);
}

export async function listVaultRecords(): Promise<VaultRecord[]> {
  await ensureDir();
  const files = await fs.readdir(vaultDir);
  const records = await Promise.all(
    files.filter((file) => file.endsWith('.json')).map(async (file) => JSON.parse(await fs.readFile(path.join(vaultDir, file), 'utf8')) as VaultRecord)
  );
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveVaultRecord(payload: Omit<VaultRecord, 'id' | 'attempts' | 'createdAt'>) {
  await ensureDir();
  const id = crypto.randomUUID();
  const record: VaultRecord = { ...payload, id, attempts: 0, createdAt: new Date().toISOString() };
  await fs.writeFile(filePath(id), JSON.stringify(record, null, 2), 'utf8');
  return record;
}

export async function readVaultRecord(id: string) {
  const raw = await fs.readFile(filePath(id), 'utf8');
  return JSON.parse(raw) as VaultRecord;
}

export async function writeVaultRecord(record: VaultRecord) {
  await fs.writeFile(filePath(record.id), JSON.stringify(record, null, 2), 'utf8');
}

export async function deleteVaultRecord(id: string) {
  await fs.rm(filePath(id), { force: true });
}
