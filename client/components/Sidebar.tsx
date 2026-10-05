'use client';

import React from 'react';
import {
  BookOpen,
  Save,
  Flame,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  currentSubject: string;
  onSubjectChange: (sub: string) => void;
  currentChapter: string;
  onChapterChange: (ch: string) => void;
  onSaveSession: () => void;
  onRoastMistakes: () => void;
  onSyncCloud: () => void;
  onReIngest: () => void;
  isSaving: boolean;
  isSyncing: boolean;
  isIngesting: boolean;
  syncSuccess: string | null;
  saveSuccess: string | null;
  totalChunks: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSubject,
  onSubjectChange,
  currentChapter,
  onChapterChange,
  onSaveSession,
  onRoastMistakes,
  onSyncCloud,
  onReIngest,
  isSaving,
  isSyncing,
  isIngesting,
  syncSuccess,
  saveSuccess,
  totalChunks,
}) => {
  const subjects = [
    { id: 'Biology (Class 11)', name: 'Biology (Class 11)', badge: 'RAG Indexed' },
    { id: 'Biology (Class 12)', name: 'Biology (Class 12)', badge: 'Syllabus' },
    { id: 'Chemistry', name: 'Chemistry', badge: 'High-Yield' },
    { id: 'Physics', name: 'Physics', badge: 'Formulas' },
  ];

  const chapters = [
    {
      id: 'Ch 9: Biomolecules',
      name: 'Ch 9: Biomolecules',
      badge: 'RAG Indexed',
      badgeType: 'active',
      ready: true,
      description: 'Active Local Vector Store',
    },
    {
      id: 'Ch 3: Plant Kingdom',
      name: 'Ch 3: Plant Kingdom',
      badge: 'Download on Demand',
      badgeType: 'demand',
      ready: false,
      description: 'Available when online',
    },
    {
      id: 'Ch 4: Animal Kingdom',
      name: 'Ch 4: Animal Kingdom',
      badge: 'Pending Ingestion',
      badgeType: 'pending',
      ready: false,
      description: 'Awaiting raw chapter text',
    },
    {
      id: 'Ch 8: Cell - The Unit of Life',
      name: 'Ch 8: Cell - The Unit of Life',
      badge: 'Pending Ingestion',
      badgeType: 'pending',
      ready: false,
      description: 'Archived offline chapter',
    },
  ];

  return (
    <aside className="w-80 flex-shrink-0 bg-slate-900/95 border-r border-slate-800 flex flex-col h-full select-none overflow-hidden">
      {/* Student Profile Card (Pinned at top) */}
      <div className="p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950/70 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/10">
            S
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white">Sifat</h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Aspirant
              </span>
            </div>
            <p className="text-xs text-slate-400">Target: NEET Medical 2027</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            Curriculum:
          </span>
          <span className="font-semibold text-slate-200">Strict NCERT Line-by-Line</span>
        </div>
      </div>

      {/* Main Scrollable Navigation Area with bottom padding */}
      <div className="p-5 pb-8 space-y-6 flex-1 overflow-y-auto">
        {/* Subject Picker */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Target Subject
          </label>
          <div className="space-y-1.5">
            {subjects.map((sub) => {
              const active = currentSubject === sub.id || (currentSubject.includes('Biology') && sub.id.includes('Biology (Class 11)'));
              return (
                <button
                  key={sub.id}
                  onClick={() => onSubjectChange(sub.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                    active
                      ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/20'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{sub.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      active
                        ? 'bg-emerald-700/60 text-emerald-100'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {sub.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* NCERT Chapter Scope Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              NCERT Chapter Scope
            </label>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">Single Chapter RAG</span>
          </div>
          <div className="space-y-2">
            {chapters.map((ch) => {
              const active = currentChapter === ch.id || currentChapter.includes('Biomolecules') && ch.id.includes('Biomolecules');

              let badgeClasses = 'bg-slate-900 text-slate-500 border border-slate-800';
              if (ch.badgeType === 'active') {
                badgeClasses = active
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold'
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-semibold';
              } else if (ch.badgeType === 'demand') {
                badgeClasses = 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/30';
              } else if (ch.badgeType === 'pending') {
                badgeClasses = 'bg-slate-900/90 text-slate-400 border border-slate-800';
              }

              return (
                <button
                  key={ch.id}
                  onClick={() => ch.ready && onChapterChange(ch.id)}
                  disabled={!ch.ready}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition text-left group ${
                    active
                      ? 'bg-slate-800/90 border-2 border-emerald-500/70 text-white font-semibold shadow-sm'
                      : ch.ready
                      ? 'bg-slate-950/40 hover:bg-slate-800/80 text-slate-300 border border-slate-800'
                      : 'bg-slate-950/20 text-slate-500 border border-slate-800/40 cursor-not-allowed opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-1">
                    {ch.ready ? (
                      <span className="relative flex h-2 w-2 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0"></span>
                    )}
                    <span className="truncate">{ch.name}</span>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono flex-shrink-0 ${badgeClasses}`}>
                    {ch.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Offline Readiness Checklist */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Offline Airplane Checklist
          </span>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Zero Network Reliance</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Local nomic-embed-text</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="font-mono text-emerald-300">{totalChunks} Chunks (Biomolecules)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Local study_log.json Cache</span>
            </div>
          </div>
        </div>

        {/* Action Buttons with Bottom Spacing */}
        <div className="space-y-2.5 pt-1 pb-6">
          {/* Save Session Offline */}
          <button
            onClick={onSaveSession}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition shadow-sm"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-pulse text-emerald-400' : 'text-slate-400'}`} />
            <span>{isSaving ? 'Writing to Disk...' : 'Save Session (Offline)'}</span>
          </button>
          {saveSuccess && (
            <p className="text-[11px] text-emerald-400 text-center animate-in fade-in">
              ✓ {saveSuccess}
            </p>
          )}

          {/* Roast My Mistakes */}
          <button
            onClick={onRoastMistakes}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium text-xs transition"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Roast My Mistakes 🔥</span>
          </button>

          {/* Sync to Brother */}
          <button
            onClick={onSyncCloud}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-500/10"
          >
            <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>{isSyncing ? 'Syncing to Cloud...' : 'Sync to Brother (Online)'}</span>
          </button>
          {syncSuccess && (
            <p className="text-[11px] text-emerald-300 text-center animate-in fade-in">
              ✓ {syncSuccess}
            </p>
          )}

          {/* Re-Ingest NCERT Docs */}
          <button
            onClick={onReIngest}
            disabled={isIngesting}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 pt-1 transition"
          >
            <RefreshCw className={`w-3 h-3 ${isIngesting ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isIngesting ? 'Re-indexing Biomolecules...' : 'Re-index Ch 9 Biomolecules'}</span>
          </button>
        </div>
      </div>

      {/* Review Hub Quick Link (Pinned at bottom) */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex-shrink-0">
        <a
          href="http://localhost:4000/dashboard"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between text-xs text-slate-400 hover:text-emerald-400 transition"
        >
          <span>Open Brother's Review Hub</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </aside>
  );
};
