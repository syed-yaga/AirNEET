'use client';

import React from 'react';
import { X, Flame, Lightbulb, AlertTriangle, Heart, RefreshCw } from 'lucide-react';
import { RoastResponse } from '@/lib/types';

interface RoastModalProps {
  isOpen: boolean;
  onClose: () => void;
  roastData: RoastResponse | null;
  isLoading: boolean;
  onRegenerate?: () => void;
}

export const RoastModal: React.FC<RoastModalProps> = ({
  isOpen,
  onClose,
  roastData,
  isLoading,
  onRegenerate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Brother's Mistake Roast</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Sibling Banter Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Playful tough love + high-yield NEET mnemonics to lock in retention
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
              <p className="text-sm text-slate-300 font-medium">
                Older brother is analyzing your session mistakes...
              </p>
              <p className="text-xs text-slate-500">
                (Pulling no punches on your lipid bilayer mix-ups)
              </p>
            </div>
          ) : roastData ? (
            <>
              {/* Sibling Roast Speech Bubble */}
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 border border-amber-500/30 text-amber-100 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">👦🏻</span>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Brother's Roast:
                  </span>
                </div>
                <p className="text-sm leading-relaxed italic text-amber-50/95 font-sans">
                  "{roastData.roast}"
                </p>
              </div>

              {/* Weak Points Flagged */}
              {roastData.weakTopics && roastData.weakTopics.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Concepts Where You Hesitated:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {roastData.weakTopics.map((topic, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                        <span className="truncate font-medium">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brother's High-Yield Mnemonics */}
              {roastData.mnemonics && roastData.mnemonics.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
                    Brother's Emergency Memory Hacks (High-Yield):
                  </h4>
                  <div className="space-y-2">
                    {roastData.mnemonics.map((item, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1"
                      >
                        <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <span>💡</span>
                          <span>{item.concept}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed font-sans pl-5">
                          {item.hack}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pep Talk / Verdict */}
              {roastData.brotherVerdict && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-2.5 text-slate-300">
                  <Heart className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200 block mb-0.5">Brother's Verdict:</span>
                    <p className="leading-relaxed">{roastData.brotherVerdict}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              No roast generated yet. Start studying and then click "Roast My Mistakes"!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Roast Again
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition border border-slate-700"
          >
            I'll Prove Him Wrong! 😤
          </button>
        </div>
      </div>
    </div>
  );
};
