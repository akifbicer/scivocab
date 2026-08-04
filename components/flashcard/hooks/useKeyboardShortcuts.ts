/**
 * components/flashcard/hooks/useKeyboardShortcuts.ts
 * ────────────────────────────────────────────────────
 * Global keyboard listener for keyboard-first card control.
 *
 * Bindings:
 *  ─ Audio ──────────────────────────────────────────
 *  S               → Pronounce / Speak word (TTS)
 *
 *  ─ Before reveal ──────────────────────────────────
 *  Space / Enter   → Reveal answer (unless typing in field)
 *
 *  ─ Navigation ─────────────────────────────────────
 *  ArrowLeft (←)   → Previous Card
 *  ArrowRight (→)  → Next Card
 *
 *  ─ After reveal ───────────────────────────────────
 *  1 / 2 / 3 / 4   → Rate card (Again / Hard / Good / Easy)
 */

import { useCallback, useEffect } from 'react';

export interface UseKeyboardShortcutsOptions {
  isRevealed:  boolean;
  isPending:   boolean;
  onReveal:    () => void;
  onRate:      (rating: 1 | 2 | 3 | 4) => void;
  onSpeak?:    () => void;
  onPrev?:     () => void;
  onNextCard?: () => void;
}

export function useKeyboardShortcuts({
  isRevealed,
  isPending,
  onReveal,
  onRate,
  onSpeak,
  onPrev,
  onNextCard,
}: UseKeyboardShortcutsOptions): void {
  const isTypingTarget = useCallback((target: EventTarget | null): boolean => {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isPending) return;

      const isTyping = isTypingTarget(e.target);

      // Audio / TTS shortcut: 'S' key
      if (
        onSpeak &&
        (e.key === 's' || e.key === 'S') &&
        (!isTyping || e.altKey)
      ) {
        e.preventDefault();
        onSpeak();
        return;
      }

      // Card Navigation: ArrowLeft / ArrowRight
      if (!isTyping) {
        if (e.key === 'ArrowLeft' && onPrev) {
          e.preventDefault();
          onPrev();
          return;
        }
        if (e.key === 'ArrowRight' && onNextCard) {
          e.preventDefault();
          onNextCard();
          return;
        }
      }

      if (!isRevealed) {
        // Allow Space / Enter only when not typing in a field
        if ((e.code === 'Space' || e.code === 'Enter') && !isTyping) {
          e.preventDefault();
          onReveal();
        }
        return;
      }

      // Rating bindings (1-4) — active only after reveal
      const ratingMap: Record<string, 1 | 2 | 3 | 4> = {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
      };

      if (e.key in ratingMap && !isTyping) {
        e.preventDefault();
        onRate(ratingMap[e.key]);
      }
    },
    [isRevealed, isPending, onReveal, onRate, onSpeak, onPrev, onNextCard, isTypingTarget],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
