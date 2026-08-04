/**
 * lib/analytics.ts
 * ─────────────────
 * Advanced Cognitive Analytics & Metacognitive Calculation Engine
 *
 * Provides analytical aggregations:
 *  1. Stability Matrix (Learning: S < 1d, Review: 1 <= S < 365d, Mastered: S >= 365d)
 *  2. Receptive to Productive Activation Ratio (R_act = Productive / Receptive * 100)
 *  3. Procedural Latency Analytics & Automation Index (I_proc)
 */

import type {
  StabilityMatrixData,
  ReceptiveToProductiveMetric,
  LatencyAnalyticsData,
  LatencyDataPoint,
} from '@/types/analytics';

export interface CardStateRow {
  stability: number | null;
  difficulty: number | null;
  state: string;
  avg_latency_ms: number | null;
  repetition_count: number | null;
}

export interface ReviewLogRow {
  rating: number;
  review_timestamp: string;
}

/**
 * Calculates Stability Matrix distribution across Learning, Review, and Mastered buckets.
 * Excludes unstudied 'New' cards (repetition_count === 0) from contaminating active memory ratios.
 */
export function calculateStabilityMatrix(cards: CardStateRow[]): StabilityMatrixData {
  let learningCount = 0;
  let earlyReviewCount = 0;
  let consolidationCount = 0;
  let longTermCount = 0;
  let masteredCount = 0;

  // Filter for active studied cards (repetition_count > 0 or state !== 'New' or stability > 0)
  const activeStudiedCards = cards.filter((c) => {
    const reps = c.repetition_count ?? 0;
    const s = c.stability ?? 0;
    const isNew = c.state === 'New';
    return !isNew || reps > 0 || s > 0;
  });

  for (const c of activeStudiedCards) {
    const s = c.stability ?? 0;
    if (c.state === 'Mastered' || s >= 365) {
      masteredCount++;
    } else if (s >= 30) {
      longTermCount++;
    } else if (s >= 7) {
      consolidationCount++;
    } else if (s >= 1) {
      earlyReviewCount++;
    } else {
      learningCount++;
    }
  }

  const totalCount = activeStudiedCards.length;
  const learningPercentage = totalCount > 0 ? Math.round((learningCount / totalCount) * 100) : 0;
  const earlyReviewPercentage = totalCount > 0 ? Math.round((earlyReviewCount / totalCount) * 100) : 0;
  const consolidationPercentage = totalCount > 0 ? Math.round((consolidationCount / totalCount) * 100) : 0;
  const longTermPercentage = totalCount > 0 ? Math.round((longTermCount / totalCount) * 100) : 0;
  const masteredPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  return {
    learningCount,
    learningPercentage,
    earlyReviewCount,
    earlyReviewPercentage,
    consolidationCount,
    consolidationPercentage,
    longTermCount,
    longTermPercentage,
    masteredCount,
    masteredPercentage,
    totalCount,
  };
}

/**
 * Calculates Receptive to Productive Activation Ratio (R_act).
 */
export function calculateReceptiveToProductiveRatio(
  cards: CardStateRow[],
  recentLogsCount: number = 0,
): ReceptiveToProductiveMetric {
  const receptiveCards = cards.filter((c) => c.state === 'Review' || c.state === 'Mastered' || (c.stability ?? 0) >= 1.0);
  const receptiveCount = receptiveCards.length;

  // Productive cards: cards with repetition_count >= 2 and good stability
  const productiveCards = receptiveCards.filter((c) => (c.repetition_count ?? 0) >= 2 || c.state === 'Mastered');
  const productiveCount = Math.min(receptiveCount, productiveCards.length);

  const activationRatio = receptiveCount > 0
    ? Math.min(100, Math.round((productiveCount / receptiveCount) * 100))
    : 0;

  let statusMessage = 'Pasif Dağarcık Aşırı Yüksek: Kelimeleri tanıyorsunuz ancak henüz cümle içerisinde üretimsel kullanamıyorsunuz. Faz 3 (Pushed Output) çalışmasına ağırlık verin.';
  if (activationRatio >= 60) {
    statusMessage = 'Mükemmel Bilişsel Aktifleşme: Pasif dağarcığınızdaki kelimelerin çoğunu aktif yazımda başarıyla kullanıyorsunuz.';
  } else if (activationRatio >= 30) {
    statusMessage = 'Aktifleşme Yolu Açık: Kelime üretiminiz %60 hedefine doğru kararlılıkla ilerliyor.';
  }

  return {
    receptiveCount,
    productiveCount,
    activationRatio,
    targetRatio: 60,
    statusMessage,
    trendDirection: activationRatio >= 50 ? 'Up' : 'Stable',
  };
}

/**
 * Calculates Procedural Latency & Automation Index (I_proc).
 * Formula: I_proc = clamp(1 - (AvgLatencyMs - 800) / (3000 - 800), 0.0, 1.0)
 */
export function calculateLatencyAnalytics(
  cards: CardStateRow[],
  logs: ReviewLogRow[] = [],
): LatencyAnalyticsData {
  let totalWeightedLatency = 0;
  let totalReps = 0;

  for (const c of cards) {
    const reps = c.repetition_count ?? 0;
    if (reps > 0 && c.avg_latency_ms) {
      totalWeightedLatency += c.avg_latency_ms * reps;
      totalReps += reps;
    }
  }

  const currentAvgLatencyMs = totalReps > 0
    ? Math.round(totalWeightedLatency / totalReps)
    : 1800; // Default 1.8s benchmark

  // Automation Index computation
  const rawI = 1 - (currentAvgLatencyMs - 800) / (3000 - 800);
  const automationIndex = Number(Math.min(1.0, Math.max(0.0, rawI)).toFixed(2));
  const isAutomating = automationIndex >= 0.50;

  // Build history data points for time series graph
  const historyMap: Record<string, { totalMs: number; count: number }> = {};
  const today = new Date();

  // Create last 7 days slots
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const dateKey = d.toISOString().slice(0, 10);
    historyMap[dateKey] = { totalMs: 0, count: 0 };
  }

  logs.forEach((log) => {
    const dateKey = log.review_timestamp.slice(0, 10);
    if (dateKey in historyMap) {
      historyMap[dateKey].totalMs += currentAvgLatencyMs;
      historyMap[dateKey].count += 1;
    }
  });

  const history: LatencyDataPoint[] = Object.keys(historyMap).map((date) => {
    const item = historyMap[date];
    const val = item.count > 0 ? Math.round(item.totalMs / item.count) : currentAvgLatencyMs;
    return { date, avgLatencyMs: val };
  });

  return {
    currentAvgLatencyMs,
    automationIndex,
    history,
    isAutomating,
  };
}
