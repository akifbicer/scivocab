/**
 * app/dashboard/loading.tsx
 * ──────────────────────────
 * Skeleton loading UI for the dashboard page.
 * Automatically activated by Next.js App Router's Suspense boundary while
 * the Server Component fetches data from Supabase.
 * Mirrors the real layout to prevent layout shift on hydration.
 */

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">

        {/* ── Welcome section skeleton ────────────────────────── */}
        <section className="mb-8">
          {/* Greeting */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-7 w-48 animate-pulse rounded-full bg-zinc-800" />
            </div>
            {/* Streak badge */}
            <div className="h-9 w-32 animate-pulse rounded-xl bg-zinc-800" />
          </div>

          {/* CTA card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="h-2.5 w-20 animate-pulse rounded-full bg-zinc-800" />
                <div className="h-5 w-52 animate-pulse rounded-full bg-zinc-800" />
                <div className="h-3.5 w-64 animate-pulse rounded-full bg-zinc-800" />
              </div>
              <div className="h-11 w-36 animate-pulse rounded-xl bg-zinc-800" />
            </div>
          </div>
        </section>

        {/* ── Activity strip skeleton ─────────────────────────── */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5">
          <div className="h-3 w-3 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-3 w-48 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-3 w-24 animate-pulse rounded-full bg-zinc-800" />
        </div>

        {/* ── KPI section label ───────────────────────────────── */}
        <div className="mb-3 h-3 w-20 animate-pulse rounded-full bg-zinc-800" />

        {/* ── KPI grid skeleton ───────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            'border-l-blue-800',
            'border-l-emerald-800',
            'border-l-amber-800',
            'border-l-red-800',
          ].map((accentClass, i) => (
            <div
              key={i}
              className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-5 border-l-2 ${accentClass}`}
            >
              <div className="mb-3 h-8 w-8 animate-pulse rounded-xl bg-zinc-800" />
              <div className="mb-1.5 h-8 w-16 animate-pulse rounded-full bg-zinc-800" />
              <div className="mb-1 h-2.5 w-24 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-2.5 w-32 animate-pulse rounded-full bg-zinc-800" />
            </div>
          ))}
        </div>

        {/* ── Memory state section skeleton ──────────────────── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div className="space-y-1.5">
              <div className="h-2.5 w-28 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-6 w-36 animate-pulse rounded-full bg-zinc-800" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-24 animate-pulse rounded-lg bg-zinc-800" />
              <div className="h-6 w-24 animate-pulse rounded-lg bg-zinc-800" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5 h-4 w-full animate-pulse rounded-full bg-zinc-800" />

          {/* Legend grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-zinc-700" />
                <div className="space-y-1">
                  <div className="h-2.5 w-16 animate-pulse rounded-full bg-zinc-800" />
                  <div className="h-4 w-12 animate-pulse rounded-full bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
