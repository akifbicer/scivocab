/**
 * types/analytics.ts
 * ──────────────────
 * Type definitions for Advanced Cognitive Analytics & Metacognition Panel:
 *  - Stability Matrix Data (Learning, Review, Mastered buckets)
 *  - Receptive to Productive Activation Ratio (R_act)
 *  - Procedural Latency Analytics & Automation Index (I_proc)
 */

export interface StabilityMatrixData {
  learningCount:           number; // 1. Öğrenim (S < 1 day)
  learningPercentage:      number;
  earlyReviewCount:        number; // 2. Erken Tekrar (1 <= S < 7 days)
  earlyReviewPercentage:   number;
  consolidationCount:     number; // 3. Pekiştirme (7 <= S < 30 days)
  consolidationPercentage: number;
  longTermCount:          number; // 4. Uzun Vadeli (30 <= S < 365 days)
  longTermPercentage:     number;
  masteredCount:          number; // 5. Master (S >= 365 days)
  masteredPercentage:      number;
  totalCount:              number;
}

export interface ReceptiveToProductiveMetric {
  receptiveCount:      number; // Words in Review or Mastered states
  productiveCount:     number; // Words used in Phase 3 / AI Writing in last 30 days
  activationRatio:     number; // R_act = (Productive / Receptive) * 100
  targetRatio:         number; // 60% benchmark target
  statusMessage:       string; // Metacognitive callout rule message
  trendDirection:      'Up' | 'Down' | 'Stable';
}

export interface LatencyDataPoint {
  date:         string; // YYYY-MM-DD
  avgLatencyMs: number;
}

export interface LatencyAnalyticsData {
  currentAvgLatencyMs: number;
  automationIndex:     number; // I_proc (0.0 to 1.0)
  history:             LatencyDataPoint[];
  isAutomating:        boolean; // True if I_proc >= 0.50
}
