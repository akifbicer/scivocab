/**
 * components/consolidation/TranslationConsolidationView.tsx
 * ───────────────────────────────────────────────────────────
 * Stage 2: Turkish -> English Sentence Translation Consolidation Exercise.
 * Features:
 *  - Turkish prompt sentence
 *  - Textarea with Enter / Ctrl+Enter shortcuts
 *  - Flexible fuzzy matching + target word verification
 *  - Transparent "Şimdi Atla" (Skip) button at top right
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import type { TranslationQuestion } from '@/lib/data/consolidation-data';

interface TranslationConsolidationViewProps {
  moduleNumber: number;
  questions: TranslationQuestion[];
  onCompleteStage2: (score: number, failedWords: string[]) => void;
  onSkip: () => void;
}

/** Helper: Normalize string for flexible matching */
function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Helper: Calculate token overlap similarity score (0 to 100) */
function calculateTranslationMatch(userStr: string, targetStr: string, targetWord: string): {
  isTargetWordPresent: boolean;
  matchScore: number;
} {
  const normUser = normalizeStr(userStr);
  const normTarget = normalizeStr(targetStr);
  const normWord = normalizeStr(targetWord);

  const isTargetWordPresent = normWord.length > 0 ? normUser.includes(normWord) : true;

  const userTokens = new Set(normUser.split(' ').filter(Boolean));
  const targetTokens = normTarget.split(' ').filter(Boolean);

  if (targetTokens.length === 0) {
    return { isTargetWordPresent, matchScore: 100 };
  }

  let matchCount = 0;
  for (const token of targetTokens) {
    if (userTokens.has(token)) {
      matchCount++;
    }
  }

  let matchScore = Math.round((matchCount / targetTokens.length) * 100);
  if (isTargetWordPresent && matchScore >= 40) {
    matchScore = Math.max(matchScore, 70); // boost if target word used
  }

  return { isTargetWordPresent, matchScore };
}

export function TranslationConsolidationView({
  moduleNumber,
  questions,
  onCompleteStage2,
  onSkip,
}: TranslationConsolidationViewProps) {
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [checkedStatus, setCheckedStatus] = useState<Record<string, boolean>>({});

  const handleInputChange = (qId: string, val: string) => {
    setUserInputs((prev) => ({ ...prev, [qId]: val }));
    if (checkedStatus[qId]) {
      setCheckedStatus((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const handleCheckQuestion = (qId: string) => {
    setCheckedStatus((prev) => ({ ...prev, [qId]: true }));
  };

  const handleCheckAll = () => {
    const newChecked: Record<string, boolean> = {};
    questions.forEach((q) => {
      newChecked[q.id] = true;
    });
    setCheckedStatus(newChecked);
  };

  const handleFinish = () => {
    handleCheckAll();

    let totalMatchPct = 0;
    const failedWords: string[] = [];

    questions.forEach((q) => {
      const val = userInputs[q.id] || '';
      const { isTargetWordPresent, matchScore } = calculateTranslationMatch(val, q.englishSentence, q.targetWord);
      totalMatchPct += matchScore;

      if (!isTargetWordPresent || matchScore < 50) {
        if (q.targetWord) failedWords.push(q.targetWord);
      }
    });

    const score = questions.length > 0 ? Math.round(totalMatchPct / questions.length) : 100;
    onCompleteStage2(score, failedWords);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 text-zinc-100">
      {/* ── Top Header Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
            Modül {moduleNumber} Pekiştirme — Aşama 2 / 2
          </span>
          <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
            TR ➔ EN Cümle Çevirisi (Sentence Translation)
          </h1>
        </div>

        {/* Top Right Transparent Skip Button */}
        <button
          type="button"
          onClick={onSkip}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
        >
          <X size={14} />
          <span>Şimdi Atla</span>
        </button>
      </div>

      {/* ── Translation Questions List ──────────────────────────────────────── */}
      <div className="space-y-6 mb-8">
        {questions.map((q, idx) => {
          const val = userInputs[q.id] || '';
          const isChecked = checkedStatus[q.id] ?? false;
          const { isTargetWordPresent, matchScore } = calculateTranslationMatch(val, q.englishSentence, q.targetWord);
          const isSuccess = isChecked && isTargetWordPresent && matchScore >= 60;

          return (
            <div
              key={q.id}
              className={`
                rounded-2xl border p-5 transition-all duration-200 shadow-md
                ${isChecked
                  ? isSuccess
                    ? 'border-emerald-800/80 bg-emerald-950/20'
                    : 'border-amber-800/80 bg-amber-950/20'
                  : 'border-zinc-800 bg-zinc-900/80'}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-zinc-500">
                  {idx + 1}. Cümle
                </span>
                {q.targetWord && (
                  <span className="rounded bg-blue-950 border border-blue-800 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                    Hedef Kelime: {q.targetWord}
                  </span>
                )}
              </div>

              {/* Turkish Prompt Sentence */}
              <p className="text-base font-semibold text-white mb-3 leading-relaxed">
                "{q.turkishSentence}"
              </p>

              {/* English Input Textarea */}
              <div className="relative mb-3">
                <textarea
                  value={val}
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleCheckQuestion(q.id);
                    }
                  }}
                  rows={2}
                  placeholder="İngilizce çeviriyi yaz… (Ctrl + Enter ile kontrol et)"
                  className="
                    w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950
                    px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 font-sans
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none
                    transition-all shadow-inner
                  "
                />
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleCheckQuestion(q.id)}
                  disabled={!val.trim()}
                  className="
                    rounded-lg border border-blue-800/60 bg-blue-950/40 px-3.5 py-1.5
                    text-xs font-bold text-blue-300 hover:bg-blue-900/60 hover:text-white
                    disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer
                  "
                >
                  Cümleyi Kontrol Et
                </button>

                <span className="text-[10px] text-zinc-500 font-mono">
                  <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-400">Ctrl</kbd> + <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-400">↵</kbd>
                </span>
              </div>

              {/* Feedback box */}
              {isChecked && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 rounded-xl border p-3.5 text-xs ${isSuccess ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-200' : 'border-amber-800/60 bg-amber-950/40 text-amber-200'}`}
                >
                  <p className="font-bold mb-1">
                    {isSuccess ? '✓ Güzel Çeviri!' : '💡 Örnek Model Çeviri:'}
                  </p>
                  <p className="font-medium text-white leading-relaxed">
                    "{q.englishSentence}"
                  </p>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom Navigation Row ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800 pt-5">
        <button
          type="button"
          onClick={handleCheckAll}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
        >
          Tümünü Kontrol Et
        </button>

        <button
          type="button"
          onClick={handleFinish}
          className="
            flex items-center gap-2 rounded-xl border border-blue-500
            bg-blue-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-blue-950/40
            hover:bg-blue-500 transition-all cursor-pointer active:scale-95
          "
        >
          <span>Pekiştirmeyi Tamamla 🚀</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
