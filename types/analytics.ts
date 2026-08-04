/**
 * types/analytics.ts
 * ──────────────────
 * Type definitions for Advanced Cognitive Analytics & Metacognition Panel:
 *  - Stability Matrix Data (Learning, Review, Mastered buckets)
 *  - Receptive to Productive Activation Ratio (R_act)
 *  - Procedural Latency Analytics & Automation Index (I_proc)
 */

export interface StabilityMatrixData {
  learningCount:       number; // S < 1 day (#F59E0B)
  learningPercentage:  number;
  reviewCount:         number; // 1 <= S < 365 days (#3B82F6)
  reviewPercentage:    number;
  masteredCount:       number; // S >= 365 days (#10B981)
  masteredPercentage:  number;
  totalCount:          number;
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
