/**
 * app/actions/review.ts
 * ----------------------
 * Server Action — Submit a Card Review
 *
 * Orchestrates the full review pipeline:
 *  1. Validate input
 *  2. Authenticate caller (auth guard with guest fallback ID)
 *  3. Fetch or initialize USER_LEXICAL_STATE row
 *  4. Run FSRS-6 engine (pure computation, no I/O)
 *  5. Persist using Admin client (bypassing RLS for Server Action writes)
 *  6. Revalidate pages ('/', '/dashboard', '/practice')
 *  7. Return typed result
 */

'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseDirectClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { processReview }          from '@/lib/fsrs';
import type { Database }          from '@/types/database';
import type { InteractionEnum }   from '@/types/database';
import type { UserLexicalStateRow, ReviewLogRow } from '@/types/database';

const GUEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// =============================================================================
// SUPABASE CLIENT FACTORIES
// =============================================================================

/** Standard SSR client for reading auth session. */
async function createClient() {
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

/** Admin client using Service Role Key to bypass RLS policies on server-side writes. */
function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  try {
    return createSupabaseDirectClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  } catch (e) {
    console.error('[createAdminClient] Failed to initialize admin client:', e);
    return null;
  }
}

// =============================================================================
// INPUT SCHEMA (Zod)
// =============================================================================

const SubmitReviewSchema = z.object({
  /** UUID of the USER_LEXICAL_STATE row to review. */
  userStateId: z.string().uuid({ message: 'userStateId must be a valid UUID.' }),

  /** Optional LEXICAL_ITEMS.id if available. */
  lexicalItemId: z.string().uuid().optional(),

  /**
   * FSRS rating:
   *  1 = Again (forgotten)
   *  2 = Hard
   *  3 = Good
   *  4 = Easy
   */
  rating: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ], { errorMap: () => ({ message: 'rating must be 1, 2, 3, or 4.' }) }),

  /** Time from card display to user response, in milliseconds. */
  latencyMs: z
    .number()
    .int()
    .positive({ message: 'latencyMs must be a positive integer.' }),

  /** Optional: recall mode used during this review session. */
  interactionType: z
    .enum(['ActiveRecall', 'Writing', 'Listening', 'Speaking'])
    .optional(),
});

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;

// =============================================================================
// RETURN TYPE
// =============================================================================

export type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string; code?: string };

export interface SubmitReviewData {
  /** Updated scheduling state (after FSRS-6 recalculation). */
  updatedState: UserLexicalStateRow;
  /** The immutable log entry that was inserted. */
  reviewLog: ReviewLogRow;
}

// =============================================================================
// SERVER ACTION
// =============================================================================

export async function submitCardReview(
  input: SubmitReviewInput,
): Promise<ActionResult<SubmitReviewData>> {
  // ── 1. Input validation ──────────────────────────────────────────────────
  const parsed = SubmitReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:   parsed.error.errors.map((e) => e.message).join(' | '),
      code:    'VALIDATION_ERROR',
    };
  }

  const { userStateId, lexicalItemId, rating, latencyMs, interactionType } = parsed.data;

  // ── 2. Client & Auth Setup ────────────────────────────────────────────────
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? GUEST_USER_ID;

  // ── 3. Fetch or initialize USER_LEXICAL_STATE ─────────────────────────────
  let currentState: UserLexicalStateRow | null = null;

  if (userStateId && userStateId !== '00000000-0000-0000-0000-000000000000') {
    try {
      const { data } = await dbClient
        .from('USER_LEXICAL_STATE')
        .select('*')
        .eq('id', userStateId)
        .maybeSingle();
      if (data) currentState = data as UserLexicalStateRow;
    } catch {}
  }

  if (!currentState && lexicalItemId) {
    try {
      const { data } = await dbClient
        .from('USER_LEXICAL_STATE')
        .select('*')
        .eq('user_id', userId)
        .eq('lexical_item_id', lexicalItemId)
        .maybeSingle();
      if (data) currentState = data as UserLexicalStateRow;
    } catch {}
  }

  if (!currentState) {
    const targetLexicalItemId = lexicalItemId ?? '00000000-0000-0000-0000-000000000000';
    currentState = {
      id: userStateId !== '00000000-0000-0000-0000-000000000000' ? userStateId : '00000000-0000-0000-0000-000000000000',
      user_id: userId,
      lexical_item_id: targetLexicalItemId,
      state: 'New',
      stability: 0,
      difficulty: 0,
      last_review_date: null,
      next_review_date: null,
      lapses: 0,
      repetition_count: 0,
      avg_latency_ms: 0,
    };
  }

  // ── 4. Run FSRS-6 engine ────────────────────────────────────────────────
  const reviewedAt = new Date();

  let engineResult: ReturnType<typeof processReview>;
  try {
    engineResult = processReview(
      currentState,
      rating,
      latencyMs,
      interactionType as InteractionEnum | undefined,
      reviewedAt,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown engine error.';
    return {
      success: false,
      error:   `FSRS engine error: ${message}`,
      code:    'ENGINE_ERROR',
    };
  }

  const { stateUpdate, logPayload } = engineResult;

  // ── 5. Upsert USER_LEXICAL_STATE with RLS Bypass ─────────────────────────
  const upsertPayload = {
    ...(currentState.id && currentState.id !== '00000000-0000-0000-0000-000000000000' ? { id: currentState.id } : {}),
    user_id: userId,
    lexical_item_id: currentState.lexical_item_id,
    ...stateUpdate,
  };

  let updatedState: UserLexicalStateRow | null = null;
  try {
    const { data, error: updateError } = await (dbClient as any)
      .from('USER_LEXICAL_STATE')
      .upsert(upsertPayload, { onConflict: 'user_id, lexical_item_id' })
      .select()
      .single();

    if (updateError) {
      console.warn('[submitCardReview] DB update warning:', updateError.message);
    } else if (data) {
      updatedState = data as UserLexicalStateRow;
    }

    console.log("FSRS_SAVE_DEBUG:", {
      user_id: userId,
      lexical_item_id: currentState.lexical_item_id,
      rating,
      calculated_stability: stateUpdate.stability,
      calculated_state: stateUpdate.state,
      repetition_count: stateUpdate.repetition_count,
      db_response_data: updatedState,
    });
  } catch (e) {
    console.warn('[submitCardReview] Exception updating state:', e);
  }

  // Fallback state if DB write skipped/warned
  const finalState: UserLexicalStateRow = updatedState ?? {
    ...currentState,
    ...stateUpdate,
    id: currentState.id !== '00000000-0000-0000-0000-000000000000' ? currentState.id : '00000000-0000-0000-0000-000000000001',
  };

  // ── 6. Insert REVIEW_LOGS ────────────────────────────────────────────────
  const logRecord = {
    ...logPayload,
    user_state_id: finalState.id,
  };

  let reviewLog: ReviewLogRow | null = null;
  try {
    const { data, error: insertError } = await (dbClient as any)
      .from('REVIEW_LOGS')
      .insert(logRecord)
      .select()
      .single();

    if (insertError) {
      console.warn('[submitCardReview] Log insert warning:', insertError.message);
    } else if (data) {
      reviewLog = data as ReviewLogRow;
    }
  } catch (e) {
    console.warn('[submitCardReview] Exception inserting log:', e);
  }

  const finalLog: ReviewLogRow = reviewLog ?? ({
    id: '00000000-0000-0000-0000-000000000001',
    ...logRecord,
  } as ReviewLogRow);

  // ── 7. Revalidate paths for Next.js cache ────────────────────────────────
  try {
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/practice');
  } catch {}

  // ── 8. Return success ────────────────────────────────────────────────────
  return {
    success: true,
    data: {
      updatedState: finalState,
      reviewLog: finalLog,
    },
  };
}
