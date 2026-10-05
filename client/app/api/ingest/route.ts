import { NextResponse } from 'next/server';
import { ingestNcertDocuments } from '@/lib/ncert_indexer';
import { invalidateVectorCache } from '@/lib/rag';

export async function POST() {
  try {
    const result = await ingestNcertDocuments();
    invalidateVectorCache();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error during ingestion endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
