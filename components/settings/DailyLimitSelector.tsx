/**
 * components/settings/DailyLimitSelector.tsx
 * ─────────────────────────────────────────────
 * Daily Cognitive Limit Selector (Guardrail Selector) Component
 *
 * Provides a button radio group for selecting daily new word pace (5, 10, 15, 20, 30, 50).
 * Displays real-time 30-day cognitive load projections and triggers GuardrailWarningModal
 * when selecting limits > 10.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';
import {
  simulateCognitiveLoad,
  getStoredDailyLimit,
  saveStoredDailyLimit,
  LIMIT_OPTIONS,
  type LimitOption,
  type CognitiveLoadSimulation,
} from '@/lib/guardrail';
import { GuardrailWarningModal } from './GuardrailWarningModal';

export interface DailyLimitSelectorProps {
  onLimitChanged?: (newLimit: LimitOption) => void;
  className?:      string;
}

export function DailyLimitSelector({ onLimitChanged, className = '' }: DailyLimitSelectorProps) {
  const [selectedLimit, setSelectedLimit] = useState<LimitOption>(10);
  const [pendingLimit,  setPendingLimit]  = useState<LimitOption | null>(null);
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [isSaved,       setIsSaved]       = useState(false);

  // Initialize from storage or database on mount
  useEffect(() => {
    const initLimit = getStoredDailyLimit();
    setSelectedLimit(initLimit);

    async function loadUserSetting() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await (supabase as any)
          .from('user_settings')
          .select('daily_word_limit')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.daily_word_limit && LIMIT_OPTIONS.includes(data.daily_word_limit as LimitOption)) {
          const dbLimit = data.daily_word_limit as LimitOption;
          setSelectedLimit(dbLimit);
          saveStoredDailyLimit(dbLimit);
        }
      } catch {}
    }
    loadUserSetting();
  }, []);

  const handleSelectOption = (n: LimitOption) => {
    if (n > 10) {
      setPendingLimit(n);
      setIsModalOpen(true);
    } else {
      applyLimit(n);
    }
  };

  const applyLimit = async (n: LimitOption) => {
    setSelectedLimit(n);
    saveStoredDailyLimit(n);
    setIsModalOpen(false);
    setPendingLimit(null);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);

    onLimitChanged?.(n);

    // Persist to user_settings table if authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any)
          .from('user_settings')
          .upsert({
            user_id: user.id,
            daily_word_limit: n,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      }
    } catch {}
  };

  const currentSim: CognitiveLoadSimulation = simulateCognitiveLoad(selectedLimit);

  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl ${className}`}>
      {/* Title + Current Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Günlük Bilişsel Limit Ayarı (Guardrail)
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
            Hedef Yeni Kelime / Gün
          </h3>
        </div>

        {/* Selected Level Badge */}
        <div className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold ${currentSim.colorTheme.badgeBg} ${currentSim.colorTheme.badgeText}`}>
          <Sparkles size={13} />
          <span>{selectedLimit} Kelime/Gün · {currentSim.badgeText}</span>
        </div>
      </div>

      {/* Button Radio Group */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {LIMIT_OPTIONS.map((n) => {
          const isSelected = selectedLimit === n;
          const isOptimal = n === 10;
          const isHighRisk = n > 10;

          return (
            <button
              key={n}
              type="button"
              onClick={() => handleSelectOption(n)}
              className={`
                relative flex flex-col items-center justify-center rounded-xl border p-3.5
                transition-all duration-200 font-semibold cursor-pointer
                ${isSelected
                  ? isHighRisk
                    ? 'border-rose-600 bg-rose-950/40 text-rose-200 shadow-lg shadow-rose-950/30 scale-[1.02]'
                    : 'border-emerald-500 bg-emerald-950/40 text-emerald-200 shadow-lg shadow-emerald-950/30 scale-[1.02]'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-white hover:bg-zinc-800/50'}
              `}
            >
              {/* Optimal Badge */}
              {isOptimal && (
                <span className="absolute -top-2.5 inset-x-0 mx-auto w-max rounded-full border border-emerald-600 bg-emerald-950 px-2 py-0.2 text-[9px] font-bold text-emerald-300 tracking-tight shadow-sm">
                  ÖNERİLEN
                </span>
              )}

              <span className="text-xl font-bold tracking-tight">{n}</span>
              <span className="text-[10px] text-zinc-500 font-normal uppercase">kelime/gün</span>
            </button>
          );
        })}
      </div>

      {/* 30-Day Dynamic Simulator Output */}
      <div className={`rounded-xl border p-4 transition-all duration-300 ${currentSim.colorTheme.bg} ${currentSim.colorTheme.border}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${currentSim.colorTheme.text}`}>
              📊 Dinamik 30 Günlük Yük Öngörüsü
            </span>
          </div>
          <span className={`text-xs font-semibold ${currentSim.colorTheme.text}`}>
            Sürdürülebilirlik: %{currentSim.sustainabilityRate}
          </span>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-2.5">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium mb-0.5">
              <Layers size={13} className="text-blue-400" />
              <span>30 Günlük Toplam Havuz</span>
            </div>
            <p className="text-base font-bold text-white">
              {currentSim.pool30Days} <span className="text-xs font-normal text-zinc-500">kelime</span>
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-2.5">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium mb-0.5">
              <Brain size={13} className="text-amber-400" />
              <span>30. Gün Günlük Tekrar</span>
            </div>
            <p className="text-base font-bold text-amber-300">
              ~{currentSim.dailyReviewsDay30} <span className="text-xs font-normal text-zinc-500">kart/gün</span>
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-2.5">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium mb-0.5">
              <Clock size={13} className="text-blue-400" />
              <span>Gerekli Zaman</span>
            </div>
            <p className="text-base font-bold text-blue-300">
              ~{currentSim.dailyMinutesDay30} <span className="text-xs font-normal text-zinc-500">dk/gün</span>
            </p>
          </div>
        </div>

        {/* Risk profile description */}
        <div className="flex items-start gap-2 text-xs text-zinc-300">
          <Info size={14} className={`shrink-0 mt-0.5 ${currentSim.colorTheme.text}`} />
          <p>
            <strong className={currentSim.colorTheme.text}>{currentSim.riskTitle}:</strong>{' '}
            {currentSim.riskDescription}
          </p>
        </div>
      </div>

      {/* Success notification toast */}
      {isSaved && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/80 py-2 text-xs font-semibold text-emerald-300 animate-fadeIn">
          <CheckCircle2 size={14} />
          <span>Günlük limitiniz {selectedLimit} kelime olarak kaydedildi!</span>
        </div>
      )}

      {/* Overload Warning Modal */}
      {pendingLimit && (
        <GuardrailWarningModal
          isOpen={isModalOpen}
          targetLimit={pendingLimit}
          onConfirm={(limit) => applyLimit(limit)}
          onCancel={() => {
            setIsModalOpen(false);
            setPendingLimit(null);
          }}
          onFallback10={() => applyLimit(10)}
        />
      )}
    </div>
  );
}
