/**
 * components/flashcard/hooks/useLatencyTracker.ts
 * ─────────────────────────────────────────────────
 * Measures the elapsed time between card display and "Show Answer" click.
 * This latency value is later forwarded to the FSRS review engine as
 * the avg_latency_ms signal.
 *
 * Design notes:
 *  - Uses Date.now() (low overhead) rather than performance.now()
 *  - Interval ticks every 100 ms → display precision of ±100 ms is fine
 *  - capturedMs ref survives re-renders so the rating handler always has
 *    access to the frozen latency even after the interval is cleared.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface LatencyTracker {
  /** Live elapsed time in ms; updates every 100 ms while running. */
  elapsedMs: number;
  /** Whether the tracker is currently counting. */
  isRunning: boolean;
  /**
   * Ref holding the final captured latency (set by `stop()`).
   * Safe to read inside callbacks without stale-closure issues.
   */
  capturedMs: React.MutableRefObject<number>;
  /** Start (or restart) the timer. Call on card mount / next-card transition. */
  start: () => void;
  /**
   * Freeze the timer and return the final elapsed milliseconds.
   * Idempotent: calling stop() multiple times is safe.
   */
  stop: () => number;
  /** Reset all state — call when moving to the next card. */
  reset: () => void;
}

export function useLatencyTracker(): LatencyTracker {
  const startTimeRef = useRef<number | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturedMs   = useRef<number>(0);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  /** Clear the tick interval without side effects. */
  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTick();
    startTimeRef.current = Date.now();
    capturedMs.current   = 0;
    setElapsedMs(0);
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 100);
  }, [clearTick]);

  const stop = useCallback((): number => {
    clearTick();
    setIsRunning(false);

    if (startTimeRef.current !== null) {
      const ms           = Date.now() - startTimeRef.current;
      capturedMs.current = ms;
      setElapsedMs(ms);
      return ms;
    }
    return capturedMs.current;
  }, [clearTick]);

  const reset = useCallback(() => {
    clearTick();
    startTimeRef.current = null;
    capturedMs.current   = 0;
    setElapsedMs(0);
    setIsRunning(false);
  }, [clearTick]);

  // Cleanup on unmount
  useEffect(() => () => clearTick(), [clearTick]);

  return { elapsedMs, isRunning, capturedMs, start, stop, reset };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats milliseconds as `MM:SS` for the on-card stopwatch display.
 * @example formatElapsed(63_500) → "01:03"
 */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1_000);
  const minutes      = Math.floor(totalSeconds / 60);
  const seconds      = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
