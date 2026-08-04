/**
 * app/actions/srs.ts
 * ──────────────────
 * Server Action — Global Review Engine Query & Data Logic
 *
 * Fetches due review cards across all modules for SRS global review sessions.
 */

'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseDirectClient } from '@supabase/supabase-js';

import type { Database, UserLexicalStateRow, LexicalItemRow } from '@/types/database';
import type { SessionCard } from '@/hooks/usePracticeSession';
import { getSampleSentence } from '@/lib/data/awl-sentences';
import { getDemirtasSentenceInfo } from '@/lib/data/demirtas-sentences';

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

export interface GlobalDueCardsResult {
  cards: SessionCard[];
  dueCount: number;
}

/**
 * getGlobalDueCards
 * ─────────────────
 * Fetches all due review cards across all modules for the current user.
 *
 * Filter criteria:
 *  - state IN ('Learning', 'Re-learning', 'Review')
 *  - next_review_date <= NOW()
 *  - stability < 365 (excludes Mastered)
 *  - excludes New cards (never started)
 *  - sorted by next_review_date ASC (closest to being forgotten on top)
 *  - includes module info (module_id, module_name) via join with LEXICAL_ITEMS
 */
export async function getGlobalDueCards(): Promise<GlobalDueCardsResult> {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userIdsToQuery = user ? Array.from(new Set([user.id, ...GUEST_IDS])) : GUEST_IDS;
  const nowIso = new Date().toISOString();

  try {
    const { data: rows, error } = await (dbClient as any)
      .from('USER_LEXICAL_STATE')
      .select('*, LEXICAL_ITEMS(*)')
      .in('user_id', userIdsToQuery)
      .in('state', ['Learning', 'Re-learning', 'Review'])
      .lte('next_review_date', nowIso)
      .lt('stability', 365)
      .order('next_review_date', { ascending: true });

    if (error) {
      console.error('[getGlobalDueCards] Database fetch error:', error.message);
      return { cards: [], dueCount: 0 };
    }

    const cards: SessionCard[] = [];

    for (const row of rows ?? []) {
      const lexicalItem = row.LEXICAL_ITEMS as LexicalItemRow | null;
      if (!lexicalItem) continue;

      const userState: UserLexicalStateRow = {
        id: row.id,
        user_id: row.user_id,
        lexical_item_id: row.lexical_item_id,
        state: row.state,
        stability: row.stability ?? 0,
        difficulty: row.difficulty ?? 0,
        last_review_date: row.last_review_date,
        next_review_date: row.next_review_date,
        lapses: row.lapses ?? 0,
        repetition_count: row.repetition_count ?? 0,
        avg_latency_ms: row.avg_latency_ms ?? 0,
      };

      const demirtasInfo = getDemirtasSentenceInfo(lexicalItem.lemma);
      const contextSentence =
        (lexicalItem as any).context_sentence ||
        (lexicalItem as any).example_sentence ||
        demirtasInfo?.exampleSentence ||
        getSampleSentence(lexicalItem.lemma);

      const moduleId = lexicalItem.module_number ?? 1;
      const moduleName = `Modül ${moduleId}`;

      cards.push({
        userState,
        lexicalItem,
        contextSentence,
        module_id: moduleId,
        module_name: moduleName,
      });
    }

    return {
      cards,
      dueCount: cards.length,
    };
  } catch (err) {
    console.error('[getGlobalDueCards] Exception fetching cards:', err);
    return { cards: [], dueCount: 0 };
  }
}
