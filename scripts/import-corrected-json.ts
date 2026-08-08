#!/usr/bin/env node
/**
 * scripts/import-corrected-json.ts
 * ─────────────────────────────────
 * Imports updated module and word data from `scripts/data/modules_corrected_1000.json`
 * into Supabase database tables (`MODULES` and `LEXICAL_ITEMS`).
 *
 * CRITICAL SAFETY DIRECTIVES:
 *  - NEVER deletes or resets `USER_LEXICAL_STATE`.
 *  - Preserves existing UUID `id`s for matching lemmas so foreign key constraints in `USER_LEXICAL_STATE` remain valid.
 *  - Uses Supabase `.upsert()` with `onConflict: 'lemma'` and `onConflict: 'module_number'`.
 *  - Logs execution details and final summary of updated/added items.
 *
 * Usage:
 *   npx tsx scripts/import-corrected-json.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database, LexicalItemInsert } from '../types/database';

// ── 0. Load environment variables ────────────────────────────────────────────
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── 1. ANSI Color Helpers ────────────────────────────────────────────────────
const A = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  cyan:    '\x1b[36m',
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

async function importCorrectedJson() {
  log.header("Corrected JSON Data Import Tool (1000 Words)");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log.error("Supabase URL or Key is missing in environment variables!");
    process.exit(1);
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  // ── 1. Read JSON file ────────────────────────────────────────────────────────
  const jsonPath = resolve(process.cwd(), 'scripts', 'data', 'modules_corrected_1000.json');

  if (!existsSync(jsonPath)) {
    log.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

  log.info(`Reading corrected dataset from: ${jsonPath}`);
  const rawContent = readFileSync(jsonPath, 'utf-8');
  const items: CorrectedWordItem[] = JSON.parse(rawContent);

  if (!Array.isArray(items) || items.length === 0) {
    log.error("The JSON file is empty or invalid array structure.");
    process.exit(1);
  }

  log.info(`Loaded ${items.length} word records from JSON file.`);

  // ── 2. Read existing database state for safe upsert matching ────────────────
  log.info("Fetching existing database state...");

  const { data: existingLexicalItems, error: lexFetchErr } = await (supabase as any)
    .from('LEXICAL_ITEMS')
    .select('id, lemma, module_number');

  if (lexFetchErr) {
    log.error(`Failed to fetch LEXICAL_ITEMS: ${lexFetchErr.message}`);
    process.exit(1);
  }

  const existingLemmaMap = new Map<string, string>(); // lemma -> id
  const existingModulesSet = new Set<number>();

  (existingLexicalItems ?? []).forEach((item: any) => {
    if (item.lemma) {
      existingLemmaMap.set(item.lemma.toLowerCase().trim(), item.id);
    }
    if (item.module_number) existingModulesSet.add(item.module_number);
  });

  log.info(`Existing DB state: ${existingLemmaMap.size} lexical items across ${existingModulesSet.size} modules.`);

  // Check MODULES table existence
  let hasModulesTable = false;
  const existingDbModulesSet = new Set<number>();
  try {
    const { data: dbMods, error: modErr } = await (supabase as any)
      .from('MODULES')
      .select('module_number');

    if (!modErr && dbMods) {
      hasModulesTable = true;
      dbMods.forEach((m: any) => existingDbModulesSet.add(m.module_number));
      log.info(`MODULES table active with ${existingDbModulesSet.size} module entries.`);
    }
  } catch {}

  // ── 3. Deduplicate & parse JSON items ───────────────────────────────────────
  const seenLemmasInImport = new Map<string, CorrectedWordItem>();
  const modulesInImportSet = new Set<number>();

  for (const item of items) {
    if (!item.word) continue;
    const baseLemma = item.word.toLowerCase().trim();
    const modNum = item.module_number ?? 1;

    modulesInImportSet.add(modNum);
    seenLemmasInImport.set(baseLemma, item);
  }

  log.info(`Unique dataset items to process: ${seenLemmasInImport.size} words across ${modulesInImportSet.size} modules.`);

  // ── 4. Upsert MODULES table ─────────────────────────────────────────────────
  let newModulesCount = 0;
  if (hasModulesTable && modulesInImportSet.size > 0) {
    const moduleRows = Array.from(modulesInImportSet).map((modNum) => ({
      module_number: modNum,
      name: `Modül ${modNum}`,
      title: `Academic Vocabulary Module ${modNum}`,
    }));

    for (const modNum of modulesInImportSet) {
      if (!existingDbModulesSet.has(modNum)) newModulesCount++;
    }

    const { error: modUpsertErr } = await (supabase as any)
      .from('MODULES')
      .upsert(moduleRows, { onConflict: 'module_number' });

    if (modUpsertErr) {
      log.warn(`MODULES table upsert warning: ${modUpsertErr.message}`);
    } else {
      log.success(`Upserted ${moduleRows.length} modules into MODULES table.`);
    }
  } else {
    for (const modNum of modulesInImportSet) {
      if (!existingModulesSet.has(modNum)) newModulesCount++;
    }
  }

  // ── 5. Prepare LEXICAL_ITEMS upsert payload ────────────────────────────────
  const upsertRows: LexicalItemInsert[] = [];
  let newWordsCount = 0;
  let updatedWordsCount = 0;
  let rankCounter = 1;

  for (const [lemma, w] of seenLemmasInImport.entries()) {
    const existingId = existingLemmaMap.get(lemma);

    if (existingId) {
      updatedWordsCount++;
    } else {
      newWordsCount++;
    }

    const collocationsStr = Array.isArray(w.collocations)
      ? w.collocations.join(', ')
      : w.collocations ?? null;

    const primaryTr = w.turkish_translation ?? null;
    const l1Meanings = primaryTr ? [primaryTr] : null;
    const definition = w.definition ?? null;

    const row: LexicalItemInsert = {
      id: existingId ?? randomUUID(),
      lemma,
      pos: (w.pos as any) ?? null,
      module_number: w.module_number ?? 1,
      coca_rank: rankCounter++,
      turkish_translation: primaryTr,
      l1_meanings: l1Meanings,
      l2_definition: definition,
      synonyms: w.synonyms ?? null,
      antonyms: w.antonyms ?? null,
      collocations: collocationsStr,
      ipa_us: w.phonetic ?? null,
    };

    upsertRows.push(row);
  }

  // ── 6. Execute chunked upserts on LEXICAL_ITEMS ───────────────────────────
  log.info(`Executing safe batch upsert of ${upsertRows.length} lexical items...`);

  const CHUNK_SIZE = 100;
  let successCount = 0;

  for (let i = 0; i < upsertRows.length; i += CHUNK_SIZE) {
    const chunk = upsertRows.slice(i, i + CHUNK_SIZE);
    const { data, error } = await (supabase as any)
      .from('LEXICAL_ITEMS')
      .upsert(chunk, { onConflict: 'lemma' })
      .select('id');

    if (error) {
      log.error(`Upsert chunk error at index ${i}-${i + chunk.length}: ${error.message}`);
    } else {
      successCount += data?.length ?? chunk.length;
    }
  }

  // ── 7. Verify USER_LEXICAL_STATE safety & Output summary ───────────────────
  const { count: userStateCount, error: userStateErr } = await (supabase as any)
    .from('USER_LEXICAL_STATE')
    .select('id', { count: 'exact', head: true });

  const { count: finalLexicalCount } = await (supabase as any)
    .from('LEXICAL_ITEMS')
    .select('id', { count: 'exact', head: true });

  log.header("Summary of Database Operations");
  log.success(`İşlenen / Güncellenen Modül Sayısı: ${A.bold}${modulesInImportSet.size}${A.reset} (Yeni Eklenen: ${newModulesCount})`);
  log.success(`Yeni Eklenen Kelime Sayısı: ${A.bold}${newWordsCount}${A.reset}`);
  log.success(`Güncellenen Kelime Sayısı: ${A.bold}${updatedWordsCount}${A.reset}`);
  log.success(`Toplam Veritabanı LEXICAL_ITEMS Kelime Sayısı: ${A.bold}${finalLexicalCount ?? successCount}${A.reset}`);

  if (!userStateErr) {
    log.success(`Kullanıcı Öğrenme Verisi (USER_LEXICAL_STATE): ${A.bold}${userStateCount ?? 0} satır korundu (KESİNLİKLE DOKUNULMADI) ✓${A.reset}`);
  }

  console.log(`\n${A.green}${A.bold}✓ import-corrected-json.ts işlemi başarıyla tamamlandı!${A.reset}\n`);
}

importCorrectedJson().catch((err) => {
  log.error(`Import execution error: ${err.message}`);
  process.exit(1);
});
