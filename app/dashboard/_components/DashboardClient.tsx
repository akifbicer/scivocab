'use client';

/**
 * app/dashboard/_components/DashboardClient.tsx
 * ───────────────────────────────────────────────
 * Interactive analytics dashboard shell.
 * Receives pre-aggregated `DashboardData` from the Server Component and
 * renders the full UI with Framer Motion stagger entrance animations.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Clock,
  Flame,
  Gauge,
  Layers,
  LogOut,
  Settings,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';

import type { DashboardData } from '../page';
import { ModuleSelector } from '@/components/ModuleSelector';
import { DailyLimitSelector } from '@/components/settings/DailyLimitSelector';
import { RetrievabilityGauge } from '@/components/dashboard/RetrievabilityGauge';
import { SessionLauncher } from '@/components/dashboard/SessionLauncher';

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show:   {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

// =============================================================================
// 1. WELCOME SECTION
// =============================================================================

interface WelcomeSectionProps {
  greeting:            string;
  userName:            string;
  streak:              number;
  dueCount:            number;
  freezeUsedToday?:    boolean;
  onOpenLimitModal:    () => void;
  onOpenRoutinesModal: () => void;
}

function WelcomeSection({
  greeting,
  userName,
  streak,
  dueCount,
  freezeUsedToday,
  onOpenLimitModal,
  onOpenRoutinesModal,
}: WelcomeSectionProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <motion.section variants={fadeUpVariant} className="mb-6">
      {/* Greeting row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-600">
            {greeting}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {userName} 👋
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Lexicon Vocabulary Button */}
          <Link
            href="/lexicon"
            className="flex items-center gap-1.5 rounded-xl border border-blue-800/60 bg-blue-950/40 px-3.5 py-2 text-xs font-bold text-blue-300 hover:bg-blue-900/50 hover:text-white transition-all shadow-md"
          >
            <BookOpen size={14} className="text-blue-400" />
            <span>Sözlük & Leksikon</span>
          </Link>

          {/* Analytics Panel Link Button */}
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 rounded-xl border border-violet-800/60 bg-violet-950/40 px-3.5 py-2 text-xs font-bold text-violet-300 hover:bg-violet-900/50 hover:text-white transition-all shadow-md"
          >
            <Brain size={14} className="text-violet-400" />
            <span>Gelişmiş Analitik</span>
          </Link>

          {/* Limit Settings Modal Trigger Button */}
          <button
            type="button"
            onClick={onOpenLimitModal}
            className="flex items-center gap-1.5 rounded-xl border border-amber-800/60 bg-amber-950/40 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-900/50 hover:text-white transition-all shadow-md cursor-pointer"
          >
            <Settings size={14} className="text-amber-400" />
            <span>⚙️ Bilişsel Limit</span>
          </button>

          {/* 4-Phase Routine Modal Trigger Button */}
          <button
            type="button"
            onClick={onOpenRoutinesModal}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/50 hover:text-white transition-all shadow-md cursor-pointer"
          >
            <Zap size={14} className="text-emerald-400" />
            <span>🚀 Günlük Rutin</span>
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60 hover:text-white transition-all shadow-md cursor-pointer"
            title="Oturumu Kapat"
          >
            <LogOut size={14} className="text-rose-400" />
            <span>Çıkış Yap</span>
          </button>

          {/* Streak Freeze Badge */}
          {freezeUsedToday && (
            <div className="flex items-center gap-1.5 rounded-xl border border-sky-800/80 bg-sky-950/60 px-3 py-2 text-xs font-bold text-sky-300 shadow-md">
              <span>Seriniz Dondurma Hakkı ile Korundu 🧊</span>
            </div>
          )}

          {/* Streak badge */}
          {streak > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-orange-800/50 bg-orange-950/30 px-3.5 py-2">
              <Flame size={16} className="text-orange-400" />
              <span className="text-sm font-bold text-orange-300">
                {streak} Günlük Seri 🔥
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

// =============================================================================
// 2. KPI CARDS
// =============================================================================

interface KpiCardProps {
  icon:        React.ElementType;
  label:       string;
  value:       string;
  sub?:        string;
  accentClass: string;   // Tailwind classes for left border + bg tint
  iconClass:   string;
}

function KpiCard({ icon: Icon, label, value, sub, accentClass, iconClass }: KpiCardProps) {
  return (
    <motion.div
      variants={fadeUpVariant}
      className={`
        relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-800
        bg-zinc-900 p-5 ${accentClass}
      `}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2 ${iconClass}`}>
          <Icon size={16} />
        </div>
      </div>

      {/* Value */}
      <div>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-white">
          {value}
        </p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {label}
        </p>
        {sub && (
          <p className="mt-1 text-[11px] text-zinc-600">{sub}</p>
        )}
      </div>
    </motion.div>
  );
}

interface KpiGridProps {
  data: DashboardData;
}

function KpiGrid({ data }: KpiGridProps) {
  const avgLatencySec = data.avgLatencyMs > 0
    ? `${(data.avgLatencyMs / 1_000).toFixed(1)}s`
    : '—';

  const retentionDisplay = data.totalReviews > 0
    ? `${data.retentionRate}%`
    : '—';

  const retentionSub = data.totalReviews > 0
    ? `${data.retentionRate >= 90 ? '✓' : '↓'} vs 90% target · ${data.totalReviews} reviews`
    : 'No reviews in last 30 days';

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        icon={Brain}
        label="Retention Rate"
        value={retentionDisplay}
        sub={retentionSub}
        accentClass="border-l-2 border-l-blue-600"
        iconClass="bg-blue-950/60 text-blue-400"
      />
      <KpiCard
        icon={Sparkles}
        label="Mastered Words"
        value={String(data.stateCounts.Mastered)}
        sub={data.totalWords > 0
          ? `${Math.round((data.stateCounts.Mastered / data.totalWords) * 100)}% of vocabulary`
          : 'No words yet'}
        accentClass="border-l-2 border-l-emerald-600"
        iconClass="bg-emerald-950/60 text-emerald-400"
      />
      <KpiCard
        icon={Zap}
        label="Avg Response"
        value={avgLatencySec}
        sub="Weighted recall latency"
        accentClass="border-l-2 border-l-amber-600"
        iconClass="bg-amber-950/60 text-amber-400"
      />
      <KpiCard
        icon={Timer}
        label="Due Today"
        value={String(data.dueCount)}
        sub={data.dueCount === 0 ? 'You\'re all caught up!' : 'Cards awaiting review'}
        accentClass={
          data.dueCount > 0
            ? 'border-l-2 border-l-red-600'
            : 'border-l-2 border-l-zinc-600'
        }
        iconClass={
          data.dueCount > 0
            ? 'bg-red-950/60 text-red-400'
            : 'bg-zinc-800 text-zinc-500'
        }
      />
    </div>
  );
}

// =============================================================================
// 3. MEMORY STATE BAR
// =============================================================================

interface SegmentConfig {
  key:        keyof DashboardData['stateCounts'];
  label:      string;
  barClass:   string;
  dotClass:   string;
  textClass:  string;
}

const SEGMENTS: SegmentConfig[] = [
  { key: 'New',           label: 'New',          barClass: 'bg-zinc-600',    dotClass: 'bg-zinc-500',    textClass: 'text-zinc-400'    },
  { key: 'Learning',      label: 'Learning',     barClass: 'bg-blue-500',    dotClass: 'bg-blue-500',    textClass: 'text-blue-400'    },
  { key: 'Review',        label: 'Review',       barClass: 'bg-yellow-500',  dotClass: 'bg-yellow-500',  textClass: 'text-yellow-400'  },
  { key: 'Re-learning',   label: 'Re-learning',  barClass: 'bg-red-500',     dotClass: 'bg-red-500',     textClass: 'text-red-400'     },
  { key: 'Mastered',      label: 'Mastered',     barClass: 'bg-emerald-500', dotClass: 'bg-emerald-500', textClass: 'text-emerald-400' },
];

interface MemoryStateSectionProps {
  stateCounts:   DashboardData['stateCounts'];
  totalWords:    number;
  avgStability:  number;
  avgDifficulty: number;
}

function MemoryStateSection({
  stateCounts,
  totalWords,
  avgStability,
  avgDifficulty,
}: MemoryStateSectionProps) {
  return (
    <motion.section
      variants={fadeUpVariant}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-zinc-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Memory State Distribution
            </span>
          </div>
          <p className="mt-0.5 text-lg font-bold text-white">
            {totalWords.toLocaleString()} total words
          </p>
        </div>

        {/* FSRS param pills */}
        {totalWords > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1">
              <TrendingUp size={11} className="text-blue-500" />
              <span className="text-[11px] font-mono text-zinc-400">
                S̄ = <span className="text-blue-300">{avgStability.toFixed(1)}</span>d
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1">
              <Gauge size={11} className="text-violet-500" />
              <span className="text-[11px] font-mono text-zinc-400">
                D̄ = <span className="text-violet-300">{avgDifficulty.toFixed(1)}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {totalWords === 0 ? (
        /* Empty state */
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-zinc-800">
          <p className="text-sm text-zinc-600">
            Add words to see your progress here.
          </p>
        </div>
      ) : (
        <>
          {/* Segmented bar */}
          <div className="mb-5 flex h-4 w-full overflow-hidden rounded-full bg-zinc-800">
            {SEGMENTS.map(({ key, label, barClass }) => {
              const count   = stateCounts[key];
              const percent = (count / totalWords) * 100;
              if (percent === 0) return null;

              return (
                <motion.div
                  key={key}
                  title={`${label}: ${count} (${percent.toFixed(1)}%)`}
                  className={`h-full ${barClass} first:rounded-l-full last:rounded-r-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {SEGMENTS.map(({ key, label, dotClass, textClass }) => {
              const count   = stateCounts[key];
              const percent = totalWords > 0
                ? ((count / totalWords) * 100).toFixed(1)
                : '0.0';

              return (
                <div key={key} className="flex items-start gap-2">
                  <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dotClass}`} />
                  <div>
                    <p className={`text-xs font-semibold ${textClass}`}>{label}</p>
                    <p className="text-sm font-bold tabular-nums text-zinc-200">
                      {count}
                      <span className="ml-1 text-[11px] font-normal text-zinc-600">
                        ({percent}%)
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.section>
  );
}

// =============================================================================
// 4. RECENT ACTIVITY HEADER (optional info strip)
// =============================================================================

interface ActivityStripProps {
  totalReviews:  number;
  retentionRate: number;
}

function ActivityStrip({ totalReviews, retentionRate }: ActivityStripProps) {
  if (totalReviews === 0) return null;

  return (
    <motion.div
      variants={fadeUpVariant}
      className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5"
    >
      <Clock size={12} className="text-zinc-600" />
      <span className="text-xs text-zinc-500">Last 30 days:</span>
      <span className="text-xs font-semibold text-zinc-300">
        {totalReviews.toLocaleString()} reviews
      </span>
      <span className="text-zinc-700">·</span>
      <span className="text-xs text-zinc-500">
        <span
          className={`font-semibold ${retentionRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}
        >
          {retentionRate}%
        </span>{' '}
        accuracy (Good + Easy)
      </span>
      {retentionRate >= 90 && (
        <>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-emerald-500">✓ Above target</span>
        </>
      )}
    </motion.div>
  );
}

// =============================================================================
// 5. MAIN CLIENT COMPONENT
// =============================================================================

export interface DashboardClientProps {
  data: DashboardData;
}

export function DashboardClient({ data }: DashboardClientProps) {
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isRoutinesModalOpen, setIsRoutinesModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top gradient glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-blue-950/10 via-transparent to-transparent" />

      <main className="relative mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-0"
        >
          {/* ── Welcome + Header Navigation ────────────────────────── */}
          <WelcomeSection
            greeting={data.greeting}
            userName={data.userName}
            streak={data.streak}
            dueCount={data.dueCount}
            freezeUsedToday={data.streakEval?.freezeUsedToday}
            onOpenLimitModal={() => setIsLimitModalOpen(true)}
            onOpenRoutinesModal={() => setIsRoutinesModalOpen(true)}
          />

          {/* ── 30-day activity strip ───────────────────────────── */}
          <ActivityStrip
            totalReviews={data.totalReviews}
            retentionRate={data.retentionRate}
          />

          {/* ── Academic Vocabulary Modules (1-100) — Main Focus ── */}
          <motion.div variants={fadeUpVariant} className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Ana Odak Noktası (Main Focus)
                </p>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Academic Vocabulary Modules (1-100)
                </h2>
              </div>
            </div>
            <ModuleSelector />
          </motion.div>
        </motion.div>
      </main>

      {/* ── Bilişsel Limit Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLimitModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsLimitModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              <DailyLimitSelector onLimitChanged={() => setIsLimitModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 4-Fazlı Günlük Rutin Modal ────────────────────────────────── */}
      <AnimatePresence>
        {isRoutinesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoutinesModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsRoutinesModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              <SessionLauncher dueCount={data.dueCount} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
