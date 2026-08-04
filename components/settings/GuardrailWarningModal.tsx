/**
 * components/settings/GuardrailWarningModal.tsx
 * ───────────────────────────────────────────────
 * Dynamic Overload Warning Modal (Guardrail Warning Modal)
 *
 * Triggered when a user selects a daily new word limit > 10.
 * Displays 30-day cognitive load projections, retention risks, research warning,
 * and requires mandatory user confirmation check before enabling "Yine de Yükselt".
 */

'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

import {
  simulateCognitiveLoad,
  type CognitiveLoadSimulation,
  type LimitOption,
} from '@/lib/guardrail';

export interface GuardrailWarningModalProps {
  isOpen:        boolean;
  targetLimit:   LimitOption;
  onConfirm:     (limit: LimitOption) => void;
  onCancel:      () => void;
  onFallback10:  () => void;
}

export function GuardrailWarningModal({
  isOpen,
  targetLimit,
  onConfirm,
  onCancel,
  onFallback10,
}: GuardrailWarningModalProps) {
  const [hasAcceptedRisk, setHasAcceptedRisk] = useState(false);

  if (!isOpen) return null;

  const sim: CognitiveLoadSimulation = simulateCognitiveLoad(targetLimit);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-rose-900/80 bg-zinc-950 p-6 shadow-2xl shadow-rose-950/30"
        >
          {/* Top warning ambient glow */}
          <div className="pointer-events-none absolute -top-16 inset-x-0 h-32 bg-rose-600/10 blur-3xl" />

          {/* Close X */}
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-800/80 bg-rose-950/60 shadow-lg shadow-rose-950/40">
              <ShieldAlert size={26} className="text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-md border border-rose-800 bg-rose-950/80 px-2 py-0.5 text-[10px] font-bold text-rose-300 uppercase tracking-widest">
                  Yüksek Aşırı Yük Riski
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white mt-0.5">
                ⚠️ Bilişsel Aşırı Yüklenme Uyarısı
              </h3>
            </div>
          </div>

          <p className="text-sm text-zinc-300 mb-5 leading-relaxed">
            Günde <span className="font-bold text-rose-300">{targetLimit} yeni kelime</span> seçtiniz. FSRS-6 matematiksel simülatörü 30 gün içerisindeki yükü şu şekilde öngörmektedir:
          </p>

          {/* 30-Day Simulation Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <Layers size={14} className="text-blue-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">30 Günlük Havuz</span>
              </div>
              <p className="text-xl font-bold text-white tracking-tight">
                {sim.pool30Days} <span className="text-xs font-normal text-zinc-500">kelime</span>
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <Brain size={14} className="text-amber-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">30. Gün Tekrar Yükü</span>
              </div>
              <p className="text-xl font-bold text-amber-300 tracking-tight">
                ~{sim.dailyReviewsDay30} <span className="text-xs font-normal text-zinc-500">kart/gün</span>
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <Clock size={14} className="text-violet-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Gerekli Günlük Zaman</span>
              </div>
              <p className="text-xl font-bold text-violet-300 tracking-tight">
                ~{sim.dailyMinutesDay30} <span className="text-xs font-normal text-zinc-500">dakika/gün</span>
              </p>
            </div>

            <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-3">
              <div className="flex items-center gap-1.5 text-rose-400 mb-1">
                <AlertTriangle size={14} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Sürdürülebilirlik</span>
              </div>
              <p className="text-xl font-bold text-rose-300 tracking-tight">
                %{sim.sustainabilityRate} <span className="text-xs font-normal text-rose-400/70">(Düşük)</span>
              </p>
            </div>
          </div>

          {/* Research Callout Box */}
          <div className="mb-5 rounded-xl border border-rose-900/50 bg-rose-950/40 p-4">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Araştırmalar, günde 10 kelimeden fazlasını hedeflemenin 3. ayda biriken tekrar kartları nedeniyle vazgeçme oranını <strong className="text-rose-300 font-bold">%90'a çıkardığını</strong> göstermektedir.
              </p>
            </div>
          </div>

          {/* Mandatory Checkbox */}
          <label className="flex items-start gap-3 mb-6 cursor-pointer select-none rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 hover:border-zinc-700 transition-colors">
            <input
              type="checkbox"
              checked={hasAcceptedRisk}
              onChange={(e) => setHasAcceptedRisk(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
            />
            <span className="text-xs text-zinc-300 leading-snug">
              Riskleri anlıyorum, günlük kart birikim yükünü kabul ediyorum
            </span>
          </label>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            {/* Primary Recommended Action: Fallback to 10 */}
            <button
              type="button"
              onClick={onFallback10}
              className="
                flex items-center justify-center gap-2 rounded-xl
                border border-emerald-600 bg-emerald-600 px-5 py-3
                text-sm font-semibold text-white
                hover:border-emerald-500 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40
                transition-all duration-150
              "
            >
              <CheckCircle2 size={16} />
              <span>Tavsiye Edilen Limite Dön (10 Kelime)</span>
            </button>

            {/* Force Upgrade Button (Disabled until checkbox is checked) */}
            <button
              type="button"
              disabled={!hasAcceptedRisk}
              onClick={() => {
                if (hasAcceptedRisk) onConfirm(targetLimit);
              }}
              className={`
                flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5
                text-xs font-semibold transition-all duration-150
                ${hasAcceptedRisk
                  ? 'border-rose-700 bg-rose-950/80 text-rose-300 hover:bg-rose-900 hover:text-white'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-50'}
              `}
            >
              <span>Yine de Yükselt ({targetLimit} Kelime/Gün)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
