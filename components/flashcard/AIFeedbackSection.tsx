/**
 * components/flashcard/AIFeedbackSection.tsx
 * ────────────────────────────────────────────
 * AI-powered writing-practice accordion for the WordCard back face.
 *
 * States:
 *   idle     → Collapsed header bar — click to expand.
 *   open     → Textarea + "Analiz Et" button visible.
 *   pending  → Spinner while awaiting LLM response.
 *   result   → Animated result panel (score, L1 warning, correction, feedback).
 *
 * The component is fully self-contained; it calls the Server Action directly
 * and manages all UI state internally.
 */

'use client';

import {
  useState,
  useTransition,
  useRef,
  useCallback,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Quote,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import { submitSentenceForFeedback } from '@/app/actions/ai-feedback';
import type { SentenceFeedbackResult } from '@/lib/ai/llm';

// =============================================================================
// TYPES
// =============================================================================

export interface AIFeedbackSectionProps {
  /** The target vocabulary word (e.g., "analysis"). */
  targetLemma: string;
  /** Primary Turkish meaning(s) (e.g., "analiz, çözümleme"). */
  l1Meaning:   string;
}

// =============================================================================
// STYLE HELPERS
// =============================================================================

function getScoreColor(score: number): {
  badge: string;
  bar: string;
  label: string;
} {
  if (score >= 80) return {
    badge: 'bg-emerald-950/60 border-emerald-700 text-emerald-300',
    bar:   'bg-emerald-500',
    label: 'Mükemmel',
  };
  if (score >= 50) return {
    badge: 'bg-amber-950/60 border-amber-700 text-amber-300',
    bar:   'bg-amber-500',
    label: 'İyi',
  };
  return {
    badge: 'bg-red-950/60 border-red-800 text-red-300',
    bar:   'bg-red-500',
    label: 'Tekrar Dene',
  };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// ── Score Card ────────────────────────────────────────────────────────────────

function ScoreCard({ score }: { score: number }) {
  const { badge, bar, label } = getScoreColor(score);

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Cümle Puanı
        </span>
        <span
          className={`
            inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5
            text-sm font-bold ${badge}
          `}
        >
          {score}/100
          <span className="text-[10px] font-normal opacity-70">{label}</span>
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  );
}

// ── L1 Transfer Warning ───────────────────────────────────────────────────────

function L1Warning() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="
        mb-4 flex items-start gap-3 rounded-xl
        border border-orange-800/60 bg-orange-950/30 px-3.5 py-3
      "
    >
      <AlertTriangle
        size={15}
        className="mt-0.5 flex-shrink-0 text-orange-400"
      />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
          Anadilden Aktarım Hatası Tespit Edildi
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-orange-400/70">
          Bu hata, Türkçe kalıpların İngilizce'ye aktarılmasından kaynaklanıyor.
          Aşağıdaki düzeltilmiş cümleyi incele.
        </p>
      </div>
    </motion.div>
  );
}

// ── Corrected Sentence ────────────────────────────────────────────────────────

function CorrectedSentence({
  original,
  corrected,
}: {
  original:  string;
  corrected: string;
}) {
  const isChanged = original.trim().toLowerCase() !== corrected.trim().toLowerCase();

  return (
    <div className="mb-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        {isChanged ? 'Düzeltilmiş Cümle' : 'Cümleni Onaylıyorum ✓'}
      </p>
      <blockquote
        className={`
          relative rounded-xl border px-4 py-3
          ${isChanged
            ? 'border-blue-800/50 bg-blue-950/20'
            : 'border-emerald-800/50 bg-emerald-950/20'}
        `}
      >
        <Quote
          size={12}
          className={`
            absolute left-2 top-2 opacity-30
            ${isChanged ? 'text-blue-400' : 'text-emerald-400'}
          `}
        />
        <p
          className={`
            pl-2 text-sm leading-relaxed font-medium
            ${isChanged ? 'text-blue-200' : 'text-emerald-200'}
          `}
        >
          {corrected}
        </p>
      </blockquote>
    </div>
  );
}

// ── Suggested Collocation ─────────────────────────────────────────────────────

function CollocationBadge({ collocation }: { collocation: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Önerilen Eş-Dizim
      </span>
      <span
        className="
          inline-flex items-center rounded-lg border border-blue-800/50
          bg-blue-950/30 px-2.5 py-0.5 text-sm font-semibold text-blue-300
        "
      >
        {collocation}
      </span>
    </div>
  );
}

// ── Turkish Feedback ──────────────────────────────────────────────────────────

function TurkishFeedback({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
        <Sparkles size={10} />
        AI Geribildirim
      </p>
      <p className="text-sm leading-relaxed text-zinc-300">{text}</p>
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────────

function ResultPanel({
  result,
  original,
  onReset,
}: {
  result:   SentenceFeedbackResult;
  original: string;
  onReset:  () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <ScoreCard score={result.score} />

      {result.l1TransferErrorDetected && <L1Warning />}

      <CorrectedSentence
        original={original}
        corrected={result.correctedSentence}
      />

      {result.suggestedCollocation && (
        <CollocationBadge collocation={result.suggestedCollocation} />
      )}

      <TurkishFeedback text={result.feedbackTR} />

      {/* Reset button */}
      <button
        onClick={onReset}
        className="
          mt-4 flex items-center gap-1.5 text-xs text-zinc-600
          hover:text-zinc-400 transition-colors duration-150
        "
      >
        <RefreshCw size={11} />
        Yeni cümle dene
      </button>
    </motion.div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

type Phase = 'idle' | 'open' | 'result';

export function AIFeedbackSection({ targetLemma, l1Meaning }: AIFeedbackSectionProps) {
  const [phase,    setPhase]   = useState<Phase>('open');
  const [sentence, setSentence] = useState('');
  const [result,   setResult]  = useState<SentenceFeedbackResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Analyse ─────────────────────────────────────────────────────────────────
  const handleAnalyse = useCallback(() => {
    if (!sentence.trim() || isPending) return;
    setApiError(null);

    startTransition(async () => {
      const res = await submitSentenceForFeedback({
        userSentence: sentence,
        targetLemma,
        l1Meaning,
      });

      if (!res.success) {
        setApiError(res.error);
        return;
      }

      setResult(res.data);
      setPhase('result');
    });
  }, [sentence, targetLemma, l1Meaning, isPending]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSentence('');
    setResult(null);
    setApiError(null);
    setPhase('open');
    // Re-focus textarea after animation settles
    setTimeout(() => textareaRef.current?.focus(), 120);
  }, []);

  // ── Toggle open/idle ─────────────────────────────────────────────────────────
  const handleToggle = useCallback(() => {
    if (phase === 'idle') {
      setPhase('open');
      setTimeout(() => textareaRef.current?.focus(), 150);
    } else if (phase === 'open') {
      setPhase('idle');
    }
    // In 'result' phase, toggle is disabled (user uses Reset)
  }, [phase]);

  // ── Keyboard: Ctrl+Enter submits ─────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      e.stopPropagation(); // prevent WordCard keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAnalyse();
      }
    },
    [handleAnalyse],
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="mt-5 rounded-xl border border-blue-900/40 bg-zinc-950/80 p-4 shadow-xl">
      {/* ── Section Title ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-950/80 p-1.5 border border-blue-800/60">
            <Sparkles size={14} className="text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
              AI ile Cümle Üretimi & Geri Bildirim
            </span>
            <p className="text-[11px] text-zinc-500">
              Öğrendiğin kelimeyi kullanarak kendi cümleni yaz ve anında yapay zeka analizi al.
            </p>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {phase !== 'result' && (
          <motion.div
            key="input-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              placeholder={`"${targetLemma}" kelimesini içeren bir İngilizce cümle yaz…`}
              rows={3}
              aria-label="AI analiz için cümle girişi"
              className="
                mb-3 w-full resize-none rounded-xl border border-zinc-700
                bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100
                placeholder-zinc-500 leading-relaxed font-sans
                focus:border-blue-500 focus:outline-none
                focus:ring-2 focus:ring-blue-500/30
                disabled:cursor-not-allowed disabled:opacity-50
                transition-all duration-200 shadow-inner
              "
            />

            {/* Error message */}
            <AnimatePresence>
              {apiError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 text-xs text-red-400 font-medium"
                >
                  {apiError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Action row */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleAnalyse}
                disabled={isPending || !sentence.trim()}
                aria-label="Cümleyi Kontrol Et / AI Geri Bildirim Al"
                className="
                  flex items-center gap-2 rounded-xl
                  border border-blue-600 bg-blue-600
                  px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-950/50
                  hover:bg-blue-500 hover:border-blue-500
                  disabled:cursor-not-allowed disabled:opacity-40
                  transition-all duration-150 active:scale-95
                "
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>Analiz Ediliyor…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-blue-200" />
                    <span>Cümleyi Kontrol Et / AI Geri Bildirim Al</span>
                  </>
                )}
              </button>

              <span className="text-[10px] text-zinc-600 font-mono">
                <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-400">
                  Ctrl
                </kbd>
                {' + '}
                <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-400">
                  ↵
                </kbd>
              </span>
            </div>
          </motion.div>
        )}

        {phase === 'result' && result && (
          <ResultPanel
            key="result-block"
            result={result}
            original={sentence}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default AIFeedbackSection;
