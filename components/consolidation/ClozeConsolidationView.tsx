/**
 * components/consolidation/ClozeConsolidationView.tsx
 * ─────────────────────────────────────────────────────
 * Stage 1: Fill-in-the-blanks (Cloze) consolidation exercise.
 * Features:
 *  - Word Bank chip panel at top (used words crossed out)
 *  - Interactive Cloze sentence list
 *  - Instant feedback (green/blue for correct, minimalist feedback for incorrect)
 *  - Transparent "Şimdi Atla" (Skip) button at top right
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight, HelpCircle, Sparkles } from 'lucide-react';
import type { ClozeQuestion } from '@/lib/data/consolidation-data';

interface ClozeConsolidationViewProps {
  moduleNumber: number;
  targetWords: string[];
  questions: ClozeQuestion[];
  onCompleteStage1: (score: number, failedWords: string[]) => void;
  onSkip: () => void;
}

export function ClozeConsolidationView({
  moduleNumber,
  targetWords,
  questions,
  onCompleteStage1,
  onSkip,
}: ClozeConsolidationViewProps) {
  // State for user answers: question.id -> user input
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  // Checked questions: question.id -> boolean (true if checked)
  const [checkedStatus, setCheckedStatus] = useState<Record<string, boolean>>({});
  // Currently active focused question ID
  const [activeQuestionId, setActiveQuestionId] = useState<string>(questions[0]?.id ?? '');

  // Calculate used target words (correctly answered words)
  const usedWords = new Set<string>();
  questions.forEach((q) => {
    if (checkedStatus[q.id]) {
      const input = (userAnswers[q.id] || '').trim().toLowerCase();
      if (input === q.targetWord) {
        usedWords.add(q.targetWord);
      }
    }
  });

  const handleInputChange = (qId: string, val: string) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: val }));
    // If question was previously checked, reset checked state on typing
    if (checkedStatus[qId]) {
      setCheckedStatus((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const handleSelectWordFromBank = (word: string) => {
    if (!activeQuestionId) return;
    setUserAnswers((prev) => ({ ...prev, [activeQuestionId]: word }));
    if (checkedStatus[activeQuestionId]) {
      setCheckedStatus((prev) => ({ ...prev, [activeQuestionId]: false }));
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
    // Force check all
    handleCheckAll();

    let correctCount = 0;
    const failedWords: string[] = [];

    questions.forEach((q) => {
      const input = (userAnswers[q.id] || '').trim().toLowerCase();
      if (input === q.targetWord) {
        correctCount++;
      } else {
        failedWords.push(q.targetWord);
      }
    });

    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 100;
    onCompleteStage1(score, failedWords);
  };

  const checkedCount = Object.keys(checkedStatus).filter((k) => checkedStatus[k]).length;
  const isAllChecked = checkedCount === questions.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 text-zinc-100">
      {/* ── Top Header Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
            Modül {moduleNumber} Pekiştirme — Aşama 1 / 2
          </span>
          <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
            Boşluk Doldurma (Cloze Exercise)
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

      {/* ── Word Bank Panel ──────────────────────────────────────────────────── */}
      {targetWords.length > 0 && (
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5">
            <Sparkles size={13} className="text-blue-400" />
            <span>Kelimeler (Word Bank)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {targetWords.map((word) => {
              const isUsed = usedWords.has(word.toLowerCase().trim());
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => !isUsed && handleSelectWordFromBank(word)}
                  disabled={isUsed}
                  className={`
                    rounded-lg border px-3 py-1 text-xs font-bold transition-all cursor-pointer
                    ${isUsed
                      ? 'border-zinc-800/60 bg-zinc-950/60 text-zinc-600 line-through opacity-40 cursor-not-allowed'
                      : 'border-blue-900/60 bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 hover:text-white shadow-sm'}
                  `}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cloze Questions List ─────────────────────────────────────────────── */}
      <div className="space-y-4 mb-8">
        {questions.map((q, idx) => {
          const userInput = userAnswers[q.id] || '';
          const isChecked = checkedStatus[q.id] ?? false;
          const isCorrect = isChecked && userInput.trim().toLowerCase() === q.targetWord;
          const isIncorrect = isChecked && !isCorrect;
          const isFocused = activeQuestionId === q.id;

          // Replace blank "________" with input box
          const parts = q.question.split(/________|_________/);

          return (
            <div
              key={q.id}
              onClick={() => setActiveQuestionId(q.id)}
              className={`
                rounded-2xl border p-4 sm:p-5 transition-all duration-200 shadow-md
                ${isCorrect
                  ? 'border-emerald-800/80 bg-emerald-950/20'
                  : isIncorrect
                  ? 'border-red-900/80 bg-red-950/20'
                  : isFocused
                  ? 'border-blue-600 bg-zinc-900 shadow-blue-950/30'
                  : 'border-zinc-800 bg-zinc-900/80'}
              `}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-mono font-bold text-zinc-500">
                  {idx + 1}.
                </span>

                {isChecked && (
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCorrect ? <Check size={14} /> : <X size={14} />}
                    <span>{isCorrect ? 'Doğru' : 'Yanlış'}</span>
                  </span>
                )}
              </div>

              {/* Question Sentence with embedded input */}
              <div className="text-sm sm:text-base leading-relaxed text-zinc-200 mb-3 font-medium">
                {parts[0]}
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                  onFocus={() => setActiveQuestionId(q.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCheckQuestion(q.id);
                    }
                  }}
                  placeholder="kelime yaz…"
                  className={`
                    mx-1.5 inline-block w-36 sm:w-44 rounded-lg border px-3 py-1
                    text-sm font-bold font-mono text-center transition-all outline-none
                    ${isCorrect
                      ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
                      : isIncorrect
                      ? 'border-red-600 bg-red-950 text-red-300'
                      : 'border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'}
                  `}
                />
                {parts[1] ?? ''}
              </div>

              {/* Minimalist Feedback for Incorrect answer */}
              {isIncorrect && (
                <div className="mt-2 rounded-xl border border-red-900/60 bg-red-950/40 px-3.5 py-2 text-xs text-red-300 flex items-center justify-between">
                  <span>Doğru Cevap: <span className="font-bold text-white font-mono">{q.answer}</span></span>
                </div>
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
          <span>Sonraki Aşama (Cümle Çevirisi)</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
