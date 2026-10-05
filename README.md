# AirNEET (Offline Socratic RAG)

> **Hacktoberfest 2026 • Challenge 1: Build for a Friend**  
> **Mentee:** Sifat (NEET Medical Aspirant)  
> **Core AI:** Local Ollama (`llama3.2` + `nomic-embed-text`)  
> **Stack:** Next.js 14/15 (App Router), Tailwind CSS, TypeScript, Express (Render-ready)

---

## Executive Summary & Problem Definition

Preparing for the **Indian National Eligibility cum Entrance Test (NEET)** requires memorizing thousands of NCERT lines across Physics, Chemistry, and Biology. However, modern studying faces three critical friction points:

1. **The Distraction Loop:** Studying online invites social media notifications, messaging apps, and video rabbit holes. Turning Wi-Fi off eliminates distractions but breaks standard web learning tools.
2. **The Spoon-Feeding Trap:** Standard conversational LLMs output full answers directly. When a student doesn't have to retrieve the information from memory, active recall drops drastically.
3. **Hallucination Risk:** Generative AI often hallucinates facts, which is fatal in NEET's strict negative-marking scheme (-1 mark per incorrect answer).

### The Solution:

**AirNEET** is a 100% offline desktop web app designed for **Airplane Mode**. It combines:

- **Local RAG Pipeline:** Embedding and retrieval powered by local `nomic-embed-text` strictly bounded to NCERT textbooks.
- **Strict Socratic Tutoring:** Never spoon-feeds answers; provides ONE conceptual clue and ONE diagnostic test question.
- **Offline Filesystem Persistence:** Automatically logs session metrics and weak concepts to `./data/study_log.json`.
- **"Roast My Mistakes":** Affectionate sibling mentor persona analyzes mistakes with playful banter and high-yield mnemonics.
- **One-Click Cloud Sync:** When Wi-Fi is restored, study summaries sync to an Express review dashboard deployed on **Render** for sibling mentoring.

---

## Architecture & Data Flow

```
[ AIRPLANE MODE - LOCAL MACHINE ]
┌─────────────────────────────────────────────────────────────┐
│ Next.js App Router UI (localhost:3000)                      │
│ - Socratic Chat Stream       - NCERT Source Accordion       │
│ - Save Session Offline       - "Roast My Mistakes" Modal    │
└──────────────────────┬────────────────────────────────▲─────┘
                       │ POST /api/chat                 │
┌──────────────────────▼────────────────────────────────┴─────┐
│ Next.js Server Route (Local Node.js)                         │
│ 1. Vector Search: Top-3 closest NCERT chunks (k=3)          │
│ 2. System Instruction: Socratic rules + NCERT excerpts      │
│ 3. Stream Generation: Tokens piped from local Ollama daemon │
└──────────────┬────────────────────────────────▲─────────────┘
               │                                │
 ┌─────────────▼───┐                    ┌───────┴────────┐
 │  Local Vectors  │                    │  Local Ollama  │
 │  Memory / Disk  │                    │ localhost:11434│
 │ (nomic-embed)   │                    │ - llama3.2     │
 └─────────────────┘                    └────────────────┘
               │
      Trigger: "Sync to Brother" (Wi-Fi Restored)
               │
[ ONLINE / CLOUD - RENDER ]
┌──────────────▼──────────────────────────────────────────────┐
│ Express + TypeScript Backend (Render Web Service)            │
│ - POST /api/sync  -> Stores session & flagged weak points   │
│ - GET /dashboard  -> Brother's visual progress review portal │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder Architecture

```text
neet-airplane-tutor/
├── client/                     # Next.js 14/15 App Router + Tailwind CSS + TypeScript
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # RAG query pipeline -> Streams response from local Ollama
│   │   │   ├── ingest/route.ts        # Ingests & vectorizes local NCERT PDFs offline
│   │   │   ├── save/route.ts          # Writes session to local ./data/study_log.json
│   │   │   ├── roast/route.ts         # Generates humorous mistake analysis in sibling persona
│   │   │   └── status/route.ts        # Checks Ollama daemon and vector store status
│   │   ├── page.tsx                   # Main distraction-free study layout
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ChatWindow.tsx             # Streaming chat container with Markdown/LaTeX support
│   │   ├── Sidebar.tsx                # Subject picker, offline checklist, RAG status, sync actions
│   │   ├── OfflineBadge.tsx           # Live status banner showing "Offline Mode / Wi-Fi Disabled"
│   │   ├── RagReferenceModal.tsx      # Shows retrieved NCERT excerpt snippets used for the hint
│   │   └── RoastModal.tsx             # Teasing older brother mistake roast modal
│   ├── lib/
│   │   ├── rag.ts                     # Local vector retrieval logic (MemoryVectorStore + OllamaEmbeddings)
│   │   ├── ncert_indexer.ts           # PDF parsing and chunking utility
│   │   └── types.ts                   # Unified TypeScript schemas
│   ├── scripts/
│   │   └── ingest.ts                  # CLI script for `npm run ingest`
│   ├── data/
│   │   ├── ncert_docs/                # NCERT textbook chapters (TXT, MD, PDF)
│   │   │   └── ch09_biomolecules.txt  # Class 11 Chapter 9 (Biomolecules - Active RAG Chapter)
│   │   ├── vector_store/              # Serialized local vector index
│   │   │   └── index.json             # 47 NCERT chunks embedded with nomic-embed-text
│   │   └── study_log.json             # Offline session storage
│   ├── package.json
│   └── tsconfig.json
└── server/                     # Express API in TypeScript (Render-ready)
    ├── src/
    │   └── index.ts                   # POST /api/sync & GET /dashboard
    ├── data/
    │   └── synced_sessions.json       # Persisted synced study sessions
    ├── package.json
    ├── tsconfig.json
    └── Procfile                       # web: node dist/index.js
```

---

## Quickstart Guide

### Step 1: Ensure Ollama is Running & Pull Local Models

Ollama runs locally on port `11434`. Pull the embedding model and LLM:

```bash
# Pull local embedding model (~274 MB)
ollama pull nomic-embed-text

# Pull local instruction model (~2.0 GB)
ollama pull llama3.2
```

> **Note:** Zero internet connection is required after models are pulled.

### Step 2: Install Dependencies

#### Client:

```bash
cd client
npm install --legacy-peer-deps
```

#### Server:

```bash
cd server
npm install
```

---

## NCERT Document Ingestion

To chunk and vectorize the active NCERT chapter (`ch09_biomolecules.txt`) using local `nomic-embed-text`:

```bash
cd client
npm run ingest
```

Expected output:

```text
====================================================
 AirNEET - NCERT Offline Document Ingestion
====================================================
[INGEST] Created 47 chunks from single active chapter: ch09_biomolecules.txt
[INGEST] Generating embeddings via 'nomic-embed-text'...
[INGEST] Embedded 10/47 chunks...
...
[INGEST] Successfully serialized vector store to client/data/vector_store/index.json
 Ingestion Complete!
 Processed Files: ch09_biomolecules.txt
 Total Chunks Indexed: 47
```

---

## Running Locally

### 1. Start the Express Review Server (Port 4000)

```bash
cd server
npm run dev
```

- **Review Dashboard:** [http://localhost:4000/dashboard](http://localhost:4000/dashboard)
- **Sync Endpoint:** `POST http://localhost:4000/api/sync`
- **Health Check:** [http://localhost:4000/health](http://localhost:4000/health)

### 2. Start the Next.js Offline Client (Port 3000)

```bash
cd client
npm run dev
```

- Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Airplane Mode Verification Checklist

Follow these steps to verify 100% offline functionality:

1. [x] **Disable Wi-Fi / Enable Airplane Mode** on your operating system.
2. [x] Open [http://localhost:3000](http://localhost:3000). Notice the status badge switches to:
       `Airplane Mode Safe: Offline RAG & Inference Active` and `Wi-Fi Disabled (Distraction-Free)`.
3. [x] In the chat, ask:
   > _"What is the structural difference between a nucleoside and a nucleotide?"_
4. [x] Verify the response:
   - Does **NOT** give the complete answer directly.
   - Supplies a concise conceptual clue focusing on the addition of the phosphate group to the nitrogenous base and pentose sugar.
   - Poses a diagnostic test question (e.g., asking which specific bond links the phosphate group to the sugar molecule).
   - Shows the expandable accordion: `Grounded in NCERT: Class 11 Biology - Chapter 9: Biomolecules`.
5. [x] Click **"Inspect Full NCERT Excerpts"**: Inspect the exact matched textbook chunks, similarity scores, and citations.
6. [x] Click **"Save Session (Offline)"**: Verify that `client/data/study_log.json` is generated locally.
7. [x] Click **"Roast My Mistakes"**: Receive a playful sibling roast and high-yield NEET mnemonics.
8. [x] **Re-enable Wi-Fi** and click **"Sync to Mentor (Online)"**:
   - The session is dispatched to `http://localhost:4000/api/sync`.
   - Open [http://localhost:4000/dashboard](http://localhost:4000/dashboard) to view Sifat's study session, Q&A logs, and flagged weak topics in the sibling review hub!

---

## Data Schema (`study_log.json`)

```json
{
  "studentName": "Sifat",
  "timestamp": "2026-10-05T08:30:00.000Z",
  "subject": "Biology - Class 11",
  "chapter": "Chapter 9: Biomolecules",
  "metrics": {
    "totalInteractions": 12,
    "weakTopicsIdentified": [
      "Phosphodiester bond linkage positions",
      "Competitive enzyme inhibition kinetics"
    ]
  },
  "rawHistory": [
    {
      "role": "user",
      "content": "What is the structural difference between a nucleoside and a nucleotide?"
    },
    {
      "role": "assistant",
      "content": "Think about the three core components of a nucleic acid building block: a nitrogenous base, a pentose sugar, and a phosphate group. Which one of these is missing in a nucleoside?",
      "source": "NCERT Class 11 Biology, Chapter 9: Biomolecules"
    }
  ]
}
```

---
