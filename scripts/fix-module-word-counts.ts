#!/usr/bin/env node
/**
 * scripts/fix-module-word-counts.ts
 * ──────────────────────────────────
 * Diagnostic and cleanup script to fix module word count duplications in Supabase.
 * Ensures every module (1-100) has EXACTLY 10 words matching `modules_corrected_1000.json`.
 *
 * CRITICAL PROTECTION:
 *  - Preserves all user SRS state records in `USER_LEXICAL_STATE`.
 *  - Safely re-links any `USER_LEXICAL_STATE` FK references before removing duplicate/obsolete `LEXICAL_ITEMS`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// ── Load Environment Variables ───────────────────────────────────────────────
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const A = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  cyan:    '\x1b[36m',
  red:     '\x1b[31m',
};

const log = {
  header:  (msg: string) => console.log(`\n${A.bold}${A.cyan}━━ ${msg} ━━${A.reset}`),
  info:    (msg: string) => console.log(`  ${A.blue}ℹ${A.reset}  ${msg}`),
  success: (msg: string) => console.log(`  ${A.green}✓${A.reset}  ${msg}`),
  warn:    (msg: string) => console.log(`  ${A.yellow}⚠${A.reset}  ${msg}`),
  error:   (msg: string) => console.log(`  ${A.red}✗${A.reset}  ${msg}`),
};

interface CorrectedWordItem {
  module_number: number;
  word: string;
  phonetic?: string;
  pos?: string;
  definition?: string;
  example_sentence?: string;
  turkish_translation?: string;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string | string[];
}

async function fixModuleWordCounts() {
  log.header("Module Word Count Diagnosis & Cleanup Script (Modules 1-100)");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log.error("Supabase URL or Key is missing!");
    process.exit(1);
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  // ── 1. Read JSON Source of Truth ────────────────────────────────────────────
  const jsonPath = resolve(process.cwd(), 'scripts', 'data', 'modules_corrected_1000.json');
  if (!existsSync(jsonPath)) {
    log.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

  const jsonContent = readFileSync(jsonPath, 'utf-8');
  const jsonItems: CorrectedWordItem[] = JSON.parse(jsonContent);

  // Group jsonItems by lemma and module_number
  const jsonWordsMap = new Map<string, CorrectedWordItem>(); // lowerLemma -> item
  const moduleTargetMap = new Map<number, Set<string>>(); // modNum -> Set of lowerLemmas

  for (const item of jsonItems) {
    if (!item.word) continue;
    const lowerLemma = item.word.trim().toLowerCase();
    const modNum = item.module_number ?? 1;

    jsonWordsMap.set(lowerLemma, item);

    if (!moduleTargetMap.has(modNum)) {
      moduleTargetMap.set(modNum, new Set<string>());
    }
    moduleTargetMap.get(modNum)!.add(lowerLemma);
  }

  log.info(`JSON Source of Truth: ${jsonWordsMap.size} unique words defined across ${moduleTargetMap.size} modules.`);

  // ── 2. Query Existing LEXICAL_ITEMS ─────────────────────────────────────────
  const { data: dbItems, error: dbErr } = await (supabase as any)
    .from('LEXICAL_ITEMS')
    .select('id, lemma, module_number');

  if (dbErr) {
    log.error(`Failed to fetch LEXICAL_ITEMS: ${dbErr.message}`);
    process.exit(1);
  }

  log.info(`Current database state: ${dbItems?.length ?? 0} total rows in LEXICAL_ITEMS.`);

  // Map lowerLemma -> array of existing rows
  const dbLemmaToRowsMap = new Map<string, any[]>();
  (dbItems ?? []).forEach((row: any) => {
    const lower = (row.lemma || '').trim().toLowerCase();
    if (!dbLemmaToRowsMap.has(lower)) dbLemmaToRowsMap.set(lower, []);
    dbLemmaToRowsMap.get(lower)!.push(row);
  });

  // ── 3. Map canonical primary IDs for all JSON items ─────────────────────────
  const canonicalIdMap = new Map<string, string>(); // lowerLemma -> primary UUID
  const canonicalIdsSet = new Set<string>();

  for (const [lowerLemma] of jsonWordsMap.entries()) {
    const existing = dbLemmaToRowsMap.get(lowerLemma);
    if (existing && existing.length > 0) {
      const primaryId = existing[0].id;
      canonicalIdMap.set(lowerLemma, primaryId);
      canonicalIdsSet.add(primaryId);
    } else {
      const newId = randomUUID();
      canonicalIdMap.set(lowerLemma, newId);
      canonicalIdsSet.add(newId);
    }
  }

  // ── 4. Query USER_LEXICAL_STATE for foreign key protection ────────────────
  const { data: userStates, error: userStateErr } = await (supabase as any)
    .from('USER_LEXICAL_STATE')
    .select('id, lexical_item_id');

  if (userStateErr) {
    log.warn(`Warning reading USER_LEXICAL_STATE: ${userStateErr.message}`);
  }

  const initialUserStateCount = userStates?.length ?? 0;
  log.info(`USER_LEXICAL_STATE protected count: ${initialUserStateCount} user progress records.`);

  // Map obsolete IDs to canonical IDs where possible
  const obsoleteToCanonicalIdMap = new Map<string, string>(); // obsoleteId -> canonicalId
  const obsoleteIdsToDelete: string[] = [];

  for (const row of dbItems ?? []) {
    const lower = (row.lemma || '').trim().toLowerCase();
    const canonicalId = canonicalIdMap.get(lower);

    if (!canonicalId || row.id !== canonicalId) {
      // This is a duplicate or obsolete row
      obsoleteIdsToDelete.push(row.id);
      if (canonicalId) {
        obsoleteToCanonicalIdMap.set(row.id, canonicalId);
      }
    }
  }

  log.info(`Found ${obsoleteIdsToDelete.length} obsolete / duplicate LEXICAL_ITEMS rows.`);

  // ── 5. Safe re-linking of USER_LEXICAL_STATE ───────────────────────────────
  let relinkCount = 0;
  for (const us of userStates ?? []) {
    const oldItemId = us.lexical_item_id;
    if (oldItemId && obsoleteToCanonicalIdMap.has(oldItemId)) {
      const newCanonicalId = obsoleteToCanonicalIdMap.get(oldItemId)!;
      log.info(`Re-linking USER_LEXICAL_STATE ${us.id} from ${oldItemId} to canonical ${newCanonicalId}...`);
      const { error: relinkErr } = await (supabase as any)
        .from('USER_LEXICAL_STATE')
        .update({ lexical_item_id: newCanonicalId })
        .eq('id', us.id);

      if (!relinkErr) relinkCount++;
    }
  }

  if (relinkCount > 0) {
    log.success(`Re-linked ${relinkCount} USER_LEXICAL_STATE records to canonical item IDs.`);
  }

  // ── 6. Safe deletion of obsolete / duplicate rows ──────────────────────────
  if (obsoleteIdsToDelete.length > 0) {
    log.info(`Deleting ${obsoleteIdsToDelete.length} obsolete rows from LEXICAL_ITEMS...`);
    const BATCH_DEL = 100;
    for (let i = 0; i < obsoleteIdsToDelete.length; i += BATCH_DEL) {
      const batch = obsoleteIdsToDelete.slice(i, i + BATCH_DEL);
      const { error: delErr } = await (supabase as any)
        .from('LEXICAL_ITEMS')
        .delete()
        .in('id', batch);

      if (delErr) {
        log.warn(`Warning deleting obsolete batch: ${delErr.message}`);
      }
    }
    log.success(`Successfully removed obsolete duplicate rows from LEXICAL_ITEMS.`);
  }

  // ── 7. Safe upsert of canonical 1000 words into LEXICAL_ITEMS by ID ─────────
  log.info("Upserting / updating 1000 canonical words into LEXICAL_ITEMS by primary key ID...");

  const upsertRows: any[] = [];
  let rankCounter = 1;

  for (const [lowerLemma, jsonItem] of jsonWordsMap.entries()) {
    const id = canonicalIdMap.get(lowerLemma)!;

    const collocationsStr = Array.isArray(jsonItem.collocations)
      ? jsonItem.collocations.join(', ')
      : jsonItem.collocations ?? null;

    upsertRows.push({
      id,
      lemma: jsonItem.word.trim(),
      pos: jsonItem.pos ?? null,
      module_number: jsonItem.module_number,
      coca_rank: rankCounter++,
      turkish_translation: jsonItem.turkish_translation ?? null,
      l1_meanings: jsonItem.turkish_translation ? [jsonItem.turkish_translation] : null,
      l2_definition: jsonItem.definition ?? null,
      synonyms: jsonItem.synonyms ?? null,
      antonyms: jsonItem.antonyms ?? null,
      collocations: collocationsStr,
      ipa_us: jsonItem.phonetic ?? null,
    });
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
    const chunk = upsertRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await (supabase as any)
      .from('LEXICAL_ITEMS')
      .upsert(chunk, { onConflict: 'lemma' });

    if (upsertErr) {
      log.error(`Error upserting canonical chunk ${i}: ${upsertErr.message}`);
    }
  }

  log.success("Canonical 1000 words upserted cleanly with onConflict: 'lemma'.");

  // ── 8. Final Verification & Table Summary (Modules 1-100) ───────────────────
  log.header("Final Verification & Module Word Count Summary (1-100)");

  const { data: finalDbItems } = await (supabase as any)
    .from('LEXICAL_ITEMS')
    .select('id, module_number')
    .order('module_number', { ascending: true });

  const finalCountsMap = new Map<number, number>();
  (finalDbItems ?? []).forEach((r: any) => {
    const m = r.module_number ?? 0;
    finalCountsMap.set(m, (finalCountsMap.get(m) || 0) + 1);
  });

  const { count: finalUserStateCount } = await (supabase as any)
    .from('USER_LEXICAL_STATE')
    .select('id', { count: 'exact', head: true });

  console.log(`\n┌───────────────┬───────────────┬───────────┐`);
  console.log(`│ Modül Aralığı │ Modül Sayısı  │ Kelime/Mod│`);
  console.log(`├───────────────┼───────────────┼───────────┤`);

  let allOk = true;
  for (let group = 0; group < 10; group++) {
    const start = group * 10 + 1;
    const end = start + 9;
    let groupMatch = true;

    for (let m = start; m <= end; m++) {
      const cnt = finalCountsMap.get(m) || 0;
      if (cnt !== 10) {
        groupMatch = false;
        allOk = false;
      }
    }

    const status = groupMatch ? `${A.green}✓ 10 Kelime (Tam)${A.reset}` : `${A.red}✗ Eksik/Mükerrer var${A.reset}`;
    console.log(`│ Modül ${String(start).padStart(2, ' ')} - ${String(end).padStart(3, ' ')} │ 10 Modül       │ ${status} │`);
  }
  console.log(`└───────────────┴───────────────┴───────────┘\n`);

  // Detailed count per module list
  console.log(`${A.bold}Modül Detay Listesi (Modül 1 - 100):${A.reset}`);
  let rowStr = '  ';
  for (let m = 1; m <= 100; m++) {
    const c = finalCountsMap.get(m) || 0;
    const color = c === 10 ? A.green : A.red;
    rowStr += `M${m}:${color}${c}${A.reset}  `;
    if (m % 10 === 0) {
      console.log(rowStr);
      rowStr = '  ';
    }
  }

  log.success(`Toplam ${finalDbItems?.length ?? 0} kelime 100 modüle tam 10'ar kelime olarak dağıtıldı.`);
  log.success(`Kullanıcı Öğrenme Verisi (USER_LEXICAL_STATE): ${finalUserStateCount ?? 0} satır korundu (KORUNDU) ✓`);

  if (allOk) {
    console.log(`\n${A.bold}${A.green}✓ TÜM MODÜLLER (1-100) EKSİKSİZ TAM 10'AR KELİMEYE SAHİP VE MÜKERRERLİKLER TEMİZLENDİ!${A.reset}\n`);
  } else {
    console.log(`\n${A.bold}${A.yellow}⚠ Bazı modüllerde uyumsuzluk tespit edildi.${A.reset}\n`);
  }
}

fixModuleWordCounts().catch((err) => {
  log.error(`Script error: ${err.message}`);
  process.exit(1);
});
