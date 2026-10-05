'use client';

import React from 'react';
import { X, BookOpen, FileText, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';

export interface RetrievedSourceItem {
  id: string;
  chapter: string;
  page?: string;
  source: string;
  score: number;
  excerpt: string;
}

interface RagReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: RetrievedSourceItem[];
  topicTitle?: string;
}

export const RagReferenceModal: React.FC<RagReferenceModalProps> = ({
  isOpen,
  onClose,
  sources,
  topicTitle = 'NCERT Chapter 8 Excerpts',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Retrieved NCERT Grounding</h3>
              <p className="text-xs text-slate-400">
                Verifiable textbook excerpts used to generate Socratic hint
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Strict Socratic Verification Rule:</span>
              The tutor never accesses external web data or ungrounded generative tokens. Every hint is mathematically anchored to these {sources.length} local NCERT vector chunks.
            </div>
          </div>

          {sources.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm italic">
              No specific NCERT excerpts attached to this message.
            </div>
          ) : (
            sources.map((item, index) => (
              <div
                key={item.id || index}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      Chunk #{index + 1}
                    </span>
                    <span className="text-slate-300 font-semibold truncate max-w-[240px]">
                      {item.page || item.chapter}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Similarity:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {(item.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap pl-1 border-l-2 border-emerald-500/40">
                  {item.excerpt}
                </p>

                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    Source file: <span className="font-mono text-slate-400">{item.source}</span>
                  </span>
                  <span className="text-emerald-500/80 font-medium">NEET High-Yield Fact</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Source: NCERT Class 11 Biology, Chapter 8 (Offline Indexed)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
          >
            Back to Study
          </button>
        </div>
      </div>
    </div>
  );
};
