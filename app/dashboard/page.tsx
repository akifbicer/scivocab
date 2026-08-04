/**
 * app/dashboard/page.tsx
 * ──────────────────────
 * Server Component — Supabase data hub for the analytics dashboard.
 *
 * Aggregation strategy:
 *  - Fetch raw USER_LEXICAL_STATE rows and aggregate in JS (avoids
 *    multiple round-trips and works well for vocab sizes < 50k).
 *  - REVIEW_LOGS queries benefit from RLS: no explicit user_id filter
 *    needed because the policy enforces `auth.uid()` on the server.
 *
 * Latency note:
 *  REVIEW_LOGS does not store per-event latency; `avg_latency_ms` lives
 *  on USER_LEXICAL_STATE and is computed as a weighted rolling average.
 */

import { Metadata }          from 'next';
import { cookies }           from 'next/headers';
import { redirect }          from 'next/navigation';
import { createServerClient } from '@supabase/ssr';

import type { Database }  from '@/types/database';
import { getGlobalDueCards } from '@/app/actions/srs';
import { DashboardClient } from './_components/DashboardClient';

// =============================================================================
// SEO
// =============================================================================

export const metadata: Metadata = {
  title: 'Dashboard — SciVocab',
  description: 'Your personalised vocabulary learning analytics and progress overview.',
};

import { calculateAverageRetrievability, type RetrievabilityCalculation } from '@/lib/retrievability';
import { evaluateStreakSystem, type StreakEvaluationResult } from '@/lib/streak';
import {
  calculateStabilityMatrix,
  calculateReceptiveToProductiveRatio,
  calculateLatencyAnalytics,
  type CardStateRow,
  type ReviewLogRow,
} from '@/lib/analytics';
import type {
  StabilityMatrixData,
  ReceptiveToProductiveMetric,
  LatencyAnalyticsData,
} from '@/types/analytics';

// =============================================================================
// PUBLIC DATA CONTRACT (shared with DashboardClient)
// =============================================================================

export interface StateCounts {
  New:           number;
  Learning:      number;
  Review:        number;
  'Re-learning': number;
  Mastered:      number;
}

export interface DashboardData {
  userName:           string;
  greeting:           string;
  stateCounts:        StateCounts;
  totalWords:         number;
  dueCount:           number;
  avgStability:       number;   // mean FSRS-6 S across all cards
  avgDifficulty:      number;   // mean FSRS-6 D across all cards
  avgLatencyMs:       number;   // weighted mean across all cards
  totalReviews:       number;   // last 30 days
  retentionRate:      number;   // 0–100, last 30 days (Good+Easy / total)
  streak:             number;   // consecutive days with ≥1 review
  retrievabilityCalc: RetrievabilityCalculation;
  streakEval:         StreakEvaluationResult;
  stabilityMatrix:    StabilityMatrixData;
  activationMetric:   ReceptiveToProductiveMetric;
  latencyAnalytics:   LatencyAnalyticsData;
}

// =============================================================================
// HELPERS
// =============================================================================

function getGreeting(utcHour: number): string {
  if (utcHour < 6)  return 'Good night';
  if (utcHour < 12) return 'Good morning';
  if (utcHour < 17) return 'Good afternoon';
  if (utcHour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Computes the current consecutive daily review streak.
 * A day counts if at least one REVIEW_LOG record exists for that UTC date.
 * The streak continues backward from today or yesterday (today is valid even
 * if the session is still in progress).
 */
function calcStreak(timestamps: string[]): number {
  if (timestamps.length === 0) return 0;

  const uniqueDates = [
    ...new Set(timestamps.map((t) => t.slice(0, 10))),
  ].sort().reverse(); // most-recent first

  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Streak must start from today or yesterday
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev     = new Date(uniqueDates[i - 1]);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const expected = prev.toISOString().slice(0, 10);
    if (uniqueDates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{
          name: string;
          value: string;
          options?: {
            path?: string;
            domain?: string;
            expires?: Date;
            maxAge?: number;
            sameSite?: 'lax' | 'strict' | 'none';
            secure?: boolean;
          };
        }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}

// =============================================================================
// PAGE
// =============================================================================

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const now      = new Date();

  // ── Auth guard / Misafir deneme modu ────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const GUEST_IDS = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000'];
  const userIdsToQuery = user ? Array.from(new Set([user.id, ...GUEST_IDS])) : GUEST_IDS;

  const currentUser = user ?? {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'guest@scivocab.local',
    user_metadata: { full_name: 'Guest Learner' },
  };

  const userName = (
    ((currentUser.user_metadata as any)?.full_name as string | undefined) ??
    ((currentUser.user_metadata as any)?.name     as string | undefined) ??
    currentUser.email?.split('@')[0] ??
    'Student'
  );

  // ── 0. Query global due cards for SRS engine ────────────────────────────────
  const { dueCount: globalDueCount } = await getGlobalDueCards();

  // ── 1. USER_LEXICAL_STATE — all aggregates in one query ─────────────────────
  const { data: stateRows, error: stateError } = await supabase
    .from('USER_LEXICAL_STATE')
    .select(
      'id, state, stability, difficulty, next_review_date, avg_latency_ms, repetition_count',
    )
    .in('user_id', userIdsToQuery);

  if (stateError) {
    console.error('[Dashboard] state fetch:', stateError.message);
  }

  const userStateIds = (stateRows ?? []).map((r) => r.id).filter(Boolean);

  const stateCounts: StateCounts = {
    New: 0, Learning: 0, Review: 0, 'Re-learning': 0, Mastered: 0,
  };
  let totalStability         = 0;
  let totalDifficulty        = 0;
  let dueCount               = globalDueCount;
  let totalWeightedLatency   = 0;
  let totalReps              = 0;

  for (const row of stateRows ?? []) {
    const state = row.state as keyof StateCounts;
    if (state in stateCounts) stateCounts[state]++;

    totalStability  += row.stability  ?? 0;
    totalDifficulty += row.difficulty ?? 0;

    // Weighted latency (weight = number of reviews on that card)
    const reps = row.repetition_count ?? 0;
    if (reps > 0) {
      totalWeightedLatency += (row.avg_latency_ms ?? 0) * reps;
      totalReps            += reps;
    }
  }

  const totalWords    = stateRows?.length ?? 0;
  const avgStability  = totalWords > 0 ? totalStability  / totalWords : 0;
  const avgDifficulty = totalWords > 0 ? totalDifficulty / totalWords : 0;
  const avgLatencyMs  = totalReps  > 0 ? totalWeightedLatency / totalReps : 0;

  // ── 2. REVIEW_LOGS — last 30 days ──────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);

  let recentLogs: { rating: number }[] = [];
  let streakLogs: { review_timestamp: string }[] = [];

  if (userStateIds.length > 0) {
    const { data: logsData, error: logsError } = await supabase
      .from('REVIEW_LOGS')
      .select('rating')
      .in('user_state_id', userStateIds)
      .gte('review_timestamp', thirtyDaysAgo.toISOString());

    if (logsError) {
      console.error('[Dashboard] recent logs fetch:', logsError.message);
    } else if (logsData) {
      recentLogs = logsData;
    }

    // ── 3. REVIEW_LOGS — last 365 days for streak ───────────────────────────
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1_000);

    const { data: sLogsData } = await supabase
      .from('REVIEW_LOGS')
      .select('review_timestamp')
      .in('user_state_id', userStateIds)
      .gte('review_timestamp', oneYearAgo.toISOString())
      .order('review_timestamp', { ascending: false });

    if (sLogsData) {
      streakLogs = sLogsData;
    }
  }

  const totalReviews = recentLogs.length;
  const successCount = recentLogs.filter((l) => l.rating >= 3).length;
  const retentionRate = totalReviews > 0
    ? Math.round((successCount / totalReviews) * 100)
    : 0;

  const streakTimestamps = streakLogs.map((l) => l.review_timestamp);
  const rawStreak = calcStreak(streakTimestamps);

  const retrievabilityCalc = calculateAverageRetrievability(
    (stateRows ?? []).map((r) => ({
      stability: r.stability,
      last_review_date: (r as any).last_review_date ?? null,
      state: r.state,
    })),
    now,
  );

  const streakEval = evaluateStreakSystem({
    completedQueueCount: totalReviews,
    totalDueQueueCount: dueCount,
    all4PhasesCompleted: false,
    lastActiveDateISO: streakTimestamps[0] ?? null,
    storedStreakDays: rawStreak,
    storedFreezeCredits: 1,
    now,
  });

  const cardsForAnalytics: CardStateRow[] = (stateRows ?? []).map((r: any) => ({
    stability: r.stability,
    difficulty: r.difficulty,
    state: r.state,
    avg_latency_ms: r.avg_latency_ms,
    repetition_count: r.repetition_count,
  }));

  const logsForAnalytics: ReviewLogRow[] = (recentLogs ?? []).map((l: any) => ({
    rating: l.rating,
    review_timestamp: (l as any).review_timestamp ?? now.toISOString(),
  }));

  const stabilityMatrix = calculateStabilityMatrix(cardsForAnalytics);
  const activationMetric = calculateReceptiveToProductiveRatio(cardsForAnalytics, logsForAnalytics.length);
  const latencyAnalytics = calculateLatencyAnalytics(cardsForAnalytics, logsForAnalytics);

  // ── Assemble payload ─────────────────────────────────────────────────────────
  const data: DashboardData = {
    userName,
    greeting:      getGreeting(now.getUTCHours()),
    stateCounts,
    totalWords,
    dueCount,
    avgStability:  Math.round(avgStability  * 10) / 10,
    avgDifficulty: Math.round(avgDifficulty * 10) / 10,
    avgLatencyMs:  Math.round(avgLatencyMs),
    totalReviews,
    retentionRate,
    streak:        streakEval.currentStreakDays,
    retrievabilityCalc,
    streakEval,
    stabilityMatrix,
    activationMetric,
    latencyAnalytics,
  };

  return <DashboardClient data={data} />;
}
