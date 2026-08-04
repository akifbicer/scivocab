/**
 * app/lexicon/page.tsx
 * ────────────────────
 * Lexicon Vocabulary Library & Memory Mastered Filter Page
 *
 * Allows users to browse their entire academic vocabulary repertoire with FSRS-6 state filters:
 *  - Tümü (All)
 *  - Öğrenim (Learning)
 *  - Tekrar (Review)
 *  - Mastered (Kalıcı Hafıza - S >= 365 days)
 */

import { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { ArrowLeft, BookOpen, Brain, CheckCircle2, Search, Sparkles, Star, Layers } from 'lucide-react';

import { LexiconClient } from './_components/LexiconClient';

export const metadata: Metadata = {
  title: 'Lexicon — Academic Vocabulary Library',
  description: 'Browse your complete academic vocabulary repertoire and inspect Mastered memory items.',
};

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
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}

export default async function LexiconPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const GUEST_IDS = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000'];
  const userIdsToQuery = user ? [user.id] : GUEST_IDS;

  // Fetch all LEXICAL_ITEMS joined with USER_LEXICAL_STATE
  const { data: itemsData, error } = await supabase
    .from('LEXICAL_ITEMS')
    .select('*, USER_LEXICAL_STATE(*)')
    .order('coca_rank', { ascending: true });

  if (error) {
    console.error('[LexiconPage] Error fetching lexicon:', error.message);
  }

  const items = (itemsData ?? []).map((row: any) => {
    const userStates = row.USER_LEXICAL_STATE as any[] | null;
    const userState =
      userStates?.find((s: any) => userIdsToQuery.includes(s.user_id)) ||
      (userStates && userStates.length > 0 ? userStates[0] : null);

    const rawState = userState?.state ?? 'New';
    const rawStability = userState?.stability ?? 0;

    // Guarantee Mastered status if stability >= 365
    const state = rawStability >= 365 ? 'Mastered' : rawState;

    return {
      id: row.id,
      lemma: row.lemma,
      pos: row.pos,
      cefr_level: row.cefr_level,
      coca_rank: row.coca_rank,
      l1_meaning: row.turkish_meaning || row.meaning_tr || row.l1_meaning || 'Türkçe anlamı',
      l2_definition: row.l2_definition || row.definition || 'English definition',
      context_sentence: row.context_sentence || row.example_sentence || row.example,
      turkish_example: row.turkish_example || row.example_tr,
      module_number: row.module_number ?? 1,
      userState: {
        state,
        stability: rawStability,
        difficulty: userState?.difficulty ?? 0,
        next_review_date: userState?.next_review_date ?? null,
        repetition_count: userState?.repetition_count ?? 0,
      },
    };
  });

  return <LexiconClient items={items} />;
}
