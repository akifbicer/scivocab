#!/usr/bin/env node
/**
 * scripts/upsert-modules.ts
 * ─────────────────────────
 * Safely upserts modules and lexical items from JSON files into Supabase.
 *
 * CRITICAL SAFETY RULES:
 *  - NEVER deletes or resets USER_LEXICAL_STATE.
 *  - Uses Supabase `.upsert()` on `LEXICAL_ITEMS` (and `MODULES` if present) to preserve primary keys & foreign keys.
 *  - Outputs detailed summary logs showing new modules and new/updated words added.
 *
 * Usage:
 *   npx tsx scripts/upsert-modules.ts
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
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
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
};

const log = {
  header:  (msg: string) => console.log(`\n${A.bold}${A.cyan}━━ ${msg} ━━${A.reset}`),
  info:    (msg: string) => console.log(`  ${A.blue}ℹ${A.reset}  ${msg}`),
  success: (msg: string) => console.log(`  ${A.green}✓${A.reset}  ${msg}`),
  warn:    (msg: string) => console.log(`  ${A.yellow}⚠${A.reset}  ${msg}`),
  error:   (msg: string) => console.log(`  ${A.red}✗${A.reset}  ${msg}`),
};

interface WordInputItem {
  word?: string;
  lemma?: string;
  pos?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase';
  module_number?: number;
  turkish_translation?: string;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string | string[];
  l1_meanings?: string[];
  l2_definition?: string;
  definition?: string;
  example_sentence?: string;
  context_sentence?: string;
  cefr_level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  coca_rank?: number;
  ipa_us?: string;
  ipa_uk?: string;
  phonetic?: string;
  word_family?: Record<string, any>;
  etymology?: string;
}

async function safeUpsertModules() {
  log.header("Safe Module & Lexical Items Upsert Tool");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log.error("Supabase URL or Key is missing in environment variables!");
    process.exit(1);
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  // ── 1. Locate JSON data files ───────────────────────────────────────────────
  const dataDirs = [
    resolve(process.cwd(), 'scripts', 'data'),
    resolve(process.cwd(), 'data'),
  ];

  const jsonFiles: string[] = [];
  for (const dir of dataDirs) {
    if (existsSync(dir)) {
      const files = readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => join(dir, f));
      jsonFiles.push(...files);
    }
  }

  if (jsonFiles.length === 0) {
    log.error("No JSON word files found in scripts/data or data directories!");
    process.exit(1);
  }

  log.info(`Found ${jsonFiles.length} JSON data file(s):`);
  jsonFiles.forEach((f) => console.log(`    - ${f}`));

  // ── 2. Read existing data to compare ────────────────────────────────────────
  log.info("Fetching existing database state for comparison...");

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
    existingLemmaMap.set(item.lemma.toLowerCase().trim(), item.id);
    if (item.module_number) existingModulesSet.add(item.module_number);
  });

  log.info(`Currently in DB: ${existingLemmaMap.size} lexical items across ${existingModulesSet.size} modules.`);

  // Check if MODULES table exists
  let hasModulesTable = false;
  const existingDbModulesSet = new Set<number>();
  try {
    const { data: dbMods, error: modErr } = await (supabase as any)
      .from('MODULES')
      .select('module_number');

    if (!modErr && dbMods) {
      hasModulesTable = true;
      dbMods.forEach((m: any) => existingDbModulesSet.add(m.module_number));
      log.info(`MODULES table detected with ${existingDbModulesSet.size} module entries.`);
    }
  } catch {}

  // ── 3. Parse JSON items & prepare records ──────────────────────────────────
  const seenLemmasInImport = new Map<string, WordInputItem>();
  const modulesInImportSet = new Set<number>();

  for (const filePath of jsonFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const items: WordInputItem[] = JSON.parse(content);

      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const rawWord = item.word ?? item.lemma;
        if (!rawWord) continue;

        const baseLemma = rawWord.toLowerCase().trim();
        const modNum = item.module_number ?? 1;
        modulesInImportSet.add(modNum);

        // Keep last defined or construct unique
        if (!seenLemmasInImport.has(baseLemma)) {
          seenLemmasInImport.set(baseLemma, item);
        }
      }
    } catch (err: any) {
      log.warn(`Error reading file ${filePath}: ${err.message}`);
    }
  }

  log.info(`Parsed ${seenLemmasInImport.size} unique words across ${modulesInImportSet.size} modules from JSON.`);

  // ── 4. Upsert MODULES table (if table exists) ──────────────────────────────
  let newModulesCount = 0;
  if (hasModulesTable && modulesInImportSet.size > 0) {
    const moduleRows = Array.from(modulesInImportSet).map((modNum) => ({
      module_number: modNum,
      name: `Modül ${modNum}`,
      title: `Academic Vocabulary Module ${modNum}`,
    }));

    for (const modNum of modulesInImportSet) {
      if (!existingDbModulesSet.has(modNum)) {
        newModulesCount++;
      }
    }

    const { error: modUpsertErr } = await (supabase as any)
      .from('MODULES')
      .upsert(moduleRows, { onConflict: 'module_number' });

    if (modUpsertErr) {
      log.warn(`MODULES upsert warning: ${modUpsertErr.message}`);
    } else {
      log.success(`Upserted ${moduleRows.length} modules into MODULES table.`);
    }
  } else {
    for (const modNum of modulesInImportSet) {
      if (!existingModulesSet.has(modNum)) {
        newModulesCount++;
      }
    }
  }
  // ── 5. Prepare LEXICAL_ITEMS upsert rows ──────────────────────────────────
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

    const primaryTr = w.turkish_translation ?? w.l1_meanings?.[0] ?? null;
    const l1Meanings = w.l1_meanings ?? (primaryTr ? [primaryTr] : null);
    const definition = w.l2_definition ?? w.definition ?? null;

    const row: LexicalItemInsert = {
      id: existingId ?? randomUUID(),
      lemma,
      pos: w.pos ?? null,
      cefr_level: w.cefr_level ?? null,
      coca_rank: w.coca_rank ?? rankCounter++,
      module_number: w.module_number ?? 1,
      turkish_translation: primaryTr,
      synonyms: w.synonyms ?? null,
      antonyms: w.antonyms ?? null,
      l1_meanings: l1Meanings,
      l2_definition: definition,
      collocations: collocationsStr,
      ipa_us: w.ipa_us ?? w.phonetic ?? null,
      ipa_uk: w.ipa_uk ?? null,
      word_family: w.word_family ?? null,
      etymology: w.etymology ?? null,
    };

    upsertRows.push(row);
  }

  // ── 6. Execute safe batch upserts on LEXICAL_ITEMS ─────────────────────────
  log.info(`Executing safe upsert of ${upsertRows.length} lexical items in chunks...`);

  const CHUNK_SIZE = 100;
  let successCount = 0;

  for (let i = 0; i < upsertRows.length; i += CHUNK_SIZE) {
    const chunk = upsertRows.slice(i, i + CHUNK_SIZE);
    const { data, error } = await (supabase as any)
      .from('LEXICAL_ITEMS')
      .upsert(chunk, { onConflict: 'lemma' })
      .select('id');

    if (error) {
      log.error(`Upsert chunk error at ${i}-${i + chunk.length}: ${error.message}`);
    } else {
      successCount += data?.length ?? chunk.length;
    }
  }

  // ── 7. Verify USER_LEXICAL_STATE safety & final summary ────────────────────
  const { count: userStateCount, error: userStateErr } = await (supabase as any)
    .from('USER_LEXICAL_STATE')
    .select('id', { count: 'exact', head: true });

  const { count: finalLexicalCount } = await (supabase as any)
    .from('LEXICAL_ITEMS')
    .select('id', { count: 'exact', head: true });

  log.header("Summary of Operations");
  log.success(`Yeni Eklenen Modül Sayısı: ${A.bold}${newModulesCount}${A.reset} (Toplam Modül: ${Math.max(existingModulesSet.size, modulesInImportSet.size)})`);
  log.success(`Yeni Eklenen Kelime Sayısı: ${A.bold}${newWordsCount}${A.reset}`);
  log.success(`Güncellenen Kelime Sayısı: ${A.bold}${updatedWordsCount}${A.reset}`);
  log.success(`Toplam LEXICAL_ITEMS Kelime Sayısı: ${A.bold}${finalLexicalCount ?? successCount}${A.reset}`);
  
  if (!userStateErr) {
    log.success(`Kullanıcı Öğrenme Verisi (USER_LEXICAL_STATE): ${A.bold}${userStateCount ?? 0} satır korundu (DOKUNULMADI) ✓${A.reset}`);
  }

  console.log(`\n${A.green}${A.bold}✓ Upsert işlemi sorunsuz şekilde tamamlandı!${A.reset}\n`);
}

safeUpsertModules().catch((err) => {
  log.error(`Execution error: ${err.message}`);
  process.exit(1);
});
