import { NextResponse } from 'next/server';
import { listVaultRecords } from '@/lib/storage';

export async function GET() {
  try {
    const files = await listVaultRecords();
    return NextResponse.json({ files });
  } catch (error) {
    console.error('[EMBER][LIST][ERROR]', error);
    return NextResponse.json({ files: [] }, { status: 500 });
  }
}
