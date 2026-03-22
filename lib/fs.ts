import { promises as fs } from 'fs';
import path from 'path';

export const ROOT_DIR = path.join(process.cwd(), 'data');
export const VAULT_DIR = path.join(ROOT_DIR, 'vault');
export const LOG_DIR = path.join(ROOT_DIR, 'logs');
export const EVENTS_LOG = path.join(LOG_DIR, 'kograph-int.log');

export async function ensureDataDirs() {
  await fs.mkdir(VAULT_DIR, { recursive: true });
  await fs.mkdir(LOG_DIR, { recursive: true });
}
