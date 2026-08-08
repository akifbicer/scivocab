/**
 * components/consolidation/ConsolidationTransitionModal.tsx
 * ──────────────────────────────────────────────────────────
 * Transition modal displayed immediately after completing flashcard practice.
 * Prompting user to start module consolidation or skip to dashboard.
 */

'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, X, Brain } from 'lucide-react';

interface ConsolidationTransitionModalProps {
  onContinue: () => void;
  onSkip: () => void;
}

export function ConsolidationTransitionModal({ onContinue, onSkip }: ConsolidationTransitionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="relative w-full max-w-md rounded-2xl border border-blue-900/60 bg-zinc-900 p-6 sm:p-8 shadow-2xl text-center overflow-hidden"
      >
        {/* Top Right Transparent Skip X Button */}
        <button
          type="button"
          onClick={onSkip}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all cursor-pointer"
          title="Şimdi Atla"
        >
          <X size={18} />
        </button>

        {/* Hero Icon */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-800/60 bg-blue-950/80 text-blue-400 shadow-xl">
          <Brain size={36} className="animate-pulse" />
          <div className="absolute -right-1 -top-1 rounded-full bg-yellow-500 p-1 text-black">
            <Sparkles size={12} />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">
          Tebrikler! Kelimeleri kodladın.
        </h2>
        <p className="text-base font-bold text-blue-300 mb-3">
          Şimdi pekiştirme zamanı! 🚀
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed mb-8 max-w-xs mx-auto">
          Öğrendiğin akademik kelimeleri boşluk doldurma ve cümle çevirisi egzersizleri ile hafızanda kalıcı hale getir.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="
              flex items-center justify-center gap-2 rounded-xl border border-blue-500
              bg-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-blue-950/50
              hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer
            "
          >
            <span>Devam Et (Pekiştirmeyi Başlat)</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="
              rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-xs font-semibold text-zinc-400
              hover:border-zinc-700 hover:text-white transition-all cursor-pointer
            "
          >
            Şimdi Atla
          </button>
        </div>
      </motion.div>
    </div>
  );
}
