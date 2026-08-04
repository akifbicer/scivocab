// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Centralized Supabase client for reuse across front‑end and API routes.
 * Reads credentials from environment variables.
 */
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Helper to get a Service Role Admin client (bypasses RLS).
 * Falls back to standard client if SUPABASE_SERVICE_ROLE_KEY is omitted.
 */
export function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );
    } catch {}
  }
  return supabase;
}
