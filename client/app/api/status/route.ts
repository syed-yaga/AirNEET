import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const INDEX_FILE = path.join(process.cwd(), 'data', 'vector_store', 'index.json');

export async function GET() {
  let ollamaRunning = false;
  let models: string[] = [];

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      ollamaRunning = true;
      const data = await res.json();
      if (Array.isArray(data.models)) {
        models = data.models.map((m: { name: string }) => m.name);
      }
    }
  } catch (err) {
    // Ollama not reachable
    ollamaRunning = false;
  }

  let vectorStoreReady = false;
  let totalChunks = 0;
  let createdAt = null;

  if (fs.existsSync(INDEX_FILE)) {
    try {
      const content = fs.readFileSync(INDEX_FILE, 'utf-8');
      const store = JSON.parse(content);
      vectorStoreReady = true;
      totalChunks = store.totalChunks || (store.chunks ? store.chunks.length : 0);
      createdAt = store.createdAt;
    } catch (e) {
      vectorStoreReady = false;
    }
  }

  return NextResponse.json({
    ok: true,
    ollamaRunning,
    hasLlama: models.some((m) => m.toLowerCase().includes('llama3.2')),
    hasEmbed: models.some((m) => m.toLowerCase().includes('nomic-embed-text')),
    models,
    vectorStoreReady,
    totalChunks,
    createdAt,
  });
}
