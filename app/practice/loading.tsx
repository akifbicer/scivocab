/**
 * app/practice/loading.tsx
 * ─────────────────────────
 * Next.js App Router Suspense loading UI.
 *
 * Automatically rendered by the framework while page.tsx awaits the
 * Supabase data fetch. Mirrors the real session layout (header / card / footer)
 * with pulsing skeleton placeholders — zero layout shift on hydration.
 */

export default function PracticeLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* ── Skeleton progress header ──────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {/* Label row */}
          <div className="mb-2 flex items-center justify-between">
            <div className="h-3.5 w-32 animate-pulse rounded-full bg-zinc-800" />
            <div className="h-3.5 w-20 animate-pulse rounded-full bg-zinc-800" />
          </div>
          {/* Progress track */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full w-0 animate-pulse rounded-full bg-zinc-700"
              style={{ width: '0%' }}
            />
          </div>
        </div>
      </header>

      {/* ── Skeleton card ─────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/60">

          {/* Card header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              {/* CEFR badge */}
              <div className="h-5 w-8 animate-pulse rounded-md bg-zinc-800" />
              {/* POS */}
              <div className="h-3.5 w-16 animate-pulse rounded-full bg-zinc-800" />
            </div>
            <div className="flex items-center gap-2">
              {/* Audio button */}
              <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-800" />
              {/* State pill */}
              <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-800" />
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 h-px bg-zinc-800" />

          {/* Card body */}
          <div className="px-6 py-8">
            {/* "Active Recall" micro-label */}
            <div className="mb-5 h-3 w-24 animate-pulse rounded-full bg-zinc-800" />

            {/* Cloze sentence lines */}
            <div className="mb-2 h-6 w-full animate-pulse rounded-full bg-zinc-800" />
            <div className="mb-2 h-6 w-11/12 animate-pulse rounded-full bg-zinc-800" />
            <div className="mb-8 h-6 w-3/4 animate-pulse rounded-full bg-zinc-800" />

            {/* Input skeleton */}
            <div className="mb-6 h-12 w-full animate-pulse rounded-xl bg-zinc-800" />

            {/* Button + stopwatch row */}
            <div className="flex items-center justify-between">
              <div className="h-10 w-36 animate-pulse rounded-xl bg-zinc-800" />
              <div className="h-4 w-14 animate-pulse rounded-full bg-zinc-800" />
            </div>

            {/* Keyboard hint */}
            <div className="mt-5 flex justify-center gap-2">
              <div className="h-3 w-48 animate-pulse rounded-full bg-zinc-800" />
            </div>
          </div>
        </div>
      </main>

      {/* ── Skeleton session info band ────────────────────────── */}
      <footer className="border-t border-zinc-800/60 bg-zinc-950/80">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-4 py-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="h-3 w-14 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-4 w-8  animate-pulse rounded-full bg-zinc-800" />
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
