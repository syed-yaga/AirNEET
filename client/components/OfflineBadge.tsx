'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, WifiOff, Wifi, Cpu, CheckCircle2 } from 'lucide-react';

interface OfflineBadgeProps {
  ollamaRunning?: boolean;
  totalChunks?: number;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({
  ollamaRunning = true,
  totalChunks = 63,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(typeof window !== 'undefined' ? window.navigator.onLine : false);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Airplane Mode Safe • Zero Network Calls
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Primary Airplane Shield Badge */}
      <div
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-semibold transition-all shadow-sm ${
          !isOnline
            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
            : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
        }`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Airplane Mode Safe: Offline RAG &amp; Inference Active</span>
      </div>

      {/* Connectivity Indicator */}
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${
          !isOnline
            ? 'bg-slate-800 text-slate-300 border border-slate-700'
            : 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
        }`}
        title={!isOnline ? 'Wi-Fi is off: Zero distraction mode' : 'Wi-Fi detected. Airplane mode recommended for maximum focus.'}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3 h-3 text-slate-400" />
            <span>Wi-Fi Disabled (Distraction-Free)</span>
          </>
        ) : (
          <>
            <Wifi className="w-3 h-3 text-amber-400" />
            <span>Wi-Fi Enabled (Sync Ready)</span>
          </>
        )}
      </div>

      {/* Local Vector Index Indicator */}
      <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 text-slate-300 border border-slate-800 font-mono text-[11px]">
        <Cpu className="w-3 h-3 text-teal-400" />
        <span>{totalChunks} NCERT Chunks Local</span>
      </div>
    </div>
  );
};
