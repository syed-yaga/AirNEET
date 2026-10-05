import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'synced_sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure sessions file exists
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

export interface StudyInteraction {
  role: 'user' | 'assistant' | 'system';
  content: string;
  source?: string;
  timestamp?: string;
}

export interface StudySessionPayload {
  studentName?: string;
  timestamp?: string;
  subject?: string;
  chapter?: string;
  metrics?: {
    totalInteractions?: number;
    weakTopicsIdentified?: string[];
  };
  weakTopics?: string[];
  rawHistory?: StudyInteraction[];
  notes?: string;
}

function loadSessions(): StudySessionPayload[] {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading synced sessions:', error);
    return [];
  }
}

function saveSessions(sessions: StudySessionPayload[]): void {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sync endpoint - Receives session from client
app.post('/api/sync', (req: Request, res: Response) => {
  try {
    const payload: StudySessionPayload = req.body;

    if (!payload || !payload.studentName) {
      return res.status(400).json({
        error: 'Invalid study log payload: studentName is required.',
      });
    }

    const sessions = loadSessions();

    const normalizedSession: StudySessionPayload = {
      studentName: payload.studentName || 'Sifat',
      timestamp: payload.timestamp || new Date().toISOString(),
      subject: payload.subject || 'Biology (Class 11)',
      chapter: payload.chapter || 'Ch 9: Biomolecules',
      metrics: {
        totalInteractions:
          payload.metrics?.totalInteractions ??
          (payload.rawHistory ? payload.rawHistory.length : 0),
        weakTopicsIdentified:
          payload.metrics?.weakTopicsIdentified ?? payload.weakTopics ?? [],
      },
      rawHistory: payload.rawHistory || [],
      notes: payload.notes || '',
    };

    // Prepend latest session
    sessions.unshift(normalizedSession);
    saveSessions(sessions);

    console.log(
      `[SYNC SUCCESS] Received session for ${normalizedSession.studentName} (${normalizedSession.subject} - ${normalizedSession.chapter}) at ${normalizedSession.timestamp}`
    );

    return res.status(200).json({
      success: true,
      message: "Session successfully synced to brother's dashboard.",
      syncedSession: normalizedSession,
      totalSynced: sessions.length,
    });
  } catch (error) {
    console.error('Error syncing study session:', error);
    return res.status(500).json({
      error: 'Failed to sync session payload.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/sessions - JSON list of synced sessions
app.get('/api/sessions', (_req: Request, res: Response) => {
  const sessions = loadSessions();
  res.json({ count: sessions.length, sessions });
});

// GET /dashboard - Render brother's review hub HTML page
app.get('/dashboard', (_req: Request, res: Response) => {
  const sessions = loadSessions();

  // Aggregate stats
  const totalSessions = sessions.length;
  let totalInteractions = 0;
  const weakTopicsMap: Record<string, number> = {};

  sessions.forEach((s) => {
    totalInteractions +=
      s.metrics?.totalInteractions || (s.rawHistory ? s.rawHistory.length : 0);
    const weakList =
      s.metrics?.weakTopicsIdentified || s.weakTopics || [];
    weakList.forEach((t) => {
      const topic = t.trim();
      if (topic) {
        weakTopicsMap[topic] = (weakTopicsMap[topic] || 0) + 1;
      }
    });
  });

  const sortedWeakTopics = Object.entries(weakTopicsMap).sort(
    (a, b) => b[1] - a[1]
  );

  const studentName = sessions[0]?.studentName || 'Sifat';
  const lastActive = sessions[0]?.timestamp
    ? new Date(sessions[0].timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
      })
    : 'No sessions yet';

  const html = `<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-950 text-slate-100">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AirNEET — Sibling Review Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#ecfdf5',
              100: '#d1fae5',
              400: '#34d399',
              500: '#10b981',
              600: '#059669',
            }
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">

  <!-- Top Navigation Bar -->
  <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-xl">
          ✈
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold text-white tracking-tight">AirNEET</h1>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Sibling Review Dashboard
            </span>
          </div>
          <p class="text-xs text-slate-400">Monitoring Sifat's Offline Socratic Study Sessions</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Render Cloud Live
        </span>
        <button onclick="window.location.reload()" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition">
          Refresh Logs
        </button>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    <!-- Hero Banner with Sister Context -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
            🎯 Hacktoberfest 2026 • Challenge 1: Build for a Friend
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sifat's NEET Study Tracker
          </h2>
          <p class="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
            Sifat is revising in 100% Airplane Mode with local NCERT RAG to avoid phone notifications. When she re-connects to Wi-Fi, her offline study logs sync here so you can spot concept gaps before test day.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-4 items-start md:items-end">
          <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-right sm:text-left min-w-[180px]">
            <span class="text-xs text-slate-400 font-medium block">Latest Sync Timestamp</span>
            <span class="text-sm font-semibold text-emerald-400 mt-1 block">${lastActive}</span>
          </div>
        </div>
      </div>
      <div class="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold uppercase tracking-wider">Synced Sessions</span>
          <span class="text-emerald-400 text-lg">📚</span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-white">${totalSessions}</span>
          <span class="text-xs text-slate-400">batches uploaded</span>
        </div>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold uppercase tracking-wider">Q&A Interactions</span>
          <span class="text-teal-400 text-lg">💡</span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-white">${totalInteractions}</span>
          <span class="text-xs text-slate-400">Socratic turns</span>
        </div>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold uppercase tracking-wider">Flagged Weak Concepts</span>
          <span class="text-amber-400 text-lg">⚠️</span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-amber-400">${sortedWeakTopics.length}</span>
          <span class="text-xs text-slate-400">topics need review</span>
        </div>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold uppercase tracking-wider">Distraction Shield</span>
          <span class="text-indigo-400 text-lg">🛡️</span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-emerald-400">100%</span>
          <span class="text-xs text-slate-400">Airplane Mode safe</span>
        </div>
      </div>
    </div>

    <!-- Weak Points & Review Priority Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <span class="text-amber-400">🔥</span> Weak Concepts Checklist
            </h3>
            <span class="text-xs text-slate-400">Sibling Mentoring List</span>
          </div>
          <p class="text-xs text-slate-400 mb-4 leading-relaxed">
            Concepts where Sifat struggled or required multi-turn hints during offline revision. Use these during dinner discussions or mock quizzes!
          </p>

          ${
            sortedWeakTopics.length === 0
              ? `<div class="text-center py-8 text-slate-500 text-sm italic border border-dashed border-slate-800 rounded-xl">
                  No flagged weaknesses yet! Sifat is acing her NCERT concepts.
                </div>`
              : `<ul class="space-y-2.5">
                  ${sortedWeakTopics
                    .map(
                      ([topic, count]) => `
                    <li class="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
                        <span class="font-medium text-slate-200 truncate">${topic}</span>
                      </div>
                      <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        ${count} ${count === 1 ? 'flag' : 'flags'}
                      </span>
                    </li>
                  `
                    )
                    .join('')}
                </ul>`
          }
        </div>

        <div class="mt-6 pt-5 border-t border-slate-800">
          <div class="rounded-xl bg-emerald-950/30 border border-emerald-500/20 p-3.5 text-xs text-emerald-300">
            <span class="font-bold block mb-1">💡 Brother's Tip:</span>
            Ask her the <em>fluid mosaic model</em> lipid-protein ratio or the <em>hydrolytic enzymes in lysosomes</em> without looking at notes!
          </div>
        </div>
      </div>

      <!-- Chronological Synced Sessions Feed -->
      <div class="lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <span class="text-emerald-400">📜</span> Synced Study Logs
          </h3>
          <span class="text-xs text-slate-400">${sessions.length} sessions recorded</span>
        </div>

        ${
          sessions.length === 0
            ? `<div class="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8">
                <div class="text-4xl mb-3">📭</div>
                <h4 class="text-base font-semibold text-slate-300">No study logs uploaded yet</h4>
                <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When Sifat finishes studying in Airplane Mode and clicks "Sync to Mentor", her session notes and Q&A history will appear here.
                </p>
              </div>`
            : sessions
                .map((session, sIdx) => {
                  const dateStr = session.timestamp
                    ? new Date(session.timestamp).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Unknown Date';
                  const interactions = session.rawHistory || [];
                  const weakItems =
                    session.metrics?.weakTopicsIdentified ||
                    session.weakTopics ||
                    [];

                  return `
            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 transition hover:border-slate-700 shadow-lg">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ${session.subject || 'Biology'}
                    </span>
                    <h4 class="text-base font-bold text-white">${session.chapter || 'NCERT Chapter'}</h4>
                  </div>
                  <p class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <span>🗓️ ${dateStr}</span>
                    <span>•</span>
                    <span>${interactions.length} Interactions</span>
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-400 font-medium">Mentee: <strong class="text-slate-200">${session.studentName}</strong></span>
                </div>
              </div>

              <!-- Weak points in this session -->
              ${
                weakItems.length > 0
                  ? `<div class="mt-4 flex flex-wrap items-center gap-1.5">
                      <span class="text-[11px] font-semibold text-amber-400">Struggled with:</span>
                      ${weakItems
                        .map(
                          (w) => `
                        <span class="px-2 py-0.5 rounded-md text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-300">
                          ${w}
                        </span>
                      `
                        )
                        .join('')}
                    </div>`
                  : ''
              }

              <!-- Transcript preview accordion -->
              <details class="mt-4 group">
                <summary class="cursor-pointer text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 select-none">
                  <span>View Full Socratic Q&A Transcript (${interactions.length} messages)</span>
                  <span class="transition-transform group-open:rotate-180">▾</span>
                </summary>
                <div class="mt-4 space-y-3 pt-3 border-t border-slate-800/60">
                  ${interactions
                    .map((msg, mIdx) => {
                      const isUser = msg.role === 'user';
                      return `
                    <div class="flex gap-3 text-xs ${isUser ? 'bg-slate-950/80' : 'bg-slate-800/40 border border-slate-700/50'} p-3.5 rounded-xl">
                      <div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                        isUser
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }">
                        ${isUser ? 'S' : 'AI'}
                      </div>
                      <div class="flex-1 space-y-1">
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-slate-300">${isUser ? (session.studentName || 'Sifat') : 'AirNEET Socratic Tutor'}</span>
                          ${
                            msg.source
                              ? `<span class="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">📖 ${msg.source}</span>`
                              : ''
                          }
                        </div>
                        <p class="text-slate-300 leading-relaxed whitespace-pre-wrap">${escapeHtml(msg.content)}</p>
                      </div>
                    </div>
                  `;
                    })
                    .join('')}
                </div>
              </details>
            </div>
          `;
                })
                .join('')
        }
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
    <p>AirNEET • Built with Next.js, Express, TypeScript & Local Ollama (nomic-embed-text + llama3.2)</p>
    <p class="mt-1">Dedicated to Sifat's NEET preparation • 100% Offline-Safe Socratic RAG</p>
  </footer>

</body>
</html>`;

  res.send(html);
});

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`✈️  AirNEET - Sibling Review Server`);
  console.log(`📡  Listening on port ${PORT}`);
  console.log(`🌐  Review Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📥  Sync Endpoint:    http://localhost:${PORT}/api/sync`);
  console.log(`🩺  Health Check:      http://localhost:${PORT}/health`);
  console.log(`====================================================`);
});
