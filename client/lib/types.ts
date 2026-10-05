export interface NcertMetadata {
  source: string;
  chapter: string;
  subject?: string;
  page?: number | string;
  chunkIndex: number;
  title?: string;
}

export interface NcertChunk {
  id: string;
  text: string;
  metadata: NcertMetadata;
}

export interface SerializedVectorStore {
  model: string;
  createdAt: string;
  totalChunks: number;
  chunks: NcertChunk[];
  embeddings: number[][];
}

export interface RetrievedDoc {
  chunk: NcertChunk;
  score: number;
}

export interface StudyInteraction {
  role: 'user' | 'assistant' | 'system';
  content: string;
  source?: string;
  timestamp?: string;
  weakTopicFlag?: string;
}

export interface StudyMetrics {
  totalInteractions: number;
  weakTopicsIdentified: string[];
}

export interface StudySession {
  studentName: string;
  timestamp: string;
  subject: string;
  chapter: string;
  metrics: StudyMetrics;
  rawHistory: StudyInteraction[];
}

export interface RoastResponse {
  roast: string;
  weakTopics: string[];
  mnemonics: Array<{
    concept: string;
    hack: string;
  }>;
  brotherVerdict: string;
}
