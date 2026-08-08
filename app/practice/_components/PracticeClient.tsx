/**
 * app/practice/_components/PracticeClient.tsx
 * ─────────────────────────────────────────────
 * Interactive shell for the practice session.
 * Receives pre-fetched cards from the Server Component and drives the
 * entire session UX: progress tracking, card display, stats band, empty
 * state, and session-complete summary.
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

import { WordCard } from '@/components/flashcard/WordCard';
import {
  usePracticeSession,
  type SessionCard,
  type SessionSummary,
} from '@/hooks/usePracticeSession';
import type { SubmitReviewData } from '@/app/actions/review';
import { ConsolidationTransitionModal } from '@/components/consolidation/ConsolidationTransitionModal';
import { ClozeConsolidationView } from '@/components/consolidation/ClozeConsolidationView';
import { TranslationConsolidationView } from '@/components/consolidation/TranslationConsolidationView';
import { ConsolidationSummaryView } from '@/components/consolidation/ConsolidationSummaryView';
import { getConsolidationDataAction, saveConsolidationResultsAction } from '@/app/actions/consolidation';
import type { ModuleConsolidationData } from '@/lib/data/consolidation-data';

// =============================================================================
// TYPES
// =============================================================================

interface PracticeClientProps {
  initialCards:  SessionCard[];
  /** ISO-8601 timestamp of the next card due (for empty-state display). */
  nextDueAt:     string | null;
  currentModule?: number;
  isGlobalMode?: boolean;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// ── 1. Progress Header ────────────────────────────────────────────────────────

interface ProgressHeaderProps {
  completed:       number;
  remaining:       number;
  total:           number;
  progressPercent: number;
  isGlobalMode?:   boolean;
}

function ProgressHeader({
  completed,
  remaining,
  total,
  progressPercent,
  isGlobalMode,
}: ProgressHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      {isGlobalMode && (
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-zinc-900 border-b border-blue-800/50 py-1.5 px-4 text-center text-xs font-bold text-blue-200 flex items-center justify-center gap-2">
          <Sparkles size={13} className="text-yellow-300 animate-pulse shrink-0" />
          <span>Küresel Tekrar Modu (Global Review Engine) — Tüm modüllerdeki zamanı gelmiş kartlar</span>
        </div>
      )}
      <div className="mx-auto max-w-2xl px-4 py-3">
        {/* Label row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {isGlobalMode ? 'Küresel Tekrar Seansı' : 'Practice Session'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="tabular-nums">
              <span className="font-semibold text-emerald-400">{completed}</span>
              /{total} done
            </span>
            <span className="text-zinc-700">·</span>
            <span className="tabular-nums">
              <span className="font-semibold text-zinc-300">{remaining}</span> left
            </span>
          </div>
        </div>

        {/* Animated progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ minWidth: progressPercent > 0 ? '6px' : '0' }}
          />
        </div>
      </div>
    </header>
  );
}

// ── 2. Session Info Band ──────────────────────────────────────────────────────

interface StatPillProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  colorClass: string;
}

function StatPill({ icon: Icon, label, value, colorClass }: StatPillProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon size={11} />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-mono text-sm font-semibold text-zinc-200 tabular-nums">
        {value}
      </span>
    </div>
  );
}

interface SessionInfoBandProps {
  completedCount:      number;
  lapseCount:          number;
  reviewedCount:       number;
  cumulativeLatencyMs: number;
  successCount:        number;
}

function SessionInfoBand({
  completedCount,
  lapseCount,
  reviewedCount,
  cumulativeLatencyMs,
  successCount,
}: SessionInfoBandProps) {
  const avgSec = reviewedCount > 0
    ? (cumulativeLatencyMs / reviewedCount / 1_000).toFixed(1)
    : '—';

  const accuracy = reviewedCount > 0
    ? `${Math.round((successCount / reviewedCount) * 100)}%`
    : '—';

  return (
    <footer className="border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-4 py-3.5">
        <StatPill icon={CheckCircle2} label="Done"     value={completedCount} colorClass="text-emerald-500" />
        <div className="h-6 w-px bg-zinc-800" />
        <StatPill icon={RefreshCw}   label="Lapses"   value={lapseCount}     colorClass="text-amber-500"   />
        <div className="h-6 w-px bg-zinc-800" />
        <StatPill icon={Timer}       label="Avg Time"  value={`${avgSec}s`}   colorClass="text-blue-500"    />
        <div className="h-6 w-px bg-zinc-800" />
        <StatPill icon={Target}      label="Accuracy" value={accuracy}        colorClass="text-sky-400"     />
      </div>
    </footer>
  );
}

// ── 3. Empty State ────────────────────────────────────────────────────────────

function formatNextDue(iso: string | null): string {
  if (!iso) return 'later';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'now';

  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);

  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d} day${d > 1 ? 's' : ''}`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface EmptyStateProps {
  nextDueAt: string | null;
}

function EmptyState({ nextDueAt }: EmptyStateProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      {/* Icon cluster */}
      <div className="relative mb-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-emerald-800/40 bg-emerald-950/30 shadow-xl shadow-emerald-950/20">
          <Sparkles size={40} className="text-emerald-400" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-700 bg-emerald-900">
          <CheckCircle2 size={14} className="text-emerald-400" />
        </div>
      </div>

      {/* Heading */}
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
        Tebrikler! 🎉
      </h1>
      <p className="mb-6 max-w-md text-emerald-300 text-lg font-semibold leading-relaxed">
        Tüm modüllerdeki zamanı gelmiş tekrarlarını tamamladın! 🧠✨
      </p>
      <p className="mb-8 max-w-sm text-zinc-400 text-sm leading-relaxed">
        Şu an tekrar etmen gereken hiçbir kart yok. Harika bir iş çıkardın! Tekrar zamanı geldiğinde kartlar otomatik olarak buraya düşecek.
      </p>

      {/* Next review chip */}
      {nextDueAt && (
        <div className="mb-8 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5">
          <Clock size={14} className="text-blue-500 animate-pulse" />
          <span className="text-sm text-zinc-400">
            Sıradaki tekrar zamanı:{' '}
            <span className="font-semibold text-blue-300">
              {formatNextDue(nextDueAt)}
            </span>
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="
            flex items-center gap-2 rounded-xl border border-blue-600 bg-blue-600
            px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/40
            hover:bg-blue-500 transition-all duration-150
          "
        >
          <ArrowLeft size={16} />
          <span>Dashboard'a Dön</span>
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="
            flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900
            px-5 py-3 text-sm font-medium text-zinc-300
            hover:border-zinc-700 hover:text-white transition-all duration-150
          "
        >
          <span>Modüllere Göz At</span>
        </button>
      </div>
    </motion.div>
  );
}

// ── 4. Session Complete ───────────────────────────────────────────────────────

interface SummaryStatProps {
  icon:       React.ElementType;
  label:      string;
  value:      string;
  sub?:       string;
  colorClass: string;
}

function SummaryStat({ icon: Icon, label, value, sub, colorClass }: SummaryStatProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className={`mb-1 ${colorClass}`}>
        <Icon size={20} />
      </div>
      <span className="text-2xl font-bold tabular-nums text-white">{value}</span>
      <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      {sub && <span className="text-[11px] text-zinc-600">{sub}</span>}
    </div>
  );
}

interface SessionCompleteProps {
  summary:        SessionSummary;
  onBack:         () => void;
  onRepeat:       () => void;
  currentModule?: number;
  isGlobalMode?:  boolean;
}

function SessionComplete({ summary, onBack, onRepeat, currentModule = 1, isGlobalMode }: SessionCompleteProps) {
  const avgSec = (summary.averageLatencyMs / 1_000).toFixed(1);
  const nextModule = currentModule < 100 ? currentModule + 1 : 1;

  const handleStartNextSession = () => {
    window.location.href = isGlobalMode ? '/practice?mode=global' : `/practice?module=${nextModule}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center"
    >
      {/* Trophy + glow ring */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-3xl bg-yellow-500/10 blur-2xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-yellow-800/50 bg-yellow-950/40 shadow-2xl shadow-yellow-950/20">
          <Trophy size={44} className="text-yellow-400" />
        </div>
        {/* Sparkle dots */}
        <motion.div
          className="absolute -right-3 -top-3 h-3 w-3 rounded-full bg-yellow-500"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-2 -left-2 h-2 w-2 rounded-full bg-emerald-500"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
      </div>

      {/* Heading */}
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Seans Tamamlandı! 🎉
      </h1>
      <p className="mb-6 max-w-md text-emerald-300 text-lg font-semibold leading-relaxed">
        Tüm modüllerdeki zamanı gelmiş tekrarlarını tamamladın! 🧠✨
      </p>
      <p className="mb-8 text-sm text-zinc-400">
        Bu seansta toplam <span className="font-bold text-white">{summary.totalReviewed} kart</span> başarıyla tamamlandı.
      </p>

      {/* Stats grid */}
      <div className="mb-8 grid w-full max-w-md grid-cols-3 gap-3">
        <SummaryStat
          icon={BookOpen}
          label="Tamamlanan"
          value={String(summary.totalReviewed)}
          sub="kart"
          colorClass="text-blue-400"
        />
        <SummaryStat
          icon={Zap}
          label="Ort. Süre"
          value={`${avgSec}s`}
          sub="hatırlama hızı"
          colorClass="text-amber-400"
        />
        <SummaryStat
          icon={Target}
          label="Başarı Oranı"
          value={`%${summary.successRate}`}
          sub="Good + Easy"
          colorClass="text-emerald-400"
        />
      </div>

      {/* Action buttons */}
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={onBack}
          className="
            flex items-center justify-center gap-2 rounded-xl
            border border-blue-600 bg-blue-600 px-6 py-3.5
            text-sm font-semibold text-white shadow-lg shadow-blue-950/40
            hover:border-blue-500 hover:bg-blue-500
            transition-all duration-150
          "
        >
          <ArrowLeft size={16} />
          <span>Dashboard'a Dön</span>
        </button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN CLIENT COMPONENT
// =============================================================================

type ConsolidationState = 'idle' | 'transition_modal' | 'cloze_stage' | 'translation_stage' | 'summary' | 'skip_to_dashboard';

export function PracticeClient({ initialCards, nextDueAt, currentModule = 1, isGlobalMode }: PracticeClientProps) {
  const router = useRouter();
  const [cardIndex, setCardIndex] = useState(0);

  // Consolidation flow state
  const [consolidationState, setConsolidationState] = useState<ConsolidationState>('idle');
  const [consolidationData, setConsolidationData] = useState<ModuleConsolidationData | null>(null);
  const [clozeScore, setClozeScore] = useState<number>(0);
  const [translationScore, setTranslationScore] = useState<number>(0);
  const [failedWords, setFailedWords] = useState<string[]>([]);
  const [isLoadingConsolidation, setIsLoadingConsolidation] = useState(false);

  const {
    queue,
    isComplete,
    isIdle,
    stats,
    summary,
    progressPercent,
    handleCardReviewed,
  } = usePracticeSession(initialCards);

  const activeIndex = Math.min(cardIndex, Math.max(0, queue.length - 1));
  const activeCard = queue[activeIndex] ?? null;

  const handlePrevCard = useCallback(() => {
    setCardIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextCard = useCallback(() => {
    setCardIndex((prev) => Math.min(queue.length - 1, prev + 1));
  }, [queue.length]);

  const handleReviewWrapper = useCallback((result: SubmitReviewData, latencyMs: number) => {
    handleCardReviewed(result, latencyMs);
    setCardIndex((prev) => Math.min(prev, Math.max(0, queue.length - 2)));
  }, [handleCardReviewed, queue.length]);

  // Start consolidation flow
  const handleStartConsolidation = async () => {
    setIsLoadingConsolidation(true);
    try {
      const res = await getConsolidationDataAction(currentModule);
      if (res.success && res.data) {
        setConsolidationData(res.data);
        setConsolidationState('cloze_stage');
      } else {
        router.push('/dashboard');
      }
    } catch {
      router.push('/dashboard');
    } finally {
      setIsLoadingConsolidation(false);
    }
  };

  const handleStage1Complete = (score: number, failed: string[]) => {
    setClozeScore(score);
    setFailedWords((prev) => Array.from(new Set([...prev, ...failed])));
    setConsolidationState('translation_stage');
  };

  const handleStage2Complete = async (score: number, failed: string[]) => {
    setTranslationScore(score);
    const allFailed = Array.from(new Set([...failedWords, ...failed]));

    try {
      await saveConsolidationResultsAction({
        moduleNumber: currentModule,
        clozeScore,
        translationScore: score,
        failedWords: allFailed,
      });
    } catch {}

    setConsolidationState('summary');
  };

  // ── Guard: no cards due today ───────────────────────────────────────────────
  if (isIdle) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <EmptyState nextDueAt={nextDueAt} />
      </div>
    );
  }

  // ── Guard: session complete & Consolidation Flow ────────────────────────────
  if (isComplete && summary) {
    // Stage: Summary View
    if (consolidationState === 'summary') {
      return (
        <div className="min-h-screen bg-zinc-950">
          <ConsolidationSummaryView
            moduleNumber={currentModule}
            clozeScore={clozeScore}
            translationScore={translationScore}
            failedWordsCount={failedWords.length}
            onReturnToDashboard={() => router.push('/dashboard')}
          />
        </div>
      );
    }

    // Stage 1: Cloze View
    if (consolidationState === 'cloze_stage' && consolidationData) {
      return (
        <div className="min-h-screen bg-zinc-950">
          <ClozeConsolidationView
            moduleNumber={currentModule}
            targetWords={consolidationData.targetWords}
            questions={consolidationData.clozeQuestions}
            onCompleteStage1={handleStage1Complete}
            onSkip={() => router.push('/dashboard')}
          />
        </div>
      );
    }

    // Stage 2: Translation View
    if (consolidationState === 'translation_stage' && consolidationData) {
      return (
        <div className="min-h-screen bg-zinc-950">
          <TranslationConsolidationView
            moduleNumber={currentModule}
            questions={consolidationData.translationQuestions}
            onCompleteStage2={handleStage2Complete}
            onSkip={() => router.push('/dashboard')}
          />
        </div>
      );
    }

    // Default / Modal State
    return (
      <div className="min-h-screen bg-zinc-950">
        <SessionComplete
          summary={summary}
          onBack={() => router.push('/dashboard')}
          onRepeat={()  => router.refresh()}
          currentModule={currentModule}
          isGlobalMode={isGlobalMode}
        />

        {/* Transition Modal Popup */}
        {consolidationState !== 'skip_to_dashboard' && (
          <ConsolidationTransitionModal
            onContinue={handleStartConsolidation}
            onSkip={() => setConsolidationState('skip_to_dashboard')}
          />
        )}
      </div>
    );
  }

  // ── Active session ──────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* ── Progress header ──────────────────────────────────── */}
      <ProgressHeader
        completed={stats.completedCount}
        remaining={queue.length}
        total={stats.totalStarted}
        progressPercent={progressPercent}
        isGlobalMode={isGlobalMode}
      />

      {/* ── Card area ────────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait">
          {activeCard && (
            <WordCard
              key={`${activeCard.userState.id}-${activeCard.userState.repetition_count}-${activeIndex}`}
              lexicalItem={activeCard.lexicalItem}
              userState={activeCard.userState}
              contextSentence={activeCard.contextSentence}
              onNext={handleReviewWrapper}
              onPrev={handlePrevCard}
              onNextCard={handleNextCard}
              hasPrev={activeIndex > 0}
              hasNext={activeIndex < queue.length - 1}
              className="w-full"
            />
          )}
        </AnimatePresence>
      </main>

      {/* ── Session info band ────────────────────────────────── */}
      <SessionInfoBand
        completedCount={stats.completedCount}
        lapseCount={stats.lapseCount}
        reviewedCount={stats.reviewedCount}
        cumulativeLatencyMs={stats.cumulativeLatencyMs}
        successCount={stats.successCount}
      />
    </div>
  );
}
