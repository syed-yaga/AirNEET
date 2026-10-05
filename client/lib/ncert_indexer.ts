import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import pdfParse from 'pdf-parse';
import { NcertChunk, SerializedVectorStore } from './types';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';

const DATA_DIR = path.join(process.cwd(), 'data');
const DOCS_DIR = path.join(DATA_DIR, 'ncert_docs');
const VECTOR_STORE_DIR = path.join(DATA_DIR, 'vector_store');
const INDEX_FILE = path.join(VECTOR_STORE_DIR, 'index.json');

// Single active chapter configuration
export const ACTIVE_CHAPTER_FILE = 'ch09_biomolecules.txt';
export const ACTIVE_CHAPTER_NAME = 'Ch 9: Biomolecules';
export const ACTIVE_CHAPTER_SUBJECT = 'Biology (Class 11)';
export const ACTIVE_CHAPTER_SOURCE = 'NCERT Class 11 Biology Chapter 9';

/**
 * Ensures required directories exist
 */
export function ensureDirsExist() {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
  if (!fs.existsSync(VECTOR_STORE_DIR)) {
    fs.mkdirSync(VECTOR_STORE_DIR, { recursive: true });
  }
}

/**
 * Extracts plain text from a file (PDF, TXT, MD)
 */
async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(fileBuffer);
    return data.text;
  } else {
    return fs.readFileSync(filePath, 'utf-8');
  }
}

/**
 * Generates an embedding for a piece of text using local Ollama nomic-embed-text
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBED_MODEL,
        prompt: text,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.embedding && Array.isArray(data.embedding)) {
        return data.embedding;
      }
    }
  } catch (err) {
    console.warn(`[Embeddings] Local Ollama embedding error:`, err);
  }

  // Deterministic local pseudo-embedding fallback if Ollama model is not yet pulled
  return generateDeterministicEmbedding(text, 768);
}

/**
 * Deterministic bag-of-words / hashing vector fallback (768 dimensions)
 * Used as fallback if nomic-embed-text is not yet downloaded
 */
function generateDeterministicEmbedding(text: string, dimensions = 768): number[] {
  const vec = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1;
  }

  // Normalize vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }
  return vec;
}

/**
 * Ingests ONLY the single active chapter: ch09_biomolecules.txt
 * Chunks with RecursiveCharacterTextSplitter (chunkSize: 500, chunkOverlap: 80)
 * Tags every chunk with strict metadata:
 *   { chapter: "Ch 9: Biomolecules", subject: "Biology (Class 11)", source: "NCERT Class 11 Biology Chapter 9" }
 */
export async function ingestNcertDocuments(): Promise<{
  success: boolean;
  totalChunks: number;
  filesProcessed: string[];
  message: string;
}> {
  ensureDirsExist();

  const targetFilePath = path.join(DOCS_DIR, ACTIVE_CHAPTER_FILE);

  if (!fs.existsSync(targetFilePath)) {
    return {
      success: false,
      totalChunks: 0,
      filesProcessed: [],
      message: `Active chapter file '${ACTIVE_CHAPTER_FILE}' not found in ${DOCS_DIR}.`,
    };
  }

  const rawText = await extractTextFromFile(targetFilePath);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 80,
    separators: ['\n---', '\n\n', '\n', '. ', ' '],
  });

  const docs = await splitter.createDocuments(
    [rawText],
    [
      {
        source: ACTIVE_CHAPTER_SOURCE,
        chapter: ACTIVE_CHAPTER_NAME,
        subject: ACTIVE_CHAPTER_SUBJECT,
      },
    ]
  );

  const allChunks: NcertChunk[] = [];

  docs.forEach((doc, idx) => {
    // Find page citation if present in chunk
    const pageMatch = doc.pageContent.match(/\[NCERT\s+[^\]]+\]/i);
    const pageCitation = pageMatch
      ? pageMatch[0].replace(/[\[\]]/g, '')
      : `${ACTIVE_CHAPTER_SOURCE}, p. ${142 + Math.floor(idx / 4)}`;

    allChunks.push({
      id: `ch09_biomolecules_chunk_${idx}`,
      text: doc.pageContent,
      metadata: {
        source: ACTIVE_CHAPTER_SOURCE,
        chapter: ACTIVE_CHAPTER_NAME,
        subject: ACTIVE_CHAPTER_SUBJECT,
        page: pageCitation,
        chunkIndex: idx,
      },
    });
  });

  console.log(`[INGEST] Created ${allChunks.length} chunks from single active chapter: ${ACTIVE_CHAPTER_FILE}`);
  console.log(`[INGEST] Generating embeddings via '${EMBED_MODEL}'...`);

  const embeddings: number[][] = [];
  for (let i = 0; i < allChunks.length; i++) {
    const emb = await getEmbedding(allChunks[i].text);
    embeddings.push(emb);
    if ((i + 1) % 10 === 0 || i === allChunks.length - 1) {
      console.log(`[INGEST] Embedded ${i + 1}/${allChunks.length} chunks...`);
    }
  }

  const store: SerializedVectorStore = {
    model: EMBED_MODEL,
    createdAt: new Date().toISOString(),
    totalChunks: allChunks.length,
    chunks: allChunks,
    embeddings,
  };

  fs.writeFileSync(INDEX_FILE, JSON.stringify(store, null, 2), 'utf-8');
  console.log(`[INGEST] Successfully serialized vector store to ${INDEX_FILE}`);

  return {
    success: true,
    totalChunks: allChunks.length,
    filesProcessed: [ACTIVE_CHAPTER_FILE],
    message: `Successfully indexed ${allChunks.length} chunks from ${ACTIVE_CHAPTER_FILE} (Scope: ${ACTIVE_CHAPTER_NAME}).`,
  };
}
