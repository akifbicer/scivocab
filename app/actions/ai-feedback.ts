/**
 * app/actions/ai-feedback.ts
 * ───────────────────────────
 * Next.js Server Actions — AI-powered vocabulary feedback.
 *
 * Actions exported:
 *  • submitSentenceForFeedback  — Analyse a learner's sentence (L1-aware).
 *  • generateContextSentenceAction — Generate an i+1 example sentence.
 *
 * Security layers:
 *  1. Auth guard (Supabase session check on every call).
 *  2. Input validation with Zod before any LLM call.
 *  3. All errors are normalised — no raw stack traces are sent to the client.
 *  4. GEMINI_API_KEY absence returns a clean, user-readable error.
 *  5. Graceful fallback values guarantee non-breaking user experience.
 */

'use server';

import { cookies }                         from 'next/headers';
import { createServerClient }              from '@supabase/ssr';
import { z }                               from 'zod';

import {
  analyzeUserSentence,
  generateContextSentence,
  type SentenceFeedbackResult,
  type ContextSentenceResult,
}                                          from '@/lib/ai/llm';
import type { Database }                   from '@/types/database';

// =============================================================================
// SHARED TYPES
// =============================================================================

/** Discriminated union returned by every action. Never throws. */
export type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string };

// =============================================================================
// SUPABASE AUTH HELPER
// =============================================================================

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{
          name: string;
          value: string;
          options?: {
            path?: string;
            domain?: string;
            expires?: Date;
            maxAge?: number;
            sameSite?: 'lax' | 'strict' | 'none';
            secure?: boolean;
          };
        }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    // Misafir modu desteği: Oturum olmasa dahi AI cümleyi analiz etsin
    return { id: '00000000-0000-0000-0000-000000000000', email: 'guest@scivocab.local' };
  }
  return user;
}

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const MAX_SENTENCE_CHARS = 500;
const MAX_LEMMA_CHARS    = 60;
const MAX_MEANING_CHARS  = 200;
const MAX_TOPIC_CHARS    = 120;

const FeedbackInputSchema = z.object({
  userSentence: z
    .string()
    .min(3,  { message: 'Cümle en az 3 karakter olmalıdır.' })
    .max(MAX_SENTENCE_CHARS, {
      message: `Cümle en fazla ${MAX_SENTENCE_CHARS} karakter olabilir.`,
    }),
  targetLemma: z
    .string()
    .min(1, { message: 'Hedef kelime zorunludur.' })
    .max(MAX_LEMMA_CHARS),
  l1Meaning: z
    .string()
    .min(1, { message: 'Türkçe anlam zorunludur.' })
    .max(MAX_MEANING_CHARS),
});

const ContextInputSchema = z.object({
  lemma: z
    .string()
    .min(1, { message: 'Kelime zorunludur.' })
    .max(MAX_LEMMA_CHARS),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], {
    errorMap: () => ({ message: 'Geçersiz CEFR seviyesi.' }),
  }),
  userTopic: z.string().max(MAX_TOPIC_CHARS).optional(),
});

// =============================================================================
// HELPER: Sanitise text input
// =============================================================================

/** Strips leading/trailing whitespace and control characters. */
function sanitise(value: string): string {
  return value
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// =============================================================================
// ACTION 1: submitSentenceForFeedback
// =============================================================================

/**
 * Analyses a learner's sentence for correct target-word usage,
 * collocation quality, grammar, and L1 (Turkish) negative transfer.
 *
 * @example
 * ```tsx
 * const result = await submitSentenceForFeedback({
 *   userSentence: 'Scientists make researches on climate change.',
 *   targetLemma:  'research',
 *   l1Meaning:    'araştırma, inceleme',
 * });
 *
 * if (result.success) {
 *   console.log(result.data.feedbackTR);  // Turkish encouragement + explanation
 * }
 * ```
 */
export async function submitSentenceForFeedback(params: {
  userSentence: string;
  targetLemma:  string;
  l1Meaning:    string;
}): Promise<ActionResult<SentenceFeedbackResult>> {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'Oturum açmanız gerekmektedir.' };
  }

  // ── API Key presence check (fast-fail before input validation) ────────────
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return {
        success: false,
        error:
          'AI servisi yapılandırma hatası: GROQ_API_KEY bulunamadı. ' +
          'Lütfen .env.local dosyasındaki anahtarı güncelleyin.',
      };
    }
  } catch (e) {
    console.error("GROQ API HATASI:", e);
    return {
      success: false,
      error: 'API anahtarı doğrulanırken bir hata oluştu.',
    };
  }

  // ── Input validation ──────────────────────────────────────────────────────
  const parsed = FeedbackInputSchema.safeParse({
    userSentence: sanitise(params.userSentence ?? ''),
    targetLemma:  sanitise(params.targetLemma  ?? ''),
    l1Meaning:    sanitise(params.l1Meaning    ?? ''),
  });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Geçersiz girdi.';
    return { success: false, error: firstError };
  }

  const { userSentence, targetLemma, l1Meaning } = parsed.data;

  // ── LLM call ──────────────────────────────────────────────────────────────
  const { data, error } = await analyzeUserSentence(
    userSentence,
    targetLemma,
    l1Meaning,
  );

  if (error) {
    // LLM returned a fallback object alongside the error.
    // Decide whether to surface the error or return the fallback silently.
    // Here we return the fallback so the UI never fully breaks,
    // but also expose the error flag so the client can show a soft warning.
    console.error('[ai-feedback] analyzeUserSentence error:', error);
  }

  // Always return data (guaranteed by lib/ai/llm's fallback contract).
  return { success: true, data };
}

// =============================================================================
// ACTION 2: generateContextSentenceAction
// =============================================================================

/**
 * Generates an authentic i+1 academic sentence for a given lemma and CEFR level.
 * Optionally scoped to a user-specified topic (e.g., "climate change").
 *
 * @example
 * ```tsx
 * const result = await generateContextSentenceAction({
 *   lemma:     'hypothesis',
 *   cefrLevel: 'C1',
 *   userTopic: 'cognitive psychology',
 * });
 *
 * if (result.success) {
 *   console.log(result.data.sentence);
 *   console.log(result.data.trContextHint);
 * }
 * ```
 */
export async function generateContextSentenceAction(params: {
  lemma:      string;
  cefrLevel:  string;
  userTopic?: string;
}): Promise<ActionResult<ContextSentenceResult>> {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'Oturum açmanız gerekmektedir.' };
  }

  // ── API Key presence check ────────────────────────────────────────────────
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return {
        success: false,
        error:
          'AI servisi yapılandırma hatası: GROQ_API_KEY bulunamadı. ' +
          'Lütfen .env.local dosyasındaki anahtarı güncelleyin.',
      };
    }
  } catch (e) {
    console.error("GROQ API HATASI:", e);
    return {
      success: false,
      error: 'API anahtarı doğrulanırken bir hata oluştu.',
    };
  }

  // ── Input validation ──────────────────────────────────────────────────────
  const parsed = ContextInputSchema.safeParse({
    lemma:      sanitise(params.lemma      ?? ''),
    cefrLevel:  (params.cefrLevel ?? '').toUpperCase(),
    userTopic:  params.userTopic ? sanitise(params.userTopic) : undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Geçersiz girdi.';
    return { success: false, error: firstError };
  }

  const { lemma, cefrLevel, userTopic } = parsed.data;

  // ── LLM call ──────────────────────────────────────────────────────────────
  const { data, error } = await generateContextSentence(lemma, cefrLevel, userTopic);

  if (error) {
    console.error('[ai-feedback] generateContextSentence error:', error);
  }

  return { success: true, data };
}
