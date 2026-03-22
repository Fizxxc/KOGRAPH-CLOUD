export type VaultRecord = {
  id: string;
  originalNameEncrypted: string;
  originalNameIv: string;
  mimeType: string;
  size: number;
  contentIv: string;
  salt: string;
  encryptedData: string;
  attempts: number;
  createdAt: string;
};
