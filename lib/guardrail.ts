/**
 * lib/guardrail.ts
 * ─────────────────
 * Cognitive Load Guardrail & 30-Day FSRS Load Simulator
 *
 * Provides accurate mathematical projections for vocabulary learning pace:
 *  - 30-Day Pool: T30 = 30 * N
 *  - Day 30 Estimated Daily Reviews: R30 = Math.round(N * 6.5)
 *  - Day 30 Estimated Total Daily Time (mins): Dtime = Math.round((N * 0.5) + (R30 * 0.1))
 *  - Risk Levels:
 *      N <= 10  → Green (Risk 5%, "Mükemmel Sürdürülebilirlik")
 *      11-20    → Yellow (Risk 50%, "Sürdürmesi Zor")
 *      N > 20   → Red (Risk 90%, "Kritik Bilişsel Kilitlenme")
 */

export type LimitOption = 5 | 10 | 15 | 20 | 30 | 50;

export type RiskLevel = 'Optimal' | 'Warning' | 'Critical';

export interface CognitiveLoadSimulation {
  dailyNewWords:        number;       // N
  pool30Days:           number;       // T30 = 30 * N
  dailyReviewsDay30:    number;       // R30 = Math.round(N * 6.5)
  dailyMinutesDay30:    number;       // Dtime = Math.round((N * 0.5) + (R30 * 0.1))
  riskPercentage:       number;       // 5%, 50%, or 90%
  sustainabilityRate:   number;       // 95%, 50%, or 10%
  riskLevel:            RiskLevel;
  riskTitle:            string;
  riskDescription:      string;
  badgeText:            string;
  colorTheme: {
    border:     string;
    bg:         string;
    text:       string;
    badgeBg:    string;
    badgeText:  string;
    barColor:   string;
  };
}

export const LIMIT_OPTIONS: LimitOption[] = [5, 10, 15, 20, 30, 50];

export const DEFAULT_DAILY_LIMIT: LimitOption = 10;

/**
 * Calculates 30-day cognitive review load projections and risk metrics.
 */
export function simulateCognitiveLoad(n: number): CognitiveLoadSimulation {
  const N = Math.max(1, Math.round(n));
  const pool30Days = 30 * N;
  const dailyReviewsDay30 = Math.round(N * 6.5);
  const dailyMinutesDay30 = Math.round(N * 0.5 + dailyReviewsDay30 * 0.1);

  let riskLevel: RiskLevel = 'Optimal';
  let riskPercentage = 5;
  let sustainabilityRate = 95;
  let riskTitle = 'Mükemmel Sürdürülebilirlik';
  let riskDescription = 'Hafıza yükü dengeli. Uzun vadeli akademik hafıza oluşumu için ideal tempo.';
  let badgeText = N === 10 ? 'Önerilen / Optimal Band' : 'Düşük Risk';

  let colorTheme = {
    border:    'border-emerald-800/60',
    bg:        'bg-emerald-950/20',
    text:      'text-emerald-400',
    badgeBg:   'bg-emerald-950/90 border-emerald-700',
    badgeText: 'text-emerald-300',
    barColor:  'bg-emerald-500',
  };

  if (N >= 11 && N <= 20) {
    riskLevel = 'Warning';
    riskPercentage = 50;
    sustainabilityRate = 50;
    riskTitle = 'Sürdürmesi Zor / Yüksek Yük';
    riskDescription = '1. aydan sonra günlük tekrar yükü 100+ kartı aşabilir. Günlük düzenli 20-30 dakika gerektirir.';
    badgeText = 'Orta Risk';
    colorTheme = {
      border:    'border-amber-800/60',
      bg:        'bg-amber-950/20',
      text:      'text-amber-400',
      badgeBg:   'bg-amber-950/90 border-amber-700',
      badgeText: 'text-amber-300',
      barColor:  'bg-amber-500',
    };
  } else if (N > 20) {
    riskLevel = 'Critical';
    riskPercentage = 90;
    sustainabilityRate = 10;
    riskTitle = 'Kritik Bilişsel Kilitlenme';
    riskDescription = 'Yüksek kart yığılması nedeniyle 3. ayda vazgeçme ihtimali %90. Günlük 45+ dk çalışma gerektirir.';
    badgeText = 'Yüksek Aşırı Yük Riski';
    colorTheme = {
      border:    'border-rose-800/60',
      bg:        'bg-rose-950/20',
      text:      'text-rose-400',
      badgeBg:   'bg-rose-950/90 border-rose-700',
      badgeText: 'text-rose-300',
      barColor:  'bg-rose-500',
    };
  }

  return {
    dailyNewWords: N,
    pool30Days,
    dailyReviewsDay30,
    dailyMinutesDay30,
    riskPercentage,
    sustainabilityRate,
    riskLevel,
    riskTitle,
    riskDescription,
    badgeText,
    colorTheme,
  };
}

// LocalStorage Persistence Helper
const STORAGE_KEY = 'scivocab_daily_word_limit';

export function getStoredDailyLimit(): LimitOption {
  if (typeof window === 'undefined') return DEFAULT_DAILY_LIMIT;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val) return DEFAULT_DAILY_LIMIT;
    const parsed = parseInt(val, 10);
    if (LIMIT_OPTIONS.includes(parsed as LimitOption)) {
      return parsed as LimitOption;
    }
  } catch {}
  return DEFAULT_DAILY_LIMIT;
}

export function saveStoredDailyLimit(limit: LimitOption): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(limit));
  } catch {}
}
