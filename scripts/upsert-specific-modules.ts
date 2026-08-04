#!/usr/bin/env node
/**
 * scripts/upsert-specific-modules.ts
 * ──────────────────────────────────
 * Performs a safe upsert for Modules 86, 87, 88, and 89.
 *
 * CRITICAL SAFETY RULES:
 *  - NEVER deletes or resets USER_LEXICAL_STATE.
 *  - Uses Supabase `.upsert()` on `LEXICAL_ITEMS` preserving primary key IDs.
 *  - Prints per-module word counts added/updated.
 *
 * Usage:
 *   npx tsx scripts/upsert-specific-modules.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database, LexicalItemInsert } from '../types/database';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const A = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  cyan:    '\x1b[36m',
};

async function upsertModules86to89() {
  console.log(`\n${A.bold}${A.cyan}━━ Modül 86, 87, 88, 89 Güvenli Upsert İşlemi ━━${A.reset}\n`);

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Read JSON file
  const jsonPath = resolve(process.cwd(), 'scripts', 'data', 'modules.json');
  const jsonContent = readFileSync(jsonPath, 'utf-8');
  const rawItems: any[] = JSON.parse(jsonContent);

  const targetModules = [86, 87, 88, 89];
  const targetItems = rawItems.filter((i) => targetModules.includes(i.module_number));

  console.log(`  ℹ  JSON dosyasında Modül 86-89 için toplam ${targetItems.length} kelime bulundu.`);

  // 2. Fetch existing DB items to match existing UUIDs and preserve foreign keys
  const { data: existingDbItems, error: dbFetchErr } = await (supabase as any)
    .from('LEXICAL_ITEMS')
    .select('id, lemma, module_number')
    .in('module_number', targetModules);

  if (dbFetchErr) {
    console.error(`  ✗ DB sorgu hatası: ${dbFetchErr.message}`);
    process.exit(1);
  }

  const existingMap = new Map<string, string>(); // lemma -> id
  (existingDbItems ?? []).forEach((item: any) => {
    existingMap.set(item.lemma.toLowerCase().trim(), item.id);
  });

  // 3. Prepare upsert rows per module
  const perModuleStats: Record<number, { totalInJson: number; added: number; updated: number; words: string[] }> = {
    86: { totalInJson: 0, added: 0, updated: 0, words: [] },
    87: { totalInJson: 0, added: 0, updated: 0, words: [] },
    88: { totalInJson: 0, added: 0, updated: 0, words: [] },
    89: { totalInJson: 0, added: 0, updated: 0, words: [] },
  };

  const upsertPayload: LexicalItemInsert[] = [];
  let rankCounter = 860;

  targetItems.forEach((item) => {
    const modNum = item.module_number as number;
    const rawWord = item.word ?? item.lemma;
    if (!rawWord || !perModuleStats[modNum]) return;

    const lemma = rawWord.toLowerCase().trim();
    const existingId = existingMap.get(lemma);

    perModuleStats[modNum].totalInJson++;
    perModuleStats[modNum].words.push(lemma);

    if (existingId) {
      perModuleStats[modNum].updated++;
    } else {
      perModuleStats[modNum].added++;
    }

    const collocationsStr = Array.isArray(item.collocations)
      ? item.collocations.join(', ')
      : item.collocations ?? null;

    const primaryTr = item.turkish_translation ?? item.l1_meanings?.[0] ?? null;
    const l1Meanings = item.l1_meanings ?? (primaryTr ? [primaryTr] : null);
    const definition = item.l2_definition ?? item.definition ?? null;

    upsertPayload.push({
      id: existingId ?? randomUUID(),
      lemma,
      pos: item.pos ?? null,
      cefr_level: item.cefr_level ?? null,
      coca_rank: item.coca_rank ?? rankCounter++,
      module_number: modNum,
      turkish_translation: primaryTr,
      synonyms: item.synonyms ?? null,
      antonyms: item.antonyms ?? null,
      l1_meanings: l1Meanings,
      l2_definition: definition,
      collocations: collocationsStr,
      ipa_us: item.ipa_us ?? item.phonetic ?? null,
      ipa_uk: item.ipa_uk ?? null,
      word_family: item.word_family ?? null,
      etymology: item.etymology ?? null,
    });
  });

  // 4. Perform upsert
  const { data: upsertResult, error: upsertErr } = await (supabase as any)
    .from('LEXICAL_ITEMS')
    .upsert(upsertPayload, { onConflict: 'lemma' })
    .select('id, lemma, module_number');

  if (upsertErr) {
    console.error(`  ✗ Upsert hatası: ${upsertErr.message}`);
    process.exit(1);
  }

  // 5. Verify USER_LEXICAL_STATE count
  const { count: stateCount } = await (supabase as any)
    .from('USER_LEXICAL_STATE')
    .select('id', { count: 'exact', head: true });

  // 6. Print summary
  console.log(`${A.bold}${A.green}✓ Upsert İşlemi Başarıyla Tamamlandı!${A.reset}\n`);
  console.log(`${A.bold}Modül Bazlı Aktarım Özeti:${A.reset}`);

  targetModules.forEach((mod) => {
    const stats = perModuleStats[mod];
    console.log(
      `  • ${A.bold}Modül ${mod}${A.reset}: Toplam ${stats.totalInJson} kelime (` +
      `${A.green}+${stats.added} yeni eklenen${A.reset}, ` +
      `${A.yellow}${stats.updated} güncellenen${A.reset})`
    );
    console.log(`    Kelimeler: ${stats.words.join(', ')}`);
  });

  console.log(`\n  ✓ ${A.bold}USER_LEXICAL_STATE${A.reset}: Toplam ${stateCount} satır kullanıcı verisi korundu (Sıfırlanmadı / Dokunulmadı).`);
}

upsertModules86to89().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
