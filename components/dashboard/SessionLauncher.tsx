/**
 * components/dashboard/SessionLauncher.tsx
 * ──────────────────────────────────────────
 * 4-Phase Daily Cognitive Routine Launcher CTA Widget Component
 *
 * Drives the daily 4-phase learning loop:
 *  - Phase 1 (Active Recall - 15 Mins): FSRS review queue (/practice)
 *  - Phase 2 (Contextual Input - 25 Mins): Passage analysis & reading (/practice?phase=input)
 *  - Phase 3 (Pushed Output - 15 Mins): AI Sentence/Paragraph Production (/practice?phase=output)
 *  - Phase 4 (AI Coaching - 5 Mins): Metacognitive self-evaluation & summary (/practice?phase=coaching)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Edit3,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

import { SessionPhase, type DailySessionState } from '@/types/session';

export interface SessionLauncherProps {
  dueCount:  number;
  className?: string;
}

export function SessionLauncher({ dueCount, className = '' }: SessionLauncherProps) {
  const router = useRouter();
  const [currentPhase, setCurrentPhase] = useState<SessionPhase>(
    dueCount > 0 ? SessionPhase.Phase1_ActiveRecall : SessionPhase.Phase2_ContextualInput,
  );

  const phaseDetails = [
    {
      phase: SessionPhase.Phase1_ActiveRecall,
      title: 'Faz 1: Active Recall & Küresel Tekrar (15 Dk)',
      shortName: 'Active Recall',
      description: 'Aralıklı tekrar (FSRS-6) algoritması ile tüm modüllerdeki zamanı gelmiş kelimeleri aktif olarak hatırla.',
      icon: Brain,
      href: '/practice?mode=global',
      buttonText: dueCount > 0
        ? `🚀 Bilişsel Tekrarı Başlat (${dueCount} Kart Zamanı Geldi)`
        : 'Şu an tekrar etmen gereken kart yok 🎉',
      colorTheme: 'border-blue-700/60 bg-blue-600 text-white hover:bg-blue-500',
      disabled: dueCount === 0,
    },
    {
      phase: SessionPhase.Phase2_ContextualInput,
      title: 'Faz 2: Contextual Input (25 Dk)',
      shortName: 'Contextual Input',
      description: 'Kelimeleri zengin akademik metinler ve bağlamsal cümleler içerisinde incele.',
      icon: BookOpen,
      href: '/practice?module=1',
      buttonText: 'Faz 2: Bağlamsal Okumayı Başlat (25 Dk)',
      colorTheme: 'border-amber-700/60 bg-amber-600 text-white hover:bg-amber-500',
      disabled: false,
    },
    {
      phase: SessionPhase.Phase3_PushedOutput,
      title: 'Faz 3: Pushed Output (15 Dk)',
      shortName: 'Pushed Output',
      description: 'AI Geri Bildirim motoru ile kendi özgün akademik cümlelerini üret.',
      icon: Edit3,
      href: '/practice',
      buttonText: 'Faz 3: Cümle Üretimini Başlat (15 Dk)',
      colorTheme: 'border-blue-700/60 bg-blue-600 text-white hover:bg-blue-500',
      disabled: false,
    },
    {
      phase: SessionPhase.Phase4_MetacognitiveCoaching,
      title: 'Faz 4: AI Metacognitive Coaching (5 Dk)',
      shortName: 'AI Coaching',
      description: 'Günlük seansını değerlendir, öz-değerlendirme yap ve AI raporunu incele.',
      icon: Sparkles,
      href: '/practice',
      buttonText: 'Faz 4: AI Coaching & Özet Rapor (5 Dk)',
      colorTheme: 'border-emerald-700/60 bg-emerald-600 text-white hover:bg-emerald-500',
      disabled: false,
    },
  ];

  const activePhaseDetail = phaseDetails.find((p) => p.phase === currentPhase) ?? phaseDetails[0];

  const completedPhasesCount = currentPhase === SessionPhase.Completed ? 4 : (currentPhase as number) - 1;
  const progressPercent = Math.min(100, Math.round((completedPhasesCount / 4) * 100));

  const handleLaunchPhase = () => {
    router.push(activePhaseDetail.href);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-blue-900/60 bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950/30 p-6 shadow-2xl shadow-blue-950/20 ${className}`}>
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-600/10 blur-3xl" />

      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-blue-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              4 Fazlı Bilişsel Günlük Rutin Başlatıcı
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
            Bugünün Bilişsel Öğrenme Seansı
          </h3>
        </div>

        {/* Phase Progress Badge */}
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-1.5 text-xs font-bold text-zinc-300">
          <Target size={14} className="text-blue-400" />
          <span>{completedPhasesCount}/4 Faz Tamamlandı (%{progressPercent})</span>
        </div>
      </div>

      {/* 4 Phase Stepper Indicator */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {phaseDetails.map((p, idx) => {
          const isDone = (currentPhase as number) > (p.phase as number);
          const isActive = currentPhase === p.phase;

          return (
            <div
              key={p.phase}
              onClick={() => setCurrentPhase(p.phase)}
              className={`
                flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer select-none
                ${isActive
                  ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-1 ring-blue-500/50 shadow-md'
                  : isDone
                    ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-950/50 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'}
              `}
            >
              <div className="flex items-center gap-1 text-[11px] font-bold">
                {isDone ? (
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                ) : (
                  <span className="font-mono">{idx + 1}</span>
                )}
                <span className="truncate hidden sm:inline">{p.shortName}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Phase Main CTA Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-xl border border-blue-900/40 bg-zinc-950/80 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-800/60 bg-blue-950/60 text-blue-400 shadow-md shrink-0">
            <activePhaseDetail.icon size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Aktif Seans Adımı
            </span>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {activePhaseDetail.title}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
              {activePhaseDetail.description}
            </p>
          </div>
        </div>

        {/* Dynamic Launch Button */}
        <button
          type="button"
          onClick={handleLaunchPhase}
          className={`
            flex items-center justify-center gap-2 rounded-xl border px-6 py-3.5
            text-sm font-bold shadow-lg transition-all duration-200 group shrink-0
            ${activePhaseDetail.colorTheme}
          `}
        >
          <Play size={16} className="fill-current" />
          <span>{activePhaseDetail.buttonText}</span>
          <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
