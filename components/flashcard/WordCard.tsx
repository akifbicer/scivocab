/**
 * components/flashcard/WordCard.tsx
 * ──────────────────────────────────
 * Active Recall Vocabulary Flashcard
 *
 * Progressive Disclosure & Cognitive Load Optimized UI:
 *  - Primary Layer (Always visible): Badges, Lemma, L2 Definition + Cloze Sentence (Front Face), Example + Translation, Collocations, AI Sentence Input, FSRS Rating
 *  - Secondary Layer (Collapsible): Synonyms, Antonyms, Word Family
 *  - Navigation: Previous (←) and Next (→) arrow buttons + Keyboard Left/Right support
 */

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  Timer,
  Volume2,
} from 'lucide-react';

import { submitCardReview, type SubmitReviewData } from '@/app/actions/review';
import type { LexicalItemRow, UserLexicalStateRow, WordFamily } from '@/types/database';
import { getSampleSentence } from '@/lib/data/awl-sentences';
import { getDemirtasSentenceInfo } from '@/lib/data/demirtas-sentences';
import { useLatencyTracker, formatElapsed } from './hooks/useLatencyTracker';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AIFeedbackSection } from './AIFeedbackSection';

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

export interface WordCardProps {
  lexicalItem:       LexicalItemRow;
  userState:         UserLexicalStateRow;
  contextSentence?:  string;
  onNext?:           (result: SubmitReviewData, latencyMs: number) => void;
  onPrev?:           () => void;
  onNextCard?:       () => void;
  hasPrev?:          boolean;
  hasNext?:          boolean;
  className?:        string;
}

const RATING_CONFIG = [
  { rating: 1 as const, label: 'Again',  shortcut: '1', color: 'rating-again'  },
  { rating: 2 as const, label: 'Hard',   shortcut: '2', color: 'rating-hard'   },
  { rating: 3 as const, label: 'Good',   shortcut: '3', color: 'rating-good'   },
  { rating: 4 as const, label: 'Easy',   shortcut: '4', color: 'rating-easy'   },
] as const;

// =============================================================================
// STYLE HELPERS
// =============================================================================

function getCefrStyle(level: string | null): string {
  switch (level) {
    case 'A1': return 'bg-emerald-950 text-emerald-400 border-emerald-800 ring-emerald-900';
    case 'A2': return 'bg-emerald-950 text-emerald-300 border-emerald-700 ring-emerald-900';
    case 'B1': return 'bg-sky-950    text-sky-400     border-sky-800     ring-sky-900';
    case 'B2': return 'bg-blue-950   text-blue-300    border-blue-700    ring-blue-900';
    case 'C1': return 'bg-sky-950    text-sky-300     border-sky-700     ring-sky-900';
    case 'C2': return 'bg-blue-950   text-blue-300    border-blue-700    ring-blue-900';
    default:   return 'bg-zinc-900   text-zinc-400    border-zinc-700    ring-zinc-800';
  }
}

function getRatingStyle(_color: string): string {
  return 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-blue-500 hover:text-blue-400 hover:bg-zinc-800/50 transition-all cursor-pointer active:scale-95';
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function ClozeSentence({
  sentence,
  lemma,
}: {
  sentence: string;
  lemma: string;
}) {
  if (!sentence || !lemma) return <>{sentence}</>;

  const stem = lemma.length > 3 && lemma.endsWith('y') ? lemma.slice(0, -1) : lemma;
  const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escapedStem}[a-z]*\\b`, 'gi');

  const parts = sentence.split(pattern);

  return (
    <p className="text-xl md:text-2xl leading-relaxed text-zinc-200 font-light mb-8 tracking-tight">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              className="
                inline-flex items-center justify-center min-w-[5.5rem] px-3.5 py-0.5 mx-1 rounded-lg
                bg-blue-950/70 border border-blue-700/60 border-b-2 border-b-blue-400
                text-blue-400 font-mono text-sm font-bold tracking-widest align-baseline select-none shadow-sm
              "
            >
              ______
            </span>
          )}
        </span>
      ))}
    </p>
  );
}

function HighlightedSentence({
  sentence,
  lemma,
}: {
  sentence: string;
  lemma: string;
}) {
  if (!sentence || !lemma) return <>{sentence}</>;

  const stem = lemma.length > 3 && lemma.endsWith('y') ? lemma.slice(0, -1) : lemma;
  const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\b${escapedStem}[a-z]*\\b)`, 'gi');

  const parts = sentence.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <span
            key={i}
            className="font-bold text-blue-400 underline decoration-blue-400/40 underline-offset-2"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

function wordFamilyPairs(wf: WordFamily | null): Array<[string, string]> {
  if (!wf) return [];
  const roleOrder = ['root', 'noun', 'verb', 'adjective', 'adverb'];
  const pairs: Array<[string, string]> = [];
  const allKeys = [...new Set([...roleOrder, ...Object.keys(wf)])];

  for (const role of allKeys) {
    const val = wf[role];
    if (!val) continue;
    if (Array.isArray(val)) {
      val.forEach((v) => pairs.push([role, v]));
    } else {
      pairs.push([role, val]);
    }
  }
  return pairs;
}

// =============================================================================
// AUDIO / TTS HOOK
// =============================================================================

function useTTS(text: string, audioUrl?: string | null) {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError,  setHasError]  = useState(false);

  const fallbackTTS = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Mark')))
                   || voices.find(v => v.lang.startsWith('en-US'))
                   || voices.find(v => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;

      utterance.onend   = () => setIsPlaying(false);
      utterance.onerror = () => {
        setIsPlaying(false);
        tryGoogleTTS();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      tryGoogleTTS();
    }
  }, [text]);

  const tryGoogleTTS = useCallback(() => {
    try {
      const gAudio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=${encodeURIComponent(text)}`);
      gAudio.onended = () => setIsPlaying(false);
      gAudio.onerror = () => { setHasError(true); setIsPlaying(false); };
      gAudio.play().then(() => setIsPlaying(true)).catch(() => { setHasError(true); setIsPlaying(false); });
    } catch {
      setHasError(true);
      setIsPlaying(false);
    }
  }, [text]);

  const play = useCallback(() => {
    if (!text && !audioUrl) return;
    setIsPlaying(true);
    setHasError(false);

    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => fallbackTTS();
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => fallbackTTS());
      return;
    }

    fallbackTTS();
  }, [text, audioUrl, fallbackTTS]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { play, isPlaying, hasError };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WordCard({
  lexicalItem,
  userState,
  contextSentence,
  onNext,
  onPrev,
  onNextCard,
  hasPrev,
  hasNext,
  className = '',
}: WordCardProps) {
  const demirtasInfo = getDemirtasSentenceInfo(lexicalItem.lemma);

  // ── Derived data ───────────────────────────────────────────────────────────
  const rawSentence =
    contextSentence ||
    (lexicalItem as any).example_sentence ||
    (lexicalItem as any).context_sentence ||
    (lexicalItem as any).example ||
    (lexicalItem as any).english_example ||
    demirtasInfo?.exampleSentence ||
    getSampleSentence(lexicalItem.lemma) ||
    `The research provided empirical data regarding how ${lexicalItem.lemma} is evaluated in academic discourse.`;

  // ── Sentence Turkish Translation (strictly under EXAMPLE block) ───────────
  const sentenceTranslation =
    (lexicalItem as any).turkish_example ||
    (lexicalItem as any).example_tr ||
    (lexicalItem as any).sentence_tr ||
    demirtasInfo?.turkishTranslation ||
    (lexicalItem.turkish_translation && lexicalItem.turkish_translation.length > 25
      ? lexicalItem.turkish_translation
      : null);

  const wordTurkishMeaning =
    (lexicalItem as any).turkish_meaning ||
    (lexicalItem as any).word_tr ||
    (lexicalItem as any).meaning_tr ||
    (Array.isArray(lexicalItem.l1_meanings) && lexicalItem.l1_meanings.length > 0
      ? (lexicalItem.l1_meanings as string[]).join(' · ')
      : null) ||
    (lexicalItem.turkish_translation && lexicalItem.turkish_translation.length <= 25
      ? lexicalItem.turkish_translation
      : null);

  const synonymsList: string[] = Array.isArray(lexicalItem.synonyms)
    ? lexicalItem.synonyms
    : typeof lexicalItem.synonyms === 'string'
      ? (lexicalItem.synonyms as string).split(',').map(s => s.trim()).filter(Boolean)
      : [];

  const antonymsList: string[] = Array.isArray(lexicalItem.antonyms)
    ? lexicalItem.antonyms
    : typeof lexicalItem.antonyms === 'string'
      ? (lexicalItem.antonyms as string).split(',').map(s => s.trim()).filter(Boolean)
      : [];

  const collocationsList: string[] = typeof lexicalItem.collocations === 'string'
    ? lexicalItem.collocations.split(',').map(s => s.trim()).filter(Boolean)
    : Array.isArray(lexicalItem.collocations)
      ? lexicalItem.collocations
      : [];

  const wfPairs = wordFamilyPairs(lexicalItem.word_family as WordFamily | null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [isRevealed,     setIsRevealed]     = useState(false);
  const [isExiting,      setIsExiting]      = useState(false);
  const [showSecondary,  setShowSecondary]  = useState(false);
  const [userInput,      setUserInput]      = useState('');
  const [hasInputError,  setHasInputError]  = useState(false);
  const [actionError,    setActionError]    = useState<string | null>(null);
  const [isPending,      startTransition]   = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Sub-hooks ─────────────────────────────────────────────────────────────
  const latency = useLatencyTracker();
  const audio   = useTTS(lexicalItem.lemma, lexicalItem.audio_us_url);

  // ── Start timer on mount ───────────────────────────────────────────────────
  useEffect(() => {
    latency.start();
    setHasInputError(false);
    inputRef.current?.focus();
    return () => latency.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userState.id]);

  // ── Reveal handler ─────────────────────────────────────────────────────────
  const handleReveal = useCallback(() => {
    if (isRevealed) return;
    latency.stop();
    setIsRevealed(true);
  }, [isRevealed, latency]);

  // ── Instant Validation Input Submit Handler ─────────────────────────────────
  const handleInputSubmit = useCallback(() => {
    if (isRevealed) return;

    const trimmedInput = userInput.trim().toLowerCase();
    const targetLemma = lexicalItem.lemma.trim().toLowerCase();

    // Empty input -> direct reveal without error (preserves "don't know" fallback)
    if (!trimmedInput) {
      setHasInputError(false);
      handleReveal();
      return;
    }

    // Stem matching for inflections & exact match
    const stem = targetLemma.length > 3 && targetLemma.endsWith('y') ? targetLemma.slice(0, -1) : targetLemma;
    const isCorrect = trimmedInput === targetLemma || (stem.length >= 3 && trimmedInput.startsWith(stem));

    if (isCorrect) {
      setHasInputError(false);
      handleReveal();
    } else {
      setHasInputError(true);
    }
  }, [isRevealed, userInput, lexicalItem.lemma, handleReveal]);

  // ── Rating handler ─────────────────────────────────────────────────────────
  const handleRate = useCallback(
    (rating: 1 | 2 | 3 | 4) => {
      if (!isRevealed || isPending) return;
      setActionError(null);

      const ms = latency.capturedMs.current;

      startTransition(async () => {
        const result = await submitCardReview({
          userStateId:     userState.id,
          lexicalItemId:   lexicalItem.id,
          rating,
          latencyMs:       ms,
          interactionType: 'ActiveRecall',
        });

        if (!result.success) {
          setActionError(result.error);
          return;
        }

        setIsExiting(true);
        setTimeout(() => {
          setIsExiting(false);
          setIsRevealed(false);
          setShowSecondary(false);
          setUserInput('');
          latency.reset();
          latency.start();
          onNext?.(result.data, ms);
        }, 400);
      });
    },
    [isRevealed, isPending, userState.id, lexicalItem.id, latency, onNext],
  );

  // ── Keyboard shortcuts (with Left/Right Arrow Navigation) ──────────────────
  useKeyboardShortcuts({
    isRevealed,
    isPending,
    onReveal: handleReveal,
    onRate:   handleRate,
    onSpeak:  isRevealed ? audio.play : undefined,
    onPrev,
    onNextCard,
  });

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <motion.div
      className={`relative w-full max-w-2xl mx-auto ${className}`}
      animate={isExiting ? { opacity: 0, scale: 0.97, y: -12 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      {/* ── Card shell ───────────────────────────────────────────────────── */}
      <div
        className="relative w-full rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden"
        style={{ perspective: '1200px' }}
      >
        {/* Subtle top-edge glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />

        {/* ── Header: Badges & Navigation Controls ───────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Module Badge */}
            {(lexicalItem.module_number ?? (userState as any)?.module_number) && (
              <span className="inline-flex items-center rounded-md border border-amber-800/80 bg-amber-950/60 px-2.5 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-900/50">
                Modül {lexicalItem.module_number ?? (userState as any)?.module_number}
              </span>
            )}

            {/* POS pill */}
            {lexicalItem.pos && (
              <span className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-xs font-medium text-zinc-300">
                {lexicalItem.pos}
              </span>
            )}

            {/* CEFR Badge */}
            {lexicalItem.cefr_level && (
              <span
                className={`
                  inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold
                  tracking-widest ring-1 ring-inset
                  ${getCefrStyle(lexicalItem.cefr_level)}
                `}
              >
                CEFR: {lexicalItem.cefr_level}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Card Navigation Controls: Previous (←) & Next (→) */}
            {(onPrev || onNextCard) && (
              <div className="flex items-center gap-1.5 mr-2 border-r border-zinc-800 pr-3">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!hasPrev}
                  title="Önceki Kart (Sol Ok ←)"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">Önceki</span>
                </button>
                <button
                  type="button"
                  onClick={onNextCard}
                  disabled={!hasNext}
                  title="Sonraki Kart (Sağ Ok →)"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <span className="hidden sm:inline">Sonraki</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Simple Audio Speaker Button (Only visible after reveal) */}
            {isRevealed && (
              <button
                onClick={audio.play}
                disabled={audio.isPlaying}
                aria-label="Listen to pronunciation"
                className={`
                  flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200
                  ${audio.hasError
                    ? 'border-zinc-800 text-zinc-700 cursor-not-allowed'
                    : 'border-zinc-700 text-zinc-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-950/40'}
                  ${audio.isPlaying ? 'border-blue-500 text-blue-400 bg-blue-950/40 shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse' : ''}
                `}
                title="Listen to pronunciation (Press S)"
              >
                <Volume2 size={14} />
              </button>
            )}
          </div>
        </header>

        {/* Divider */}
        <div className="mx-5 h-px bg-zinc-800" />

        {/* ── Flip container ────────────────────────────────────────────── */}
        <div
          className="relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {!isRevealed ? (
              /* ──────────────── FRONT FACE ──────────────── */
              <motion.div
                key="front"
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0,   opacity: 1 }}
                exit={{   rotateY: 90,   opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                style={{ backfaceVisibility: 'hidden' }}
                className="px-6 py-8"
              >
                {/* Active Recall hint */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={12} className="text-zinc-600" />
                    <span className="text-xs text-zinc-600 tracking-wide uppercase font-medium">
                      Active Recall
                    </span>
                  </div>
                </div>

                {/* ── English Definition (DEFINITION) on Front Face ──────── */}
                {lexicalItem.l2_definition && (
                  <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-inner">
                    <p className="text-[11px] uppercase tracking-widest text-blue-400 mb-1.5 font-bold">
                      DEFINITION
                    </p>
                    <p className="text-zinc-200 text-base leading-relaxed font-light">
                      {lexicalItem.l2_definition}
                    </p>
                  </div>
                )}

                {/* Cloze sentence */}
                <ClozeSentence sentence={rawSentence} lemma={lexicalItem.lemma} />

                {/* Answer input */}
                <motion.div
                  animate={hasInputError ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.35 }}
                  className="relative mb-6"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      if (hasInputError) setHasInputError(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        handleInputSubmit();
                      }
                    }}
                    placeholder="Type your answer…"
                    aria-label="Answer input"
                    className={`
                      w-full rounded-xl border px-4 py-3
                      text-zinc-200 placeholder-zinc-600 text-base font-mono tracking-wide
                      focus:outline-none transition-all duration-200
                      ${hasInputError
                        ? 'border-rose-600 bg-rose-950/20 text-rose-200 ring-2 ring-rose-600/50 shadow-lg shadow-rose-950/40'
                        : 'border-zinc-700 bg-zinc-800/60 focus:ring-2 focus:ring-blue-700/60 focus:border-blue-700'}
                    `}
                  />

                  {/* Instant Error Callout */}
                  {hasInputError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-xs font-semibold text-rose-400 flex items-center gap-1.5"
                    >
                      <AlertTriangle size={14} />
                      <span>Hatalı cevap, tekrar deneyin ❌</span>
                    </motion.p>
                  )}
                </motion.div>

                {/* Show Answer row */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleReveal}
                    id="reveal-btn"
                    className="
                      flex items-center gap-2 rounded-xl border border-zinc-700
                      bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300
                      hover:border-blue-700 hover:bg-blue-950/30 hover:text-blue-300
                      transition-all duration-200 group
                    "
                  >
                    <span>Show Answer</span>
                    <ChevronRight
                      size={14}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </button>

                  {/* Latency stopwatch */}
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Timer size={12} className={latency.isRunning ? 'text-blue-700 animate-pulse' : ''} />
                    <span className="font-mono text-xs tabular-nums">
                      {formatElapsed(latency.elapsedMs)}
                    </span>
                  </div>
                </div>

                {/* Keyboard hint */}
                <p className="mt-5 text-center text-xs text-zinc-700">
                  Press{' '}
                  <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-500">
                    Space
                  </kbd>
                  {' '}or{' '}
                  <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-500">
                    Enter
                  </kbd>
                  {' '}to reveal
                </p>
              </motion.div>
            ) : (
              /* ──────────────── BACK FACE ──────────────── */
              <motion.div
                key="back"
                initial={{ rotateY: 90,  opacity: 0 }}
                animate={{ rotateY: 0,   opacity: 1 }}
                exit={{   rotateY: -90,  opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                style={{ backfaceVisibility: 'hidden' }}
                className="px-6 pt-7 pb-4"
              >
                {/* ── Lemma + IPA ─────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-none">
                      {lexicalItem.lemma}
                    </h2>
                    {lexicalItem.ipa_us && (
                      <span className="text-lg text-zinc-500 font-light font-mono">
                        /{lexicalItem.ipa_us}/
                      </span>
                    )}
                  </div>
                </div>

                {/* Separator */}
                <div className="my-4 h-px bg-zinc-800" />

                {/* ── L2 Definition ───────────────────────────────── */}
                {lexicalItem.l2_definition && (
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-medium">
                      DEFINITION
                    </p>
                    <p className="text-zinc-300 text-base leading-relaxed">
                      {lexicalItem.l2_definition}
                    </p>
                  </div>
                )}

                {/* ── Example Sentence + Sentence Translation ──────── */}
                {rawSentence && (
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-medium">
                      EXAMPLE
                    </p>
                    <blockquote className="border-l-2 border-blue-800 pl-4 text-zinc-300 text-base leading-relaxed italic mb-2">
                      <HighlightedSentence
                        sentence={rawSentence}
                        lemma={lexicalItem.lemma}
                      />
                    </blockquote>
                    {sentenceTranslation && (
                      <p className="mt-2 pl-4 text-sm text-zinc-400 font-normal border-l-2 border-blue-900/50">
                        <span className="font-semibold text-blue-400 mr-1.5">Çevirisi:</span>
                        <span className="italic">{sentenceTranslation}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* ── İlişkili İfadeler (Collocations) ────────────────────────── */}
                {collocationsList.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[11px] uppercase tracking-widest text-sky-400 font-semibold mb-2 flex items-center gap-1.5">
                      <span>İlişkili İfadeler</span>
                      <span className="text-[10px] text-sky-500 font-normal">(Collocations)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {collocationsList.map((col) => (
                        <span
                          key={col}
                          className="
                            rounded-lg border border-sky-800/60 bg-sky-950/40
                            px-3 py-1 text-sm text-sky-200 font-medium shadow-sm
                          "
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── SECONDARY LAYER: Collapsible Synonyms / Antonyms / Word Family ──── */}
                {(synonymsList.length > 0 || antonymsList.length > 0 || wfPairs.length > 0) && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setShowSecondary(!showSecondary)}
                      className="
                        flex items-center justify-between w-full rounded-xl border border-zinc-800
                        bg-zinc-950/60 px-4 py-2.5 text-xs font-semibold text-zinc-400
                        hover:text-zinc-200 hover:bg-zinc-800/60 transition-all duration-150
                      "
                    >
                      <div className="flex items-center gap-2">
                        <Layers size={14} className="text-zinc-500" />
                        <span>Eş / Zıt Anlamlıları ve Sözcük Ailesini Göster</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${showSecondary ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence>
                      {showSecondary && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="overflow-hidden pt-3"
                        >
                          {/* Synonyms & Antonyms */}
                          {(synonymsList.length > 0 || antonymsList.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              {synonymsList.length > 0 && (
                                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-3">
                                  <p className="text-[11px] uppercase tracking-widest text-emerald-400 font-semibold mb-2 flex items-center gap-1.5">
                                    <span>Eş Anlamlılar</span>
                                    <span className="text-[10px] text-emerald-600 font-normal">(Synonyms)</span>
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {synonymsList.map((syn) => (
                                      <span
                                        key={syn}
                                        className="rounded-md border border-emerald-800/60 bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-300"
                                      >
                                        {syn}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {antonymsList.length > 0 && (
                                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                                  <p className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold mb-2 flex items-center gap-1.5">
                                    <span>Zıt Anlamlılar</span>
                                    <span className="text-[10px] text-zinc-500 font-normal">(Antonyms)</span>
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {antonymsList.map((ant) => (
                                      <span
                                        key={ant}
                                        className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300"
                                      >
                                        {ant}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Word Family */}
                          {wfPairs.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2 font-medium">
                                Word Family
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {wfPairs.map(([role, form]) => (
                                  <span
                                    key={`${role}-${form}`}
                                    className="
                                      rounded-lg border border-blue-900/60 bg-blue-950/30
                                      px-2.5 py-1 text-sm text-blue-300
                                    "
                                  >
                                    {form}
                                    <span className="ml-1.5 text-xs text-blue-500 font-normal">
                                      ({role})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── PRIMARY LAYER: AI Sentence Writing Block ────────────────── */}
                <AIFeedbackSection
                  targetLemma={lexicalItem.lemma}
                  l1Meaning={wordTurkishMeaning ?? lexicalItem.lemma}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Rating panel (slides up after reveal) ────────────────────── */}
        <AnimatePresence>
          {isRevealed && (
            <motion.div
              key="rating-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: 8  }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="px-5 pb-5 pt-1"
            >
              <div className="h-px bg-zinc-800 mb-4" />

              {/* Error message */}
              <AnimatePresence>
                {actionError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{   opacity: 0, height: 0 }}
                    className="mb-3 text-center text-xs text-red-400"
                  >
                    {actionError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Rating buttons */}
              <div className="grid grid-cols-4 gap-2.5">
                {RATING_CONFIG.map(({ rating, label, shortcut, color }) => (
                  <button
                    key={rating}
                    id={`rate-btn-${rating}`}
                    onClick={() => handleRate(rating)}
                    disabled={isPending}
                    aria-label={`Rate ${label}`}
                    className={`
                      relative flex flex-col items-center justify-center gap-1
                      rounded-xl border py-3 px-2 transition-all duration-150 font-medium
                      disabled:cursor-not-allowed disabled:opacity-40
                      ${getRatingStyle(color)}
                    `}
                  >
                    {/* Loading spinner overlay */}
                    {isPending && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={16} className="animate-spin text-zinc-400" />
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${isPending ? 'invisible' : ''}`}>
                      {label}
                    </span>
                    <kbd
                      className={`
                        rounded border border-current/20 bg-current/5 px-1.5 py-0.5
                        font-mono text-xs opacity-60
                        ${isPending ? 'invisible' : ''}
                      `}
                    >
                      {shortcut}
                    </kbd>
                  </button>
                ))}
              </div>

              {/* Keyboard hint */}
              <p className="mt-3 text-center text-xs text-zinc-700">
                Press{' '}
                {RATING_CONFIG.map(({ shortcut }, i) => (
                  <span key={shortcut}>
                    <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">
                      {shortcut}
                    </kbd>
                    {i < RATING_CONFIG.length - 1 && ' · '}
                  </span>
                ))}
                {' '}to rate · <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">←</kbd> / <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">→</kbd> to navigate
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Latency captured indicator (bottom-right, after reveal) */}
        {isRevealed && latency.capturedMs.current > 0 && (
          <div className="absolute bottom-5 right-5 flex items-center gap-1 text-zinc-700 pointer-events-none">
            <CheckCircle2 size={10} />
            <span className="font-mono text-[10px]">
              {formatElapsed(latency.capturedMs.current)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default WordCard;
