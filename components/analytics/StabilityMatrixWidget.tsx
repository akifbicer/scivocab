/**
 * components/analytics/StabilityMatrixWidget.tsx
 * ────────────────────────────────────────────────
 * Stability Matrix Visualization Widget Component
 *
 * Visualizes the 3 memory stability buckets:
 *  - Öğrenim  (S < 1 day, #F59E0B Amber)
 *  - Tekrar   (1 <= S < 365 days, #3B82F6 Blue)
 *  - Mastered (S >= 365 days, #10B981 Emerald)
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Layers } from 'lucide-react';
import type { StabilityMatrixData } from '@/types/analytics';

export interface StabilityMatrixWidgetProps {
  data:       StabilityMatrixData;
  dueCount?:  number;
  className?: string;
}

export function StabilityMatrixWidget({ data, dueCount, className = '' }: StabilityMatrixWidgetProps) {
  const {
    learningCount, learningPercentage,
    earlyReviewCount, earlyReviewPercentage,
    consolidationCount, consolidationPercentage,
    longTermCount, longTermPercentage,
    masteredCount, masteredPercentage,
    totalCount,
  } = data;

  const buckets = [
    { label: '1. Öğrenim',     sub: 'S < 1 Gün',      count: learningCount,     pct: learningPercentage,     color: 'text-amber-400',   bg: 'bg-amber-950/20',   border: 'border-amber-900/60',   badgeBg: 'bg-amber-950 text-amber-300 border-amber-800', barBg: 'bg-amber-500' },
    { label: '2. Erken Tekrar', sub: '1 ≤ S < 7',     count: earlyReviewCount,  pct: earlyReviewPercentage,  color: 'text-sky-400',     bg: 'bg-sky-950/20',     border: 'border-sky-900/60',     badgeBg: 'bg-sky-950 text-sky-300 border-sky-800',     barBg: 'bg-sky-500' },
    { label: '3. Pekiştirme',   sub: '7 ≤ S < 30',    count: consolidationCount,pct: consolidationPercentage,color: 'text-blue-400',    bg: 'bg-blue-950/20',    border: 'border-blue-900/60',    badgeBg: 'bg-blue-950 text-blue-300 border-blue-800',   barBg: 'bg-blue-500' },
    { label: '4. Uzun Vadeli',  sub: '30 ≤ S < 365',  count: longTermCount,     pct: longTermPercentage,     color: 'text-blue-300',    bg: 'bg-blue-950/30',    border: 'border-blue-800/60',    badgeBg: 'bg-blue-950 text-blue-200 border-blue-700',   barBg: 'bg-blue-400' },
    { label: '5. Master',       sub: 'S ≥ 365 Gün',   count: masteredCount,     pct: masteredPercentage,     color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-900/60', badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-800', barBg: 'bg-emerald-500' },
  ];

  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl ${className}`}>
      {/* Top Row: Title + Integrated Review CTA Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Kelime Takip <span className="text-xs font-normal text-zinc-500 ml-1.5">({totalCount.toLocaleString()} Kelime)</span>
          </h3>
        </div>

        {/* Integrated Review Button (Emojis removed) */}
        {dueCount !== undefined && (
          <div>
            {dueCount > 0 ? (
              <Link
                href="/practice?mode=global"
                className="
                  flex items-center justify-center gap-2 rounded-xl border border-blue-500
                  bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-blue-950/40
                  hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all duration-200 shrink-0
                "
              >
                <span>Tekrarı Başlat ({dueCount} Kart Zamanı Geldi)</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <button
                disabled
                className="
                  flex items-center justify-center gap-2 rounded-xl border border-zinc-800
                  bg-zinc-900/80 px-5 py-2.5 text-xs font-semibold text-zinc-500 cursor-not-allowed opacity-75 shrink-0
                "
              >
                <span>Tekrarı Başlat (0 Kart)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5-Segment Progress Bar */}
      <div className="mb-4">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-800 shadow-inner">
          {buckets.map((b) => (
            <motion.div
              key={b.label}
              style={{ width: `${b.pct}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${b.pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full ${b.barBg}`}
              title={`${b.label}: ${b.count} kelime (%${b.pct})`}
            />
          ))}
        </div>
      </div>

      {/* 5 Metric Bucket Cards (Ultra simple: Stage Name, Count, % Percentage) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {buckets.map((b) => (
          <div
            key={b.label}
            className={`rounded-xl border ${b.count > 0 ? `${b.border} ${b.bg}` : 'border-zinc-800/80 bg-zinc-950/40'} p-3 flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${b.color}`}>
                {b.label}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className={`text-lg font-extrabold ${b.color} tracking-tight tabular-nums`}>
                {b.count.toLocaleString()}
              </p>
              <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                %{b.pct}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
