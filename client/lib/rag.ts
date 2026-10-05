import fs from 'fs';
import path from 'path';
import { NcertChunk, RetrievedDoc, SerializedVectorStore } from './types';
import { getEmbedding, ingestNcertDocuments } from './ncert_indexer';

const DATA_DIR = path.join(process.cwd(), 'data');
const VECTOR_STORE_DIR = path.join(DATA_DIR, 'vector_store');
const INDEX_FILE = path.join(VECTOR_STORE_DIR, 'index.json');

let cachedStore: SerializedVectorStore | null = null;

/**
 * Loads the serialized vector store from disk into memory.
 * If not present, automatically attempts ingestion.
 */
export async function loadVectorStore(): Promise<SerializedVectorStore | null> {
  if (cachedStore) {
    return cachedStore;
  }

  if (fs.existsSync(INDEX_FILE)) {
    try {
      const data = fs.readFileSync(INDEX_FILE, 'utf-8');
      cachedStore = JSON.parse(data);
      return cachedStore;
    } catch (err) {
      console.error('[RAG] Failed to parse index.json:', err);
    }
  }

  // If index does not exist, auto-ingest
  console.log('[RAG] Vector store not found. Running auto-ingestion...');
  const result = await ingestNcertDocuments();
  if (result.success && fs.existsSync(INDEX_FILE)) {
    try {
      const data = fs.readFileSync(INDEX_FILE, 'utf-8');
      cachedStore = JSON.parse(data);
      return cachedStore;
    } catch (err) {
      console.error('[RAG] Failed to parse regenerated index.json:', err);
    }
  }

  return null;
}

/**
 * Clears in-memory cache when new documents are ingested
 */
export function invalidateVectorCache() {
  cachedStore = null;
}

/**
 * Computes cosine similarity between two numeric vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Keyword match booster for specific biological / NEET terms
 */
function computeKeywordBonus(query: string, text: string): number {
  const queryWords = query
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  if (queryWords.length === 0) return 0;

  const textLower = text.toLowerCase();
  let hits = 0;
  for (const w of queryWords) {
    if (textLower.includes(w)) {
      hits += 1;
    }
  }

  return (hits / queryWords.length) * 0.2; // up to 0.2 score boost
}

/**
 * Queries the local offline vector store for the top-k most relevant NCERT chunks
 */
export async function queryNcertContext(
  query: string,
  k = 3
): Promise<RetrievedDoc[]> {
  const store = await loadVectorStore();
  if (!store || !store.chunks || store.chunks.length === 0) {
    return [];
  }

  const queryEmbedding = await getEmbedding(query);

  const scoredDocs: RetrievedDoc[] = [];

  for (let i = 0; i < store.chunks.length; i++) {
    const chunk = store.chunks[i];
    const chunkEmbedding = store.embeddings[i];

    let score = 0;
    if (chunkEmbedding && chunkEmbedding.length > 0) {
      score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    }

    // Add term boost to ensure medical accuracy
    const bonus = computeKeywordBonus(query, chunk.text);
    const finalScore = score + bonus;

    scoredDocs.push({
      chunk,
      score: finalScore,
    });
  }

  // Sort descending by score
  scoredDocs.sort((a, b) => b.score - a.score);

  return scoredDocs.slice(0, k);
}

/**
 * Formats retrieved chunks into clean markdown excerpts for Socratic prompt injection
 */
export function formatRetrievedContext(docs: RetrievedDoc[]): string {
  if (docs.length === 0) {
    return 'No relevant NCERT context found in the local index.';
  }

  return docs
    .map((doc, idx) => {
      const citation = doc.chunk.metadata.page || doc.chunk.metadata.chapter || 'NCERT Textbook';
      return `[Source Excerpt #${idx + 1}: ${citation}]\n${doc.chunk.text.trim()}`;
    })
    .join('\n\n---\n\n');
}
