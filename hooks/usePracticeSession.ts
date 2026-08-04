/**
 * hooks/usePracticeSession.ts
 * ────────────────────────────
 * Manages the live FSRS practice session queue and session statistics.
 *
 * Queue rules:
 *  - Rating 2 / 3 / 4  → card is removed (done for this session)
 *  - Rating 1 (Again)  → card is appended to the END of the queue with its
 *    updated FSRS state so it will be encountered again before the session ends.
 *
 * This hook is intentionally side-effect free: all I/O lives in
 * `submitCardReview` (called inside WordCard) and the results are passed in
 * via `handleCardReviewed`.
 */

import { useCallback, useMemo, useState } from 'react';
import type { LexicalItemRow, UserLexicalStateRow } from '@/types/database';
import type { SubmitReviewData } from '@/app/actions/review';

// =============================================================================
// PUBLIC TYPES
// =============================================================================

/** A fully hydrated card ready to be passed to <WordCard />. */
export interface SessionCard {
  /** Current FSRS scheduling state (updated after each review). */
  userState:        UserLexicalStateRow;
  /** Full lexical entry from LEXICAL_ITEMS. */
  lexicalItem:      LexicalItemRow;
  /**
   * Optional i+1 context sentence for the cloze exercise.
   * If absent WordCard falls back to `lexicalItem.l2_definition`.
   */
  contextSentence?: string;
  /** Module ID / number for global review mode badge. */
  module_id?:       number | null;
  /** Module display name for global review mode badge. */
  module_name?:     string | null;
}

/** Per-review accumulation counters (internal; derive display values from these). */
interface SessionStats {
  /** Number of cards in the initial queue (fixed at session start). */
  totalStarted:       number;
  /** Cards successfully cleared (ratings 2 / 3 / 4). */
  completedCount:     number;
  /** Times a card was rated 1 (Again). */
  lapseCount:         number;
  /** Total review events (completions + lapses). */
  reviewedCount:      number;
  /** Sum of all captured latency values in ms. */
  cumulativeLatencyMs: number;
  /** Reviews rated 3 (Good) or 4 (Easy). */
  successCount:       number;
}

/** Computed once when the queue empties — shown on the summary screen. */
export interface SessionSummary {
  /** Unique cards that were cleared (not counting re-reviews). */
  totalReviewed:    number;
  /** Mean latency across all review events in ms. */
  averageLatencyMs: number;
  /** Percentage of reviews rated Good or Easy (0–100). */
  successRate:      number;
  /** Total lapse events this session. */
  lapseCount:       number;
}

export interface UsePracticeSessionReturn {
  /** Current live queue (index 0 = active card). */
  queue:               SessionCard[];
  /** Convenience alias for `queue[0] ?? null`. */
  currentCard:         SessionCard | null;
  /**
   * True once the queue empties AND at least one card has been reviewed.
   * Triggers the session-complete summary screen.
   */
  isComplete:          boolean;
  /**
   * True when `initialCards` was empty — no cards were due today.
   * Triggers the empty-state screen without ever entering the review loop.
   */
  isIdle:              boolean;
  /** Live session counters for the info band. */
  stats:               SessionStats;
  /** Non-null only when `isComplete` is true. */
  summary:             SessionSummary | null;
  /**
   * 0–100 progress based on completedCount / totalStarted.
   * Lapses do not reduce progress — only completions advance it.
   */
  progressPercent:     number;
  /**
   * Call this from WordCard's `onNext` prop.
   * @param result     - Server Action return value (updated state + log).
   * @param latencyMs  - Recall latency frozen by useLatencyTracker.
   */
  handleCardReviewed:  (result: SubmitReviewData, latencyMs: number) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function usePracticeSession(
  initialCards: SessionCard[],
): UsePracticeSessionReturn {
  // Shallow-copy so external mutations don't affect our queue.
  const [queue, setQueue] = useState<SessionCard[]>(() => [...initialCards]);

  const [stats, setStats] = useState<SessionStats>({
    totalStarted:        initialCards.length,
    completedCount:      0,
    lapseCount:          0,
    reviewedCount:       0,
    cumulativeLatencyMs: 0,
    successCount:        0,
  });

  // ── Derived values ──────────────────────────────────────────────────────────
  const currentCard   = queue[0] ?? null;
  const isIdle        = initialCards.length === 0;
  const isComplete    = !isIdle && queue.length === 0 && stats.reviewedCount > 0;
  const progressPercent = stats.totalStarted > 0
    ? Math.min(100, Math.round((stats.completedCount / stats.totalStarted) * 100))
    : 0;

  // ── Queue mutation ──────────────────────────────────────────────────────────
  const handleCardReviewed = useCallback(
    (result: SubmitReviewData, latencyMs: number) => {
      const rating    = result.reviewLog.rating as 1 | 2 | 3 | 4;
      const isLapse   = rating === 1;
      const isSuccess = rating >= 3;

      setQueue((prev) => {
        if (prev.length === 0) return prev;
        const [first, ...rest] = prev;

        if (isLapse) {
          // Re-append with updated FSRS state so the next encounter uses
          // freshly recalculated stability / difficulty values.
          const requeued: SessionCard = {
            ...first,
            userState: result.updatedState,
          };
          return [...rest, requeued];
        }
        // Success: card is cleared for this session.
        return rest;
      });

      setStats((prev) => ({
        ...prev,
        completedCount:       isLapse ? prev.completedCount : prev.completedCount + 1,
        lapseCount:           prev.lapseCount + (isLapse ? 1 : 0),
        reviewedCount:        prev.reviewedCount + 1,
        cumulativeLatencyMs:  prev.cumulativeLatencyMs + latencyMs,
        successCount:         prev.successCount + (isSuccess ? 1 : 0),
      }));
    },
    [],
  );

  // ── Session summary (memoised, only valid when isComplete) ─────────────────
  const summary = useMemo<SessionSummary | null>(() => {
    if (!isComplete || stats.reviewedCount === 0) return null;

    return {
      totalReviewed:    stats.completedCount,
      averageLatencyMs: Math.round(stats.cumulativeLatencyMs / stats.reviewedCount),
      successRate:      Math.round((stats.successCount / stats.reviewedCount) * 100),
      lapseCount:       stats.lapseCount,
    };
  }, [isComplete, stats]);

  return {
    queue,
    currentCard,
    isComplete,
    isIdle,
    stats,
    summary,
    progressPercent,
    handleCardReviewed,
  };
}
