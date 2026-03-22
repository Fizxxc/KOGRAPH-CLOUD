import crypto from 'crypto';
import type { VaultRecord } from '@/lib/types';

function base64ToBuffer(value: string) {
  return Buffer.from(value, 'base64');
}

function decryptAesGcm(input: { encryptedBase64: string; ivBase64: string; key: Buffer }) {
  const payload = base64ToBuffer(input.encryptedBase64);
  const iv = base64ToBuffer(input.ivBase64);
  const authTag = payload.subarray(payload.length - 16);
  const encrypted = payload.subarray(0, payload.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', input.key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function deriveKey(keyText: string, saltBase64: string) {
  return crypto.pbkdf2Sync(keyText, base64ToBuffer(saltBase64), 120000, 32, 'sha256');
}

export function decryptVaultRecord(record: VaultRecord, keyText: string) {
  const key = deriveKey(keyText, record.salt);
  const fileName = decryptAesGcm({ encryptedBase64: record.originalNameEncrypted, ivBase64: record.originalNameIv, key }).toString('utf8');
  const fileBuffer = decryptAesGcm({ encryptedBase64: record.encryptedData, ivBase64: record.contentIv, key });
  return { fileName, fileBuffer, mimeType: record.mimeType };
}
