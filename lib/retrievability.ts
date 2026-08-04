/**
 * lib/retrievability.ts
 * ───────────────────────
 * Instant Memory Retrievability ($R_{avg}$) Calculation Engine
 *
 * Calculates the exact instantaneous retrievability R_i(t) for every active card
 * in stable memory (1 <= S < 365) using the FSRS-6 retrievability decay equation:
 *    R_i(t) = (1 + FACTOR * (t_i / S_i))^FSRS_DECAY
 *
 * Status Thresholds:
 *  - R_avg >= 90%: Green  (Mükemmel Hafıza Korunumu / Minimal Unutma)
 *  - 80% <= R_avg < 90%: Yellow (Orta Seviye Hafıza Aşınması)
 *  - R_avg < 80%: Red   (Kritik Hafıza Kaybı Riski / Acil Tekrar Gerekli)
 */

import type { RetrievabilityStatus } from '@/types/session';

export const FSRS_DECAY = -0.5;
export const FACTOR = Math.pow(0.9, 1 / FSRS_DECAY) - 1; // 19 / 81 ≈ 0.2345679

export interface RetrievabilityCalculation {
  averageRetrievability: number; // 0–100%
  status:                RetrievabilityStatus;
  activeCardsCount:      number;
  decayedCardsCount:     number; // Cards with R_i < 0.80
  statusTitle:           string;
  statusDescription:     string;
  colorTheme: {
    text:        string;
    border:      string;
    bg:          string;
    ring:        string;
    badgeBg:     string;
    badgeText:   string;
    gradientFrom: string;
    gradientTo:   string;
  };
}

/**
 * Calculates item-level retrievability R_i(t) for a given card row.
 */
export function calculateItemRetrievability(
  stability: number,
  lastReviewDateISO: string | null,
  now: Date = new Date(),
): number {
  if (!lastReviewDateISO || stability <= 0) return 1.0;
  const lastReviewTime = new Date(lastReviewDateISO).getTime();
  const elapsedDays = Math.max(0, (now.getTime() - lastReviewTime) / (1000 * 60 * 60 * 24));
  const r = Math.pow(1 + FACTOR * (elapsedDays / stability), FSRS_DECAY);
  return Math.min(1.0, Math.max(0.0, r));
}

/**
 * Computes average retrievability ($R_{avg}$) across all active deck items (1 <= S < 365).
 */
export function calculateAverageRetrievability(
  cards: Array<{ stability: number | null; last_review_date: string | null; state: string }>,
  now: Date = new Date(),
): RetrievabilityCalculation {
  // Active cards: cards that have been learned/reviewed (stability >= 1.0 and state != 'Mastered')
  const activeCards = cards.filter(
    (c) => (c.stability ?? 0) >= 1.0 && c.state !== 'Mastered',
  );

  if (activeCards.length === 0) {
    return {
      averageRetrievability: 100,
      status: 'Green',
      activeCardsCount: 0,
      decayedCardsCount: 0,
      statusTitle: 'Hafıza Korunumu %100 (Optimal)',
      statusDescription: 'Henüz tekrar bekleyen kart bulunmuyor. Yeni bir seans başlatarak hafızanızı taze tutabilirsiniz.',
      colorTheme: {
        text:         'text-emerald-400',
        border:       'border-emerald-800/60',
        bg:           'bg-emerald-950/20',
        ring:         'ring-emerald-500',
        badgeBg:      'bg-emerald-950/90 border-emerald-700',
        badgeText:    'text-emerald-300',
        gradientFrom: '#10b981',
        gradientTo:    '#059669',
      },
    };
  }

  let totalR = 0;
  let decayedCount = 0;

  for (const card of activeCards) {
    const r_i = calculateItemRetrievability(card.stability!, card.last_review_date, now);
    totalR += r_i;
    if (r_i < 0.80) {
      decayedCount++;
    }
  }

  const avgRatio = totalR / activeCards.length;
  const averageRetrievability = Math.min(100, Math.max(0, Math.round(avgRatio * 100)));

  let status: RetrievabilityStatus = 'Green';
  let statusTitle = 'Mükemmel Hafıza Korunumu';
  let statusDescription = 'Hafıza tutulumunuz %90 üstünde. Kelimeler uzun süreli bellekte stabil olarak saklanıyor.';
  let colorTheme = {
    text:         'text-emerald-400',
    border:       'border-emerald-800/60',
    bg:           'bg-emerald-950/20',
    ring:         'ring-emerald-500',
    badgeBg:      'bg-emerald-950/90 border-emerald-700',
    badgeText:    'text-emerald-300',
    gradientFrom: '#10b981',
    gradientTo:    '#059669',
  };

  if (averageRetrievability >= 80 && averageRetrievability < 90) {
    status = 'Yellow';
    statusTitle = 'Orta Seviye Hafıza Aşınması';
    statusDescription = 'Bazı kelimelerde hatırlama olasılığı düşmeye başladı. Tekrar seansını başlatmanız önerilir.';
    colorTheme = {
      text:         'text-amber-400',
      border:       'border-amber-800/60',
      bg:           'bg-amber-950/20',
      ring:         'ring-amber-500',
      badgeBg:      'bg-amber-950/90 border-amber-700',
      badgeText:    'text-amber-300',
      gradientFrom: '#f59e0b',
      gradientTo:    '#d97706',
    };
  } else if (averageRetrievability < 80) {
    status = 'Red';
    statusTitle = 'Kritik Hafıza Kaybı Riski';
    statusDescription = 'Hafıza tutulumu %80 altına düştü. Kelimeleri unutmamak için acilen FSRS tekrar seansını tamamlayın!';
    colorTheme = {
      text:         'text-rose-400',
      border:       'border-rose-800/60',
      bg:           'bg-rose-950/20',
      ring:         'ring-rose-500',
      badgeBg:      'bg-rose-950/90 border-rose-700',
      badgeText:    'text-rose-300',
      gradientFrom: '#f43f5e',
      gradientTo:    '#e11d48',
    };
  }

  return {
    averageRetrievability,
    status,
    activeCardsCount: activeCards.length,
    decayedCardsCount: decayedCount,
    statusTitle,
    statusDescription,
    colorTheme,
  };
}
