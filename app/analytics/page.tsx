/**
 * app/analytics/page.tsx
 * ───────────────────────
 * Advanced Cognitive Analytics & Metacognition Panel Page
 *
 * Displays:
 *  1. FSRS-6 Stability Matrix Widget (Learning vs Review vs Mastered)
 *  2. Receptive to Productive Ratio Widget (R_act Activation & Metacognitive Callout)
 *  3. Procedural Latency Analytics & Automation Index (I_proc)
 */

import { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { ArrowLeft, Brain, Gauge, Layers, Sparkles, Target } from 'lucide-react';

import { getAdminClient } from '@/lib/supabaseClient';
import {
  calculateStabilityMatrix,
  calculateReceptiveToProductiveRatio,
  calculateLatencyAnalytics,
  type CardStateRow,
  type ReviewLogRow,
} from '@/lib/analytics';
import { StabilityMatrixWidget } from '@/components/analytics/StabilityMatrixWidget';
import { ReceptiveToProductiveWidget } from '@/components/analytics/ReceptiveToProductiveWidget';
import { LatencyTrackerWidget } from '@/components/analytics/LatencyTrackerWidget';

export const metadata: Metadata = {
  title: 'Analytics & Metacognition — SciVocab',
  description: 'Advanced cognitive memory metrics, activation ratios, and recall speed automation analytics.',
};

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
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const dbClient = getAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  const GUEST_IDS = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000'];
  const userIdsToQuery = user ? [user.id, ...GUEST_IDS] : GUEST_IDS;

  // 1. Fetch USER_LEXICAL_STATE for user / guest IDs using Admin Client (RLS Bypass)
  let { data: stateRows, error: stateError } = await (dbClient as any)
    .from('USER_LEXICAL_STATE')
    .select('id, state, stability, difficulty, avg_latency_ms, repetition_count, user_id')
    .in('user_id', userIdsToQuery);

  if (stateError) {
    console.warn('[AnalyticsPage] State query warning:', stateError.message);
  }

  // Fallback: If no rows found for specific user IDs, fetch overall dataset
  if (!stateRows || stateRows.length === 0) {
    const { data: fallbackRows } = await (dbClient as any)
      .from('USER_LEXICAL_STATE')
      .select('id, state, stability, difficulty, avg_latency_ms, repetition_count, user_id')
      .limit(850);
    stateRows = fallbackRows ?? [];
  }

  // If database has zero user states, fetch LEXICAL_ITEMS count to populate default matrix
  let cards: CardStateRow[] = (stateRows ?? []).map((r: any) => ({
    stability: r.stability,
    difficulty: r.difficulty,
    state: r.state,
    avg_latency_ms: r.avg_latency_ms,
    repetition_count: r.repetition_count,
  }));

  if (cards.length === 0) {
    const { data: items } = await (dbClient as any)
      .from('LEXICAL_ITEMS')
      .select('id')
      .limit(850);

    cards = (items ?? []).map(() => ({
      stability: 0,
      difficulty: 0,
      state: 'New',
      avg_latency_ms: 0,
      repetition_count: 0,
    }));
  }

  const userStateIds = (stateRows ?? []).map((r: any) => r.id).filter(Boolean);

  console.log("ANALYTICS_QUERY_DEBUG:", {
    auth_user_id: user?.id ?? 'GUEST',
    queried_user_ids: userIdsToQuery,
    raw_state_rows_count: stateRows?.length ?? 0,
    cards_count: cards.length,
    userStateIds_count: userStateIds.length,
  });

  // 2. Fetch REVIEW_LOGS for last 30 days with RLS bypass
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let logs: ReviewLogRow[] = [];

  if (userStateIds.length > 0) {
    const { data: logsData } = await (dbClient as any)
      .from('REVIEW_LOGS')
      .select('rating, review_timestamp')
      .in('user_state_id', userStateIds)
      .gte('review_timestamp', thirtyDaysAgo);

    if (logsData) {
      logs = logsData.map((l: any) => ({
        rating: l.rating,
        review_timestamp: l.review_timestamp,
      }));
    }
  }

  // 3. Compute Analytics
  const stabilityMatrix = calculateStabilityMatrix(cards);
  const activationMetric = calculateReceptiveToProductiveRatio(cards, logs.length);
  const latencyAnalytics = calculateLatencyAnalytics(cards, logs);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-blue-500" />
              <h1 className="text-base font-bold text-white tracking-tight">
                Analytics & Metacognition
              </h1>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-800 bg-blue-950/80 px-3 py-1 text-xs font-bold text-blue-300">
            <Sparkles size={13} />
            <span>Gelişmiş Bilişsel Panel</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        {/* Intro Hero Box */}
        <div className="rounded-2xl border border-blue-900/60 bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950/30 p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                Bilişsel Metakognisyon Paneli
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1">
                Hafıza Derinliği, Aktifleşme ve Hız Analizi
              </h2>
              <p className="text-sm text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Kelime dağarcığınızın FSRS-6 kararlılık matrisini, pasiften aktife dönüşüm oranını (R-Act) ve otomatik çağırma hızını (I-Proc) anlık olarak takip edin.
              </p>
            </div>
          </div>
        </div>

        {/* 1. Stability Matrix Widget */}
        <StabilityMatrixWidget data={stabilityMatrix} />

        {/* 2. Grid: Receptive to Productive + Latency Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ReceptiveToProductiveWidget data={activationMetric} />
          <LatencyTrackerWidget data={latencyAnalytics} />
        </div>
      </main>
    </div>
  );
}
