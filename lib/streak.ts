/**
 * lib/streak.ts
 * ──────────────
 * Smart Streak Discipline & Streak Freeze Credit System
 *
 * Qualification Criteria:
 *  - is_qualified_for_streak = true when:
 *      a) User completes >= 80% of today's due FSRS review queue, OR
 *      b) User completes all 4 phases of the daily cognitive routine.
 *
 * Streak Freeze Logic:
 *  - If user misses a day:
 *      * If streak_freeze_credits > 0 → consume 1 credit, keep streak intact, return freezeUsedToday = true.
 *      * If streak_freeze_credits == 0 → reset streak to 0.
 */

export interface StreakEvaluationResult {
  currentStreakDays:    number;
  streakFreezeCredits:  number;
  isQualifiedToday:     boolean;
  freezeUsedToday:      boolean;
  notificationMessage:  string | null;
}

export interface EvaluateStreakParams {
  completedQueueCount:   number;
  totalDueQueueCount:    number;
  all4PhasesCompleted:   boolean;
  lastActiveDateISO:     string | null;
  storedStreakDays:      number;
  storedFreezeCredits:   number;
  now?:                  Date;
}

export function evaluateStreakSystem({
  completedQueueCount,
  totalDueQueueCount,
  all4PhasesCompleted,
  lastActiveDateISO,
  storedStreakDays,
  storedFreezeCredits,
  now = new Date(),
}: EvaluateStreakParams): StreakEvaluationResult {
  // 1. Evaluate qualification for today
  const queueRatio = totalDueQueueCount > 0 ? completedQueueCount / totalDueQueueCount : 1.0;
  const isQualifiedToday = all4PhasesCompleted || (totalDueQueueCount > 0 && queueRatio >= 0.80) || (totalDueQueueCount === 0 && completedQueueCount > 0);

  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);

  let currentStreakDays = storedStreakDays;
  let streakFreezeCredits = storedFreezeCredits;
  let freezeUsedToday = false;
  let notificationMessage: string | null = null;

  if (!lastActiveDateISO) {
    // First time user
    if (isQualifiedToday) {
      currentStreakDays = 1;
    }
  } else {
    const lastActiveStr = lastActiveDateISO.slice(0, 10);

    if (lastActiveStr === todayStr) {
      // Already evaluated today
      if (isQualifiedToday && storedStreakDays === 0) {
        currentStreakDays = 1;
      }
    } else if (lastActiveStr === yesterdayStr) {
      // Active yesterday — continue streak if qualified today
      if (isQualifiedToday) {
        currentStreakDays = storedStreakDays + 1;
      }
    } else {
      // Missed at least 1 full day
      const daysMissed = Math.floor((now.getTime() - new Date(lastActiveDateISO).getTime()) / (1000 * 60 * 60 * 24));

      if (daysMissed >= 2) {
        if (streakFreezeCredits > 0) {
          // Consume 1 Freeze Credit to protect streak!
          streakFreezeCredits -= 1;
          freezeUsedToday = true;
          notificationMessage = 'Seriniz Dondurma Hakkı ile Korundu 🧊';
          if (isQualifiedToday) {
            currentStreakDays = storedStreakDays + 1;
          }
        } else {
          // Reset streak
          currentStreakDays = isQualifiedToday ? 1 : 0;
          notificationMessage = 'Geçmiş gün seansı tamamlanmadığı için seri sıfırlandı.';
        }
      }
    }
  }

  return {
    currentStreakDays,
    streakFreezeCredits,
    isQualifiedToday,
    freezeUsedToday,
    notificationMessage,
  };
}
