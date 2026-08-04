/**
 * lib/fsrs.ts
 * ────────────
 * FSRS-6 (Free Spaced Repetition Scheduler - Version 6) Engine
 * Pure mathematical computation and state transition engine for SciVocab.
 *
 * Implements the full FSRS-6 specifications:
 *  - Retrievability: R(t, S) = (1 + FACTOR * (t / S))^FSRS_DECAY
 *  - Initial Stability & Difficulty for New cards
 *  - Difficulty update: D_new = w7 * D_mean + (1 - w7) * (D - w6 * (rating - 3))
 *  - Next Stability on Recall (rating >= 2)
 *  - Next Stability on Lapse (rating == 1)
 *  - State transitions: New, Learning, Review, Re-learning, Mastered (S >= 365)
 */

import type {
  UserLexicalStateRow,
  UserLexicalStateUpdate,
  ReviewLogInsert,
  InteractionEnum,
  StateEnum,
} from '@/types/database';

// =============================================================================
// ENUMS & TYPES
// =============================================================================

export type Rating = 1 | 2 | 3 | 4;

export enum CardRating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export type CardState = 'New' | 'Learning' | 'Review' | 'Re-learning' | 'Mastered';

export interface LexicalState {
  state: CardState | StateEnum;
  stability: number;
  difficulty: number;
  last_review_date: string | null;
  next_review_date: string | null;
  lapses: number;
  repetition_count: number;
  avg_latency_ms: number;
}

export interface FSRSState {
  stability: number;
  difficulty: number;
  lastReview: number;
  nextReview: number;
}

// =============================================================================
// FSRS-6 PARAMETERS & WEIGHTS (21 Weights Vector: w0 - w20)
// =============================================================================

export const DEFAULT_WEIGHTS: number[] = [
  0.40255,  // w0: Initial stability for Again (1)
  1.18385,  // w1: Initial stability for Hard (2)
  3.17300,  // w2: Initial stability for Good (3)
  15.69105, // w3: Initial stability for Easy (4)
  7.19490,  // w4: Initial difficulty mean (D0 Good)
  0.53450,  // w5: Initial difficulty slope
  1.46040,  // w6: Difficulty update rating multiplier
  0.00460,  // w7: Difficulty mean revision weight
  1.54570,  // w8: Recall stability exponent factor
  0.11920,  // w9: Recall stability decay
  1.01920,  // w10: Recall stability retrievability factor
  1.93950,  // w11: Lapse stability coefficient
  0.11000,  // w12: Lapse difficulty exponent
  0.29605,  // w13: Lapse stability exponent
  2.26980,  // w14: Lapse retrievability exponent
  0.23150,  // w15: Hard penalty factor
  2.98980,  // w16: Easy bonus factor
  0.51655,  // w17: Reserved parameter
  0.66210,  // w18: Reserved parameter
  0.61330,  // w19: Reserved parameter
  0.27560,  // w20: Reserved parameter
];

/** FSRS Decay exponent constant (typically -0.5). */
export const FSRS_DECAY = -0.5;

/** FACTOR = (0.9)^(1 / FSRS_DECAY) - 1 = (0.9)^(-2) - 1 = (19 / 81) ≈ 0.2345679 */
export const FACTOR = Math.pow(0.9, 1 / FSRS_DECAY) - 1;

/** Desired retention probability (90%). */
export const TARGET_RETENTION = 0.90;

// =============================================================================
// MATHEMATICAL HELPER FUNCTIONS
// =============================================================================

/**
 * Calculates current Retrievability R(t, S): expected probability of recall.
 * @param elapsedDays - Days since last review.
 * @param stability - Current stability S (expected days to 90% retention).
 */
export function calculateRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + FACTOR * (t / stability), FSRS_DECAY);
}

/**
 * Calculates initial difficulty D0 for a brand new item.
 * D0(rating) = w4 - w5 * (rating - 3), clamped to [1.0, 10.0].
 */
export function calculateInitialDifficulty(rating: Rating, w = DEFAULT_WEIGHTS): number {
  const d0 = w[4] - w[5] * (rating - 3);
  return Math.min(10.0, Math.max(1.0, d0));
}

/**
 * Updates item difficulty D based on review rating.
 * D_new = w7 * D0(3) + (1 - w7) * (D - w6 * (rating - 3)), clamped to [1.0, 10.0].
 */
export function updateDifficulty(currentD: number, rating: Rating, w = DEFAULT_WEIGHTS): number {
  const dMean = w[4];
  const dRaw = currentD - w[6] * (rating - 3);
  const dNew = w[7] * dMean + (1 - w[7]) * dRaw;
  return Math.min(10.0, Math.max(1.0, dNew));
}

/**
 * Calculates next stability on successful recall (rating >= 2).
 * S_new = S * (1 + exp(w8) * (11 - D) * S^(-w9) * (exp((1 - R) * w10) - 1) * rating_factor)
 */
export function calculateNextStability(
  stability: number,
  difficulty: number,
  retrievability: number,
  rating: Rating,
  w = DEFAULT_WEIGHTS,
): number {
  if (stability <= 0) return w[rating - 1] ?? 1.0;

  const R = Math.min(1.0, Math.max(0.01, retrievability));
  const D = Math.min(10.0, Math.max(1.0, difficulty));

  let ratingFactor = 1.0;
  if (rating === 2) ratingFactor = w[15]; // Hard penalty
  else if (rating === 4) ratingFactor = w[16]; // Easy bonus

  const multiplier =
    1 +
    Math.exp(w[8]) *
      (11 - D) *
      Math.pow(stability, -w[9]) *
      (Math.exp((1 - R) * w[10]) - 1) *
      ratingFactor;

  return Math.max(0.1, stability * multiplier);
}

/**
 * Calculates stability after a lapse / forget event (rating == 1).
 * S_lapse = w11 * D^(-w12) * ((S + 1)^w13 - 1) * exp((1 - R) * w14)
 */
export function calculateLapseStability(
  stability: number,
  difficulty: number,
  retrievability: number,
  w = DEFAULT_WEIGHTS,
): number {
  const R = Math.min(1.0, Math.max(0.01, retrievability));
  const D = Math.min(10.0, Math.max(1.0, difficulty));

  const sLapse =
    w[11] *
    Math.pow(D, -w[12]) *
    (Math.pow(stability + 1, w[13]) - 1) *
    Math.exp((1 - R) * w[14]);

  return Math.min(Math.max(0.1, sLapse), Math.max(0.1, stability));
}

/**
 * Converts stability S to recommended next review interval in days.
 */
export function calculateIntervalDays(stability: number): number {
  if (stability <= 0) return 1;
  // Interval to achieve TARGET_RETENTION (90%)
  const interval = Math.round((stability / FACTOR) * (Math.pow(TARGET_RETENTION, 1 / FSRS_DECAY) - 1));
  return Math.max(1, interval);
}

// =============================================================================
// MAIN FSRS-6 DECISION ENGINE
// =============================================================================

/**
 * Processes a review event for a lexical item, executing FSRS-6 state transitions
 * and returning the updated scheduling state and immutable log entry payload.
 */
export function processReview(
  currentState: UserLexicalStateRow,
  rating: Rating,
  latencyMs: number,
  interactionType?: InteractionEnum,
  reviewedAt: Date = new Date(),
  w = DEFAULT_WEIGHTS,
): {
  stateUpdate: UserLexicalStateUpdate;
  logPayload: ReviewLogInsert;
} {
  const isNewCard =
    !currentState.last_review_date ||
    currentState.state === 'New' ||
    currentState.repetition_count === 0;

  // 1. Calculate elapsed days since last review
  const elapsedDays = currentState.last_review_date
    ? Math.max(
        0,
        (reviewedAt.getTime() - new Date(currentState.last_review_date).getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  let newStability: number;
  let newDifficulty: number;
  let nextState: StateEnum;
  let nextLapses = currentState.lapses || 0;

  if (isNewCard) {
    // ── NEW CARD INITIALIZATION ─────────────────────────────────────────────
    newStability = w[rating - 1] ?? 1.0;
    newDifficulty = calculateInitialDifficulty(rating, w);

    if (rating === 1) {
      nextState = 'Learning';
      nextLapses = 1;
    } else {
      nextState = 'Review';
    }
  } else {
    // ── EXISTING CARD REVIEW ────────────────────────────────────────────────
    const currentS = currentState.stability || w[2];
    const currentD = currentState.difficulty || w[4];

    // Compute current retrievability
    const R = calculateRetrievability(elapsedDays, currentS);

    // Update difficulty
    newDifficulty = updateDifficulty(currentD, rating, w);

    if (rating === 1) {
      // Lapse (Forgot)
      newStability = calculateLapseStability(currentS, newDifficulty, R, w);
      nextLapses += 1;
      nextState = 'Re-learning';
    } else {
      // Recall Success (Hard / Good / Easy)
      newStability = calculateNextStability(currentS, newDifficulty, R, rating, w);
      nextState = newStability >= 365 ? 'Mastered' : 'Review';
    }
  }

  // Calculate next interval in days
  const intervalDays = rating === 1 ? 0.007 : calculateIntervalDays(newStability); // ~10 mins for lapse, else days
  const nextReviewDate = new Date(reviewedAt.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  // Repetition count & latency rolling average
  const newRepCount = (currentState.repetition_count || 0) + 1;
  const oldAvgLatency = currentState.avg_latency_ms || 0;
  const newAvgLatency = Math.round((oldAvgLatency * (newRepCount - 1) + latencyMs) / newRepCount);

  // Scheduled days for audit log
  const scheduledDays = currentState.next_review_date && currentState.last_review_date
    ? Math.max(
        0,
        Math.round(
          (new Date(currentState.next_review_date).getTime() - new Date(currentState.last_review_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : Math.round(intervalDays);

  const stateUpdate: UserLexicalStateUpdate = {
    state: nextState,
    stability: Number(newStability.toFixed(4)),
    difficulty: Number(newDifficulty.toFixed(4)),
    last_review_date: reviewedAt.toISOString(),
    next_review_date: nextReviewDate.toISOString(),
    lapses: nextLapses,
    repetition_count: newRepCount,
    avg_latency_ms: newAvgLatency,
  };

  const logPayload: ReviewLogInsert = {
    user_state_id: currentState.id,
    rating,
    elapsed_days: Math.round(elapsedDays),
    scheduled_days: scheduledDays,
    review_timestamp: reviewedAt.toISOString(),
    interaction_type: interactionType ?? 'ActiveRecall',
  };

  return { stateUpdate, logPayload };
}

/**
 * Backward compatibility helper function for API endpoints.
 */
export function calculateInterval(
  state: FSRSState,
  ratingStr: 'Again' | 'Hard' | 'Good' | 'Easy',
): FSRSState {
  const ratingMap: Record<string, Rating> = { Again: 1, Hard: 2, Good: 3, Easy: 4 };
  const rating = ratingMap[ratingStr] ?? 3;
  const now = new Date();

  const dummyRow: UserLexicalStateRow = {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: '00000000-0000-0000-0000-000000000000',
    lexical_item_id: '00000000-0000-0000-0000-000000000000',
    state: 'Review',
    stability: state.stability,
    difficulty: state.difficulty,
    last_review_date: new Date(state.lastReview).toISOString(),
    next_review_date: new Date(state.nextReview).toISOString(),
    lapses: 0,
    repetition_count: 1,
    avg_latency_ms: 0,
  };

  const { stateUpdate } = processReview(dummyRow, rating, 1000, 'ActiveRecall', now);

  return {
    stability: stateUpdate.stability ?? state.stability,
    difficulty: stateUpdate.difficulty ?? state.difficulty,
    lastReview: now.getTime(),
    nextReview: stateUpdate.next_review_date ? new Date(stateUpdate.next_review_date).getTime() : now.getTime(),
  };
}
