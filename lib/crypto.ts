export type EncryptedPayload = {
  id?: string;
  version: number;
  fileName: string;
  fileExt: string;
  mimeType: string;
  size: number;
  encryptedData: string;
  nameData: string;
  salt: string;
  contentIv: string;
  nameIv: string;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(
    view.byteOffset,
    view.byteOffset + view.byteLength
  ) as ArrayBuffer;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: 250000,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function aesEncrypt(
  input: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<Uint8Array> {
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv)
    },
    key,
    toArrayBuffer(input)
  );

  return new Uint8Array(encrypted);
}

async function aesDecrypt(
  input: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv)
    },
    key,
    toArrayBuffer(input)
  );

  return new Uint8Array(decrypted);
}

export async function encryptFile(
  file: File,
  passphrase: string
): Promise<EncryptedPayload> {
  const salt = randomBytes(16);
  const contentIv = randomBytes(12);
  const nameIv = randomBytes(12);

  const key = await deriveKey(passphrase, salt);

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const fileNameBytes = enc.encode(file.name);

  const encryptedData = await aesEncrypt(fileBytes, key, contentIv);
  const encryptedName = await aesEncrypt(fileNameBytes, key, nameIv);

  const fileExt = file.name.includes(".")
    ? file.name.split(".").pop() || "bin"
    : "bin";

  return {
    version: 1,
    fileName: "encrypted",
    fileExt,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    encryptedData: toBase64(encryptedData),
    nameData: toBase64(encryptedName),
    salt: toBase64(salt),
    contentIv: toBase64(contentIv),
    nameIv: toBase64(nameIv)
  };
}

export async function decryptPayload(
  payload: EncryptedPayload,
  passphrase: string
): Promise<{ fileName: string; blob: Blob }> {
  const salt = fromBase64(payload.salt);
  const contentIv = fromBase64(payload.contentIv);
  const nameIv = fromBase64(payload.nameIv);
  const encryptedData = fromBase64(payload.encryptedData);
  const encryptedName = fromBase64(payload.nameData);

  const key = await deriveKey(passphrase, salt);

  const fileBytes = await aesDecrypt(encryptedData, key, contentIv);
  const fileNameBytes = await aesDecrypt(encryptedName, key, nameIv);

  const fileName = dec.decode(fileNameBytes);

  const blob = new Blob([toArrayBuffer(fileBytes)], {
    type: payload.mimeType || "application/octet-stream"
  });

  return { fileName, blob };
}