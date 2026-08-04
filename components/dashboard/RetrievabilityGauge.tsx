/**
 * components/dashboard/RetrievabilityGauge.tsx
 * ──────────────────────────────────────────────
 * Smart Retrievability Gauge ($R_{avg}$) Widget Component
 *
 * Renders a circular gauge showing the user's instantaneous memory retrievability ($R_{avg}$),
 * active deck size (1 <= S < 365), and memory decay status:
 *   - R_avg >= 90%: Green (Mükemmel Hafıza Korunumu)
 *   - 80% <= R_avg < 90%: Yellow (Orta Seviye Hafıza Aşınması)
 *   - R_avg < 80%: Red (Kritik Hafıza Kaybı Riski)
 */

'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import type { RetrievabilityCalculation } from '@/lib/retrievability';

export interface RetrievabilityGaugeProps {
  data:      RetrievabilityCalculation;
  dueCount:  number;
  className?: string;
}

export function RetrievabilityGauge({ data, dueCount, className = '' }: RetrievabilityGaugeProps) {
  const { averageRetrievability, statusTitle, statusDescription, colorTheme, activeCardsCount, decayedCardsCount } = data;

  // SVG Circular Gauge Calculations
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (averageRetrievability / 100) * circumference;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${colorTheme.border} ${colorTheme.bg} p-5 shadow-xl transition-all duration-300 ${className}`}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Brain size={16} className={colorTheme.text} />
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Anlık Hafıza Tutulumu (R-Avg)
          </span>
        </div>

        {/* Status Badge */}
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${colorTheme.badgeBg} ${colorTheme.badgeText}`}>
          <Sparkles size={12} />
          <span>%{averageRetrievability} · {data.status}</span>
        </span>
      </div>

      {/* Main Content: Gauge + Stats */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* SVG Circular Gauge Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="h-32 w-32 -rotate-90 transform">
            {/* Background track */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              className="text-zinc-800/80"
              fill="transparent"
            />
            {/* Animated Retrievability Ring */}
            <motion.circle
              cx="64"
              cy="64"
              r={radius}
              stroke={colorTheme.gradientFrom}
              strokeWidth="10"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center text inside ring */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-2xl font-extrabold tracking-tight tabular-nums ${colorTheme.text}`}>
              %{averageRetrievability}
            </span>
            <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
              R-AVG
            </span>
          </div>
        </div>

        {/* Status Text & Metrics */}
        <div className="flex-1">
          <h4 className={`text-lg font-bold tracking-tight mb-1 ${colorTheme.text}`}>
            {statusTitle}
          </h4>
          <p className="text-xs text-zinc-300 leading-relaxed mb-4">
            {statusDescription}
          </p>

          {/* Metric Pills */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-2.5">
              <div className="flex items-center gap-1 text-zinc-500 mb-0.5">
                <Layers size={12} className="text-blue-400" />
                <span className="text-[11px] font-medium">Aktif Kelimeler</span>
              </div>
              <p className="text-sm font-bold text-white">
                {activeCardsCount} <span className="text-[10px] font-normal text-zinc-500">(1 ≤ S &lt; 365)</span>
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-2.5">
              <div className="flex items-center gap-1 text-zinc-500 mb-0.5">
                <AlertTriangle size={12} className="text-amber-400" />
                <span className="text-[11px] font-medium">Aşınmış Kartlar</span>
              </div>
              <p className="text-sm font-bold text-amber-300">
                {decayedCardsCount} <span className="text-[10px] font-normal text-zinc-500">($R_i$ &lt; %80)</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
