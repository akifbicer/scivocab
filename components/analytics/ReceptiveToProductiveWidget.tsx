/**
 * components/analytics/ReceptiveToProductiveWidget.tsx
 * ────────────────────────────────────────────────────────
 * Receptive to Productive Activation Ratio ($R_{act}$) Widget
 *
 * Measures the conversion rate of passive vocabulary (reading recognition)
 * into active vocabulary (spontaneous production in writing/speaking).
 * Target Benchmark: 60% Activation.
 */

'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Edit3,
  Sparkles,
  Target,
} from 'lucide-react';
import type { ReceptiveToProductiveMetric } from '@/types/analytics';

export interface ReceptiveToProductiveWidgetProps {
  data:       ReceptiveToProductiveMetric;
  className?: string;
}

export function ReceptiveToProductiveWidget({ data, className = '' }: ReceptiveToProductiveWidgetProps) {
  const { receptiveCount, productiveCount, activationRatio, targetRatio, statusMessage } = data;

  const isTargetMet = activationRatio >= targetRatio;

  // Gauge calculations
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (activationRatio / 100) * circumference;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl transition-all duration-300">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              R-ACT Metrics
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
            Dağarcık Dengesi (R-ACT)
          </h3>
        </div>

        {/* Target Benchmark Badge */}
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${isTargetMet ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700' : 'bg-blue-950/90 text-blue-300 border-blue-700'}`}>
          <Sparkles size={12} />
          <span>Hedef: %{targetRatio} · {isTargetMet ? 'Hedef Ulaşıldı ✓' : 'Hedefe İlerliyor'}</span>
        </span>
      </div>

      {/* Main Gauge + Breakdown */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-5">
        {/* Radial Progress Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="h-32 w-32 -rotate-90 transform">
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              className="text-zinc-800"
              fill="transparent"
            />
            <motion.circle
              cx="64"
              cy="64"
              r={radius}
              stroke={isTargetMet ? '#10b981' : '#3b82f6'}
              strokeWidth="10"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-2xl font-extrabold tracking-tight tabular-nums ${isTargetMet ? 'text-emerald-400' : 'text-blue-400'}`}>
              %{activationRatio}
            </span>
            <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
              R-ACT
            </span>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <BookOpen size={13} className="text-blue-400" />
                <span className="font-semibold uppercase text-[10px]">Pasif (Receptive)</span>
              </div>
              <p className="text-lg font-bold text-white">
                {receptiveCount.toLocaleString()} <span className="text-xs font-normal text-zinc-500">kelime</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Anladığın kelimeler</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <Edit3 size={13} className="text-sky-400" />
                <span className="font-semibold uppercase text-[10px]">Aktif (Productive)</span>
              </div>
              <p className="text-lg font-bold text-sky-300">
                {productiveCount.toLocaleString()} <span className="text-xs font-normal text-zinc-500">kelime</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Kullanabildiğin kelimeler</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metacognitive Callout Rule Box */}
      <div className={`rounded-xl border p-4 ${isTargetMet ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200' : 'border-amber-900/60 bg-amber-950/30 text-amber-200'}`}>
        <div className="flex items-start gap-3">
          {isTargetMet ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1">
              💡 Öneri
            </p>
            <p className="text-xs leading-relaxed opacity-90">
              Kelime tanıma oranınız yüksek. Cümle kurma pratikleriyle aktif dağarcığınızı artırın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
