// pages/api/progress.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { calculateInterval, type Rating, type FSRSState } from '@/lib/fsrs';

/**
 * Receives test results for a module and records FSRS scheduling.
 * Expected payload:
 *   {
 *     moduleNumber: number,
 *     rating: Rating, // "Again" | "Hard" | "Good" | "Easy"
 *   }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { moduleNumber, rating } = req.body as { moduleNumber: number; rating: any };
  if (moduleNumber == null || !rating) {
    return res.status(400).json({ error: 'Missing moduleNumber or rating' });
  }

  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  // Fetch current state for the module's items (simplified: assume one aggregated row per module)
  const { data: stateRows, error: fetchErr } = await supabase
    .from('USER_LEXICAL_STATE')
    .select('id, stability, difficulty, next_review_date')
    .eq('user_id', user.id)
    .eq('module_number', moduleNumber)
    .maybeSingle();

  let currentState: FSRSState = {
    stability: 1,
    difficulty: 0.3,
    lastReview: Date.now(),
    nextReview: Date.now(),
  };

  if (fetchErr && fetchErr.code !== 'PGRST116') {
    // real error
    console.error('Fetch error', fetchErr);
    return res.status(500).json({ error: 'Failed to fetch state' });
  }

  if (stateRows) {
    currentState = {
      stability: (stateRows as any).stability ?? 1,
      difficulty: (stateRows as any).difficulty ?? 0.3,
      lastReview: (stateRows as any).last_review_date ? new Date((stateRows as any).last_review_date).getTime() : Date.now(),
      nextReview: (stateRows as any).next_review_date ? new Date((stateRows as any).next_review_date).getTime() : Date.now(),
    };
  }

  const newState = calculateInterval(currentState, rating);

  // Upsert the new state back
  const { error: upsertErr } = await (supabase as any)
    .from('USER_LEXICAL_STATE')
    .upsert({
      user_id: user.id,
      module_number: moduleNumber,
      stability: newState.stability,
      difficulty: newState.difficulty,
      last_review_date: new Date(newState.lastReview).toISOString(),
      next_review_date: new Date(newState.nextReview).toISOString(),
    }, { onConflict: ['user_id', 'module_number'] });

  if (upsertErr) {
    console.error('Upsert error', upsertErr);
    return res.status(500).json({ error: 'Failed to upsert state' });
  }

  return res.status(200).json({ message: 'Progress recorded', nextReview: newState.nextReview });
}
