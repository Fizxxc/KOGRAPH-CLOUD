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

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function ensureArrayBuffer(view: Uint8Array): ArrayBuffer {
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function deriveAesKey(passphrase: string, saltBytes: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const saltBuffer = ensureArrayBuffer(saltBytes);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 120000,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptBytes(
  input: Uint8Array,
  key: CryptoKey,
  ivBytes: Uint8Array
): Promise<Uint8Array> {
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ensureArrayBuffer(ivBytes)
    },
    key,
    ensureArrayBuffer(input)
  );

  return new Uint8Array(encrypted);
}

async function decryptBytes(
  input: Uint8Array,
  key: CryptoKey,
  ivBytes: Uint8Array
): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ensureArrayBuffer(ivBytes)
    },
    key,
    ensureArrayBuffer(input)
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

  const aesKey = await deriveAesKey(passphrase, salt);

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const nameBytes = encoder.encode(file.name);

  const encryptedFileBytes = await encryptBytes(fileBytes, aesKey, contentIv);
  const encryptedNameBytes = await encryptBytes(nameBytes, aesKey, nameIv);

  const fileExt = file.name.includes(".")
    ? file.name.split(".").pop() || "bin"
    : "bin";

  return {
    version: 1,
    fileName: "encrypted",
    fileExt,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    encryptedData: bytesToBase64(encryptedFileBytes),
    nameData: bytesToBase64(encryptedNameBytes),
    salt: bytesToBase64(salt),
    contentIv: bytesToBase64(contentIv),
    nameIv: bytesToBase64(nameIv)
  };
}

export async function decryptPayload(
  payload: EncryptedPayload,
  passphrase: string
): Promise<{ fileName: string; blob: Blob }> {
  const salt = base64ToBytes(payload.salt);
  const contentIv = base64ToBytes(payload.contentIv);
  const nameIv = base64ToBytes(payload.nameIv);
  const encryptedData = base64ToBytes(payload.encryptedData);
  const encryptedName = base64ToBytes(payload.nameData);

  const aesKey = await deriveAesKey(passphrase, salt);

  const fileBytes = await decryptBytes(encryptedData, aesKey, contentIv);
  const nameBytes = await decryptBytes(encryptedName, aesKey, nameIv);

  const fileName = decoder.decode(nameBytes);
  const blob = new Blob([ensureArrayBuffer(fileBytes)], {
    type: payload.mimeType || "application/octet-stream"
  });

  return { fileName, blob };
}