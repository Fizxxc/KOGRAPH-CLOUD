import { NextResponse } from 'next/server';
import { decryptVaultRecord } from '../../../../lib/crypto-server';
import { deleteVaultRecord, readVaultRecord, writeVaultRecord } from '../../../../lib/storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const record = await readVaultRecord(body.id);

    try {
      const result = decryptVaultRecord(record, body.key);
      record.attempts = 0;
      await writeVaultRecord(record);
      return NextResponse.json({
        fileName: result.fileName,
        fileData: result.fileBuffer.toString('base64'),
        mimeType: result.mimeType
      });
    } catch {
      record.attempts += 1;

      if (record.attempts >= 5) {
        await deleteVaultRecord(record.id);
        console.warn(`[EMBER][BURN] ${record.id} removed after 5 failed attempts`);
        return NextResponse.json({ burned: true, error: 'burn_protocol_triggered' }, { status: 410 });
      }

      await writeVaultRecord(record);
      console.warn(`[EMBER][DECRYPT][WARN] ${record.id} wrong key attempt ${record.attempts}`);
      return NextResponse.json({ error: `Key salah. Attempt ${record.attempts}/5` }, { status: 401 });
    }
  } catch (error) {
    console.error('[EMBER][DECRYPT][ERROR]', error);
    return NextResponse.json({ error: 'decrypt_failed' }, { status: 500 });
  }
}
