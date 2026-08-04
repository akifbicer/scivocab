/**
 * types/session.ts
 * ─────────────────
 * Type definitions for the 4-Phase Daily Cognitive Session Routine,
 * Retrievability Metrics ($R_{avg}$), and Smart Streak Discipline system.
 */

export enum SessionPhase {
  NotStarted = 0,
  Phase1_ActiveRecall = 1,      // 15 Mins: FSRS Spaced Repetition Review
  Phase2_ContextualInput = 2,   // 25 Mins: Reading & Contextual Passage Analysis
  Phase3_PushedOutput = 3,      // 15 Mins: Active Writing & Production (AI Feedback)
  Phase4_MetacognitiveCoaching = 4, // 5 Mins: Metacognitive Self-Evaluation & AI Coaching
  Completed = 5,
}

export interface DailySessionState {
  currentPhase:          SessionPhase;
  phase1Completed:       boolean;
  phase2Completed:       boolean;
  phase3Completed:       boolean;
  phase4Completed:       boolean;
  completedCardsCount:   number;
  targetCardsCount:      number;
  isStreakQualified:     boolean;
  startedAt:             string | null;
  completedAt:           string | null;
}

export type RetrievabilityStatus = 'Green' | 'Yellow' | 'Red';

export interface CognitiveDashboardMetrics {
  averageRetrievability:   number;                // R_avg (0–100%)
  retrievabilityStatus:    RetrievabilityStatus; // Green (>=90%), Yellow (80-89%), Red (<80%)
  activeCardsCount:        number;                // Cards with 1 <= S < 365
  dueCardsCount:           number;                // Overdue cards awaiting review today
  currentStreakDays:       number;                // Consecutive daily streak count
  streakFreezeCredits:     number;                // Available Freeze credits (e.g. 1-3)
  isStreakQualifiedToday:  boolean;               // True if today's streak criteria is met
  freezeUsedToday:         boolean;               // True if freeze credit was used to save streak
}
