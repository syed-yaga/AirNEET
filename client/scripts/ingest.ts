import { ingestNcertDocuments } from '../lib/ncert_indexer';

async function main() {
  console.log('====================================================');
  console.log('📖 AirNEET - NCERT Offline Document Ingestion');
  console.log('====================================================');
  try {
    const result = await ingestNcertDocuments();
    if (result.success) {
      console.log(`\n✅ Ingestion Complete!`);
      console.log(`📦 Processed Files: ${result.filesProcessed.join(', ')}`);
      console.log(`🧩 Total Chunks Indexed: ${result.totalChunks}`);
      console.log(`📁 Vector Index: client/data/vector_store/index.json`);
    } else {
      console.error(`\n❌ Ingestion Failed: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal Ingestion Error:', error);
    process.exit(1);
  }
}

main();
