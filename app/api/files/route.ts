import { NextRequest, NextResponse } from 'next/server';
import { createVaultRecord, listVaultRecords } from '@/lib/vault-store';
import { getClientIp, heartbeat, logSecurityEvent } from '@/lib/guard';

export async function GET() {
  await heartbeat();
  const records = await listVaultRecords();
  return NextResponse.json({ files: records });
}

export async function POST(request: NextRequest) {
  await heartbeat();
  const body = await request.json();

  const required = [
    'encryptedNameBase64',
    'ciphertextBase64',
    'saltBase64',
    'contentIvBase64',
    'nameIvBase64',
    'mimeType',
    'size'
  ];

  for (const key of required) {
    if (!(key in body)) {
      return NextResponse.json({ error: `Field ${key} wajib ada.` }, { status: 400 });
    }
  }

  const record = await createVaultRecord(body);
  await logSecurityEvent({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Encrypted file stored in vault',
    meta: { id: record.id, size: record.size, source: getClientIp(request.headers) }
  });

  return NextResponse.json({ file: record }, { status: 201 });
}
