import { NextResponse } from 'next/server';
import { saveVaultRecord } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const record = await saveVaultRecord({
      originalNameEncrypted: body.originalNameEncrypted,
      originalNameIv: body.originalNameIv,
      mimeType: body.mimeType,
      size: body.size,
      contentIv: body.contentIv,
      salt: body.salt,
      encryptedData: body.encryptedData
    });

    console.log(`[EMBER][UPLOAD] ${record.id} stored`);
    return NextResponse.json({ ok: true, id: record.id });
  } catch (error) {
    console.error('[EMBER][UPLOAD][ERROR]', error);
    return NextResponse.json({ ok: false, error: 'upload_failed' }, { status: 500 });
  }
}
