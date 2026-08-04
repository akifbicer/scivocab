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

import { motion } from 'framer-motion';
import { Brain, CheckCircle2, Layers, Sparkles } from 'lucide-react';
import type { StabilityMatrixData } from '@/types/analytics';

export interface StabilityMatrixWidgetProps {
  data:       StabilityMatrixData;
  className?: string;
}

export function StabilityMatrixWidget({ data, className = '' }: StabilityMatrixWidgetProps) {
  const { learningCount, learningPercentage, reviewCount, reviewPercentage, masteredCount, masteredPercentage, totalCount } = data;

  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              FSRS-6 Stability Matrix (Kademeli Kararlılık Matrisi)
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
            Hafıza Kararlılık Dağılımı ({totalCount.toLocaleString()} Kelime)
          </h3>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-blue-800 bg-blue-950/80 px-2.5 py-0.5 text-xs font-bold text-blue-300">
          <Sparkles size={12} />
          <span>FSRS-6 Stabilitesi</span>
        </span>
      </div>

      {/* Multi-segment Progress Bar */}
      <div className="mb-5">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-800 shadow-inner">
          <motion.div
            style={{ width: `${learningPercentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${learningPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-amber-500"
            title={`Öğrenim: ${learningCount} kelime (%${learningPercentage})`}
          />
          <motion.div
            style={{ width: `${reviewPercentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${reviewPercentage}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="h-full bg-blue-500"
            title={`Tekrar: ${reviewCount} kelime (%${reviewPercentage})`}
          />
          <motion.div
            style={{ width: `${masteredPercentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${masteredPercentage}%` }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className="h-full bg-emerald-500"
            title={`Mastered: ${masteredCount} kelime (%${masteredPercentage})`}
          />
        </div>
      </div>

      {/* 3 Metric Bucket Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Learning Bucket */}
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              1. Öğrenim Fazı
            </span>
            <span className="rounded bg-amber-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300 border border-amber-800">
              S &lt; 1 Gün
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-200 tracking-tight">
            {learningCount.toLocaleString()} <span className="text-xs font-normal text-amber-400/80">(%{learningPercentage})</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Kısa vadeli hafıza tekrarı bekleyen kelimeler.
          </p>
        </div>

        {/* Review Bucket */}
        <div className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              2. Tekrar Fazı
            </span>
            <span className="rounded bg-blue-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-300 border border-blue-800">
              1 ≤ S &lt; 365
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-200 tracking-tight">
            {reviewCount.toLocaleString()} <span className="text-xs font-normal text-blue-400/80">(%{reviewPercentage})</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Stabil aralıklı tekrar döngüsündeki kelimeler.
          </p>
        </div>

        {/* Mastered Bucket */}
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              3. Mastered Fazı
            </span>
            <span className="rounded bg-emerald-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300 border border-emerald-800">
              S ≥ 365 Gün
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-200 tracking-tight">
            {masteredCount.toLocaleString()} <span className="text-xs font-normal text-emerald-400/80">(%{masteredPercentage})</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Kalıcı akademik hafızaya aktarılmış kelimeler.
          </p>
        </div>
      </div>
    </div>
  );
}
