/**
 * components/consolidation/ConsolidationSummaryView.tsx
 * ───────────────────────────────────────────────────────
 * Final consolidation summary screen displaying Cloze score, Translation score,
 * combined consolidation performance, FSRS feedback loop updates, and return button.
 */

'use client';

import { motion } from 'framer-motion';
import { Trophy, CheckCircle2, ArrowRight, Brain, Sparkles } from 'lucide-react';

interface ConsolidationSummaryViewProps {
  moduleNumber: number;
  clozeScore: number;
  translationScore: number;
  failedWordsCount: number;
  onReturnToDashboard: () => void;
}

export function ConsolidationSummaryView({
  moduleNumber,
  clozeScore,
  translationScore,
  failedWordsCount,
  onReturnToDashboard,
}: ConsolidationSummaryViewProps) {
  const totalScore = Math.round((clozeScore + translationScore) / 2);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center text-zinc-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg rounded-2xl border border-blue-900/60 bg-zinc-900 p-6 sm:p-8 shadow-2xl"
      >
        {/* Trophy icon */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-yellow-800/60 bg-yellow-950/40 text-yellow-400 shadow-xl">
          <Trophy size={40} />
          <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1 text-black">
            <CheckCircle2 size={12} />
          </div>
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
          Modül {moduleNumber} Pekiştirme
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 mb-2">
          Pekiştirme Tamamlandı! 🚀
        </h1>
        <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-8 leading-relaxed">
          Kelimeler boşluk doldurma ve cümle çevirisi ile aktif akademik hafızana başarıyla işlendi.
        </p>

        {/* Scores Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">
              Cloze
            </span>
            <span className="text-xl font-extrabold text-amber-400 tabular-nums">
              %{clozeScore}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">
              Çeviri
            </span>
            <span className="text-xl font-extrabold text-sky-400 tabular-nums">
              %{translationScore}
            </span>
          </div>

          <div className="rounded-xl border border-blue-800/60 bg-blue-950/40 p-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 block mb-1">
              Toplam
            </span>
            <span className="text-xl font-extrabold text-blue-400 tabular-nums">
              %{totalScore}
            </span>
          </div>
        </div>

        {/* FSRS Feedback Loop Callout */}
        <div className="mb-8 rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3.5 text-xs text-emerald-300 flex items-center justify-center gap-2">
          <Brain size={16} className="text-emerald-400 shrink-0" />
          <span>
            FSRS-6 Zorluk ($D$) parametresi güncellendi {failedWordsCount > 0 ? `(${failedWordsCount} zorlanan kelime)` : '✓'}
          </span>
        </div>

        {/* Return to Dashboard Button */}
        <button
          type="button"
          onClick={onReturnToDashboard}
          className="
            w-full flex items-center justify-center gap-2.5 rounded-xl border border-blue-500
            bg-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-blue-950/50
            hover:bg-blue-500 transition-all cursor-pointer active:scale-95
          "
        >
          <span>Dashboard'a Dön</span>
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </div>
  );
}
