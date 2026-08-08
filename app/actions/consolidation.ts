/**
 * app/actions/consolidation.ts
 * ──────────────────────────────
 * Server Actions for Post-Flashcard Consolidation Flow:
 *  1. getConsolidationDataAction: Retrieves Cloze & TR->EN Translation questions
 *  2. saveConsolidationResultsAction: Logs exercise scores & updates FSRS difficulty (D)
 */

'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseDirectClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';
import { getModuleConsolidationData, type ModuleConsolidationData } from '@/lib/data/consolidation-data';

const GUEST_IDS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
];

async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
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
          options?: any;
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

export async function getConsolidationDataAction(moduleNumber: number): Promise<{
  success: boolean;
  data?: ModuleConsolidationData;
  error?: string;
}> {
  try {
    const data = getModuleConsolidationData(moduleNumber);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch consolidation data' };
  }
}

export interface SubmitConsolidationPayload {
  moduleNumber: number;
  clozeScore: number;
  translationScore: number;
  failedWords: string[];
}

export async function saveConsolidationResultsAction(payload: SubmitConsolidationPayload): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activeUserId = user?.id ?? GUEST_IDS[0];
  const userIdsToQuery = user ? Array.from(new Set([user.id, ...GUEST_IDS])) : GUEST_IDS;

  const totalScore = Math.round((payload.clozeScore + payload.translationScore) / 2);

  // ── 1. Log consolidation exercise to EXERCISE_LOGS table ─────────────────────
  try {
    await (dbClient as any).from('EXERCISE_LOGS').insert({
      user_id: activeUserId,
      module_number: payload.moduleNumber,
      cloze_score: payload.clozeScore,
      translation_score: payload.translationScore,
      total_score: totalScore,
      completed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[saveConsolidationResultsAction] EXERCISE_LOGS insert warning (table might be unmigrated):', err.message);
  }

  // ── 2. FSRS Feedback Loop: Slightly increase difficulty (D) for failed words ────
  if (payload.failedWords && payload.failedWords.length > 0) {
    try {
      const normalizedFailed = payload.failedWords.map((w) => w.toLowerCase().trim());

      // Fetch matching lexical item IDs
      const { data: lexRows } = await (dbClient as any)
        .from('LEXICAL_ITEMS')
        .select('id, lemma')
        .in('lemma', normalizedFailed);

      if (lexRows && lexRows.length > 0) {
        const lexIds = lexRows.map((r: any) => r.id);

        // Fetch current USER_LEXICAL_STATE rows
        const { data: stateRows } = await (dbClient as any)
          .from('USER_LEXICAL_STATE')
          .select('id, difficulty')
          .in('user_id', userIdsToQuery)
          .in('lexical_item_id', lexIds);

        if (stateRows && stateRows.length > 0) {
          for (const row of stateRows) {
            const currentD = row.difficulty ?? 5.0;
            const newD = Math.min(10.0, Math.round((currentD + 0.5) * 10) / 10);

            await (dbClient as any)
              .from('USER_LEXICAL_STATE')
              .update({ difficulty: newD })
              .eq('id', row.id);
          }
        }
      }
    } catch (err: any) {
      console.warn('[saveConsolidationResultsAction] FSRS difficulty update warning:', err.message);
    }
  }

  // ── 3. Revalidate path caches ────────────────────────────────────────────────
  try {
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/practice');
  } catch {}

  return { success: true };
}
