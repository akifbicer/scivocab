/**
 * components/analytics/LatencyTrackerWidget.tsx
 * ────────────────────────────────────────────────
 * Procedural Latency Analytics & Automation Index ($I_{proc}$) Widget Component
 *
 * Tracks user recall latency (ms) over time and measures the transition from
 * slow controlled retrieval (high cognitive load) to rapid automated recall ($I_{proc} \ge 0.50$).
 */

'use client';

import { motion } from 'framer-motion';
import { Clock, Gauge, TrendingDown, Zap } from 'lucide-react';
import type { LatencyAnalyticsData } from '@/types/analytics';

export interface LatencyTrackerWidgetProps {
  data:       LatencyAnalyticsData;
  className?: string;
}

export function LatencyTrackerWidget({ data, className = '' }: LatencyTrackerWidgetProps) {
  const { currentAvgLatencyMs, automationIndex, history, isAutomating } = data;

  const currentSec = (currentAvgLatencyMs / 1000).toFixed(1);
  const maxMs = Math.max(3000, ...history.map((h) => h.avgLatencyMs));

  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl ${className}`}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Gauge size={16} className="text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              I-PROC Metrics
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
            Yanıt Hızı & Otomasyon (I-PROC)
          </h3>
        </div>

        {/* Automation Badge */}
        {isAutomating ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-600 bg-amber-950/90 px-3 py-0.5 text-xs font-bold text-amber-300 shadow-md animate-pulse">
            <Zap size={13} className="text-amber-400 fill-current" />
            <span>Otomasyon Yükseliyor ⚡ (I-Proc: {automationIndex})</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-xs font-medium text-zinc-400">
            <Clock size={13} />
            <span>Kontrollü Çağırma (I-Proc: {automationIndex})</span>
          </span>
        )}
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              ORTALAMA YANIT SÜRESİ
            </span>
            <Clock size={14} className="text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white tracking-tight tabular-nums">
            {currentSec}s <span className="text-xs font-normal text-zinc-500">({currentAvgLatencyMs} ms)</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">
            Kart başına geçen süre
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3.5">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              OTOMASYON DÜZEYİ
            </span>
            <TrendingDown size={14} />
          </div>
          <p className="text-2xl font-extrabold text-amber-300 tracking-tight tabular-nums">
            {automationIndex} <span className="text-xs font-normal text-amber-400/70">(0.0 – 1.0)</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">
            Kalıcı hafızaya geçiş oranı
          </p>
        </div>
      </div>

      {/* Time-series Bar Graph (Last 7 Days) */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          SON 7 GÜNLÜK YANIT SÜRESİ (MS)
        </p>
        <div className="flex items-end justify-between gap-2 h-24 pt-4 px-2 rounded-xl border border-zinc-800 bg-zinc-950/60">
          {history.map((point) => {
            const heightPercent = Math.min(100, Math.max(15, Math.round((point.avgLatencyMs / maxMs) * 100)));
            const sec = (point.avgLatencyMs / 1000).toFixed(1);

            return (
              <div key={point.date} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] font-mono text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {sec}s
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`w-full max-w-[28px] rounded-t-md transition-colors ${point.avgLatencyMs <= 1200 ? 'bg-amber-400' : 'bg-zinc-700'}`}
                />
                <span className="text-[9px] font-mono text-zinc-600 truncate w-full text-center">
                  {point.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
