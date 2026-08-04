# WordCard Component — Visual Reference & Integration Guide

## Front Face — Active Recall Layer

![WordCard Front Face](C:\Users\akifbc\.gemini\antigravity\brain\997748ea-ed49-41fe-8240-ed2553991bdd\wordcard_front_mockup_1785525073743.jpg)

## Back Face — Semantic Consolidation Layer

![WordCard Back Face](C:\Users\akifbc\.gemini\antigravity\brain\997748ea-ed49-41fe-8240-ed2553991bdd\wordcard_back_mockup_1785525092448.jpg)

---

## Directory Structure

```
components/
└── flashcard/
    ├── WordCard.tsx                     ← Main component
    └── hooks/
        ├── useLatencyTracker.ts         ← Stopwatch hook
        └── useKeyboardShortcuts.ts      ← Global key bindings
```

---

## Required Dependencies

```bash
npm install framer-motion lucide-react
```

> `@supabase/ssr` and `zod` were already listed in Step 2.

---

## Usage Example

```tsx
// app/review/page.tsx
import { WordCard } from '@/components/flashcard/WordCard';
import type { SubmitReviewData } from '@/app/actions/review';

export default function ReviewPage() {
  // Fetch from Supabase server component...
  const lexicalItem = { /* LexicalItemRow */ };
  const userState   = { /* UserLexicalStateRow */ };

  function handleNext(result: SubmitReviewData) {
    // Load next card, update progress bar, etc.
    console.log('New state:', result.updatedState.state);
    console.log('Log entry:', result.reviewLog.id);
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <WordCard
        lexicalItem={lexicalItem}
        userState={userState}
        contextSentence="The doctor explained that the disease was contagious, meaning it could spread quickly."
        onNext={handleNext}
      />
    </main>
  );
}
```

---

## Cloze Generation Logic

The `blankedSentence()` utility automatically blanks the lemma wherever it appears
(case-insensitive, whole-word `\b` boundary match):

```
Input : "The disease was contagious, meaning it could spread quickly."
Lemma : "contagious"
Output: "The disease was ▬▬▬▬▬▬▬▬▬▬, meaning it could spread quickly."
```

The rendered blank is a styled `<span>` with a blue-tinted background —
not raw underscores — so it looks intentionally designed, not typeset.

---

## Keyboard Shortcuts Summary

| Key | State | Action |
|-----|-------|--------|
| `Space` / `Enter` | Front (hidden) | Reveal answer |
| `1` | Back (revealed) | Rate: Again (red) |
| `2` | Back (revealed) | Rate: Hard (orange) |
| `3` | Back (revealed) | Rate: Good (blue) |
| `4` | Back (revealed) | Rate: Easy (green) |

> `Space`/`Enter` are suppressed when focus is inside `<input>` so the user
> can type freely. All bindings are suppressed while `isPending` is true.

---

## Animation Timeline

```
Card mount
  └─ Front face fades in (rotateY: -90° → 0°, 320ms)
  └─ Latency timer starts

User clicks "Show Answer" / presses Space
  └─ timer.stop() captures latencyMs
  └─ Front exits (rotateY: 0° → 90°, 320ms)
  └─ Back enters (rotateY: -90° → 0°, 320ms)
  └─ Rating panel slides up (y: 16 → 0, 250ms)

User presses rating key / clicks button
  └─ submitCardReview() starts (isPending = true)
  └─ Buttons disabled + spinner overlay
  └─ On success: card fades + scales down (400ms exit)
  └─ onNext() called → parent loads next card
  └─ Reset: isRevealed=false, input cleared, timer restarted
```
