/**
 * app/practice/page.tsx
 * ─────────────────────
 * Server Component — Data fetching entry point for the practice session.
 *
 * Responsibilities:
 *  1. Authenticate the caller (redirect to /login if not signed in).
 *  2. Query Supabase for:
 *       a) If module parameter (?module=X) is present: fetch words for that module directly.
 *       b) If module parameter is not present: query due review cards + new cards for general SRS session.
 *  3. Merge, normalise, and forward the card list to the interactive
 *     <PracticeClient /> component.
 */

import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';

import type { Database, LexicalItemRow, UserLexicalStateRow } from '@/types/database';
import type { SessionCard } from '@/hooks/usePracticeSession';
import { getSampleSentence } from '@/lib/data/awl-sentences';
import { getDemirtasSentenceInfo } from '@/lib/data/demirtas-sentences';
import { PracticeClient } from './_components/PracticeClient';

// =============================================================================
// SEO METADATA
// =============================================================================

export const metadata: Metadata = {
  title: 'Practice Session — SciVocab',
  description: 'Your personalised FSRS-6 spaced-repetition vocabulary review session.',
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum new words introduced per day / per module. */
const DAILY_NEW_CARD_LIMIT = 10;

// =============================================================================
// SUPABASE SERVER CLIENT
// =============================================================================

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

// =============================================================================
// ROW → SessionCard CONVERTER
// =============================================================================

/** Shape returned by Supabase when we SELECT with the LEXICAL_ITEMS join. */
type UserStateWithItem = UserLexicalStateRow & {
  LEXICAL_ITEMS: LexicalItemRow | null;
};

function toSessionCard(row: UserStateWithItem): SessionCard | null {
  if (!row.LEXICAL_ITEMS) return null; // orphaned state row — skip

  const { LEXICAL_ITEMS: lexicalItem, ...userState } = row;
  const demirtasInfo = getDemirtasSentenceInfo(lexicalItem.lemma);

  const contextSentence =
    (lexicalItem as any).context_sentence ||
    (lexicalItem as any).example_sentence ||
    demirtasInfo?.exampleSentence ||
    getSampleSentence(lexicalItem.lemma);

  return { userState, lexicalItem, contextSentence };
}

// =============================================================================
// PAGE
// =============================================================================

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // ── Auth guard / Misafir deneme modu desteği ────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? '00000000-0000-0000-0000-000000000000';

  // ── 1. Resolve searchParams (Next.js 15 async standard) ─────────────────────
  const params = await searchParams;
  const moduleParam = params?.module;
  const activeModule = moduleParam ? (parseInt(moduleParam, 10) || 1) : 1;

  console.log('🔍 [DEBUG] moduleParam:', moduleParam);

  // ── 2. Next upcoming review timestamp (for empty-state countdown) ─────────
  const { data: nextDueRow } = await supabase
    .from('USER_LEXICAL_STATE')
    .select('next_review_date')
    .eq('user_id', userId)
    .not('state', 'eq', 'Mastered')
    .gt('next_review_date', now)
    .order('next_review_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  const nextDueAt = nextDueRow?.next_review_date ?? null;

  let initialCards: SessionCard[] = [];

  if (moduleParam) {
    // ── Module Mode (?module=X) ──────────────────────────────────────────────
    const moduleNumber = parseInt(moduleParam, 10);
    const { data: rawItems, error: moduleError } = await supabase
      .from('LEXICAL_ITEMS')
      .select('*, USER_LEXICAL_STATE(*)')
      .eq('module_number', moduleNumber)
      .order('coca_rank', { ascending: true })
      .limit(DAILY_NEW_CARD_LIMIT);

    console.log('🔍 [DEBUG] Çekilen Kelimeler:', rawItems?.map((i: any) => i.lemma));

    if (moduleError) {
      console.error('[PracticePage] module cards fetch error:', moduleError.message);
    }

    const nowTime = new Date(now).getTime();

    const allModuleCards = (rawItems ?? []).map((row: any) => {
      const userStateRows = row.USER_LEXICAL_STATE as any[] | null;
      const userStateRow =
        userStateRows?.find((s: any) => s.user_id === userId) ||
        (userStateRows && userStateRows.length > 0 ? userStateRows[0] : null);

      const demirtasInfo = getDemirtasSentenceInfo(row.lemma);
      const sentence =
        row.context_sentence ||
        row.example_sentence ||
        demirtasInfo?.exampleSentence ||
        getSampleSentence(row.lemma);

      if (userStateRow) {
        return {
          userState: userStateRow as UserLexicalStateRow,
          lexicalItem: row as any,
          contextSentence: sentence,
        };
      }
      return {
        userState: {
          id: '00000000-0000-0000-0000-000000000000',
          user_id: userId,
          lexical_item_id: row.id,
          state: 'New',
          stability: 0,
          difficulty: 0,
          last_review_date: null,
          next_review_date: null,
          lapses: 0,
          repetition_count: 0,
          avg_latency_ms: 0,
        } as UserLexicalStateRow,
        lexicalItem: row as any,
        contextSentence: sentence,
      };
    });

    // ── Strict FSRS-6 SRS Filtering for Module Practice Session ──────────────
    initialCards = allModuleCards.filter((card) => {
      const state = card.userState.state;
      const stability = card.userState.stability ?? 0;
      const nextReviewDate = card.userState.next_review_date;

      // 1. Exclude Mastered cards (stability >= 365 or state === 'Mastered')
      if (state === 'Mastered' || stability >= 365) {
        return false;
      }

      // 2. Exclude Review cards that are not yet due (next_review_date > now)
      if (state === 'Review' && nextReviewDate) {
        const reviewTime = new Date(nextReviewDate).getTime();
        if (reviewTime > nowTime) {
          return false;
        }
      }

      // 3. Keep New, Learning, Re-learning, or Due Review cards
      return true;
    });
  } else {
    // ── General Practice Mode ─────────────────────────────────────────────────
    // a) Due review cards
    const { data: dueRows, error: dueError } = await supabase
      .from('USER_LEXICAL_STATE')
      .select('*, LEXICAL_ITEMS(*)')
      .eq('user_id', userId)
      .in('state', ['Learning', 'Review', 'Re-learning'])
      .lte('next_review_date', now)
      .order('next_review_date', { ascending: true });

    if (dueError) {
      console.error('[PracticePage] due cards fetch error:', dueError.message);
    }

    // b) New cards (daily limit)
    const { data: newRows, error: newError } = await supabase
      .from('LEXICAL_ITEMS')
      .select('*, USER_LEXICAL_STATE(*)')
      .order('coca_rank', { ascending: true })
      .limit(DAILY_NEW_CARD_LIMIT);

    if (newError) {
      console.error('[PracticePage] new cards fetch error:', newError.message);
    }

    const dueCards: SessionCard[] = ((dueRows as UserStateWithItem[] | null) ?? [])
      .map(toSessionCard)
      .filter((c): c is SessionCard => c !== null);

    const newCards: SessionCard[] = (newRows ?? []).map((row: any) => {
      const userStateRows = row.USER_LEXICAL_STATE as any[] | null;
      if (userStateRows && userStateRows.length > 0 && userStateRows[0].state === 'New') {
        return {
          userState: userStateRows[0] as UserLexicalStateRow,
          lexicalItem: row as any,
          contextSentence:
            row.context_sentence ||
            row.example_sentence ||
            getSampleSentence(row.lemma),
        };
      }
      return {
        userState: {
          id: '00000000-0000-0000-0000-000000000000',
          user_id: userId,
          lexical_item_id: row.id,
          state: 'New',
          stability: 0,
          difficulty: 0,
          last_review_date: null,
          next_review_date: null,
          lapses: 0,
          repetition_count: 0,
          avg_latency_ms: 0,
        } as UserLexicalStateRow,
        lexicalItem: row as any,
        contextSentence:
          row.context_sentence ||
          row.example_sentence ||
          getSampleSentence(row.lemma),
      };
    });

    initialCards = [...dueCards, ...newCards];
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <PracticeClient
      initialCards={initialCards}
      nextDueAt={nextDueAt}
      currentModule={activeModule}
    />
  );
}
