#!/usr/bin/env node
/**
 * scripts/seed-demirtas-words.ts
 * ──────────────────────────────
 * Hüseyin Demirtaş "İngilizce Akademik Kelimeler" (100 Modül) Seeder
 *
 * Scans `scripts/data/` for modular JSON files (e.g. modules.json, module-1.json)
 * and seeds academic vocabulary entries into Supabase `LEXICAL_ITEMS`.
 *
 * Usage:
 *   npx tsx scripts/seed-demirtas-words.ts
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
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

interface DemirtaşWordInput {
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

async function seedDemirtasWords() {
  log.header("Hüseyin Demirtaş 100-Module Academic Vocabulary Seeder");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log.error("Supabase URL or Key is missing in environment variables!");
    process.exit(1);
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  const dataDir = resolve(process.cwd(), 'scripts', 'data');

  if (!existsSync(dataDir)) {
    log.warn(`Data directory not found at: ${dataDir}`);
    process.exit(0);
  }

  const files = readdirSync(dataDir).filter((file) => file.endsWith('.json'));

  if (files.length === 0) {
    log.warn(`No JSON module files found in ${dataDir}`);
    return;
  }

  log.info(`Found ${files.length} module data file(s) in scripts/data/`);

  // Clear existing items if re-seeding
  log.info("Cleaning existing LEXICAL_ITEMS data before re-seeding...");
  const { error: clearErr } = await supabase
    .from('LEXICAL_ITEMS')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (clearErr) {
    log.warn(`Could not clear table: ${clearErr.message}`);
  } else {
    log.success("Cleaned existing LEXICAL_ITEMS records.");
  }

  const seenLemmas = new Set<string>();
  let totalWordsSeeded = 0;

  for (const file of files) {
    const filePath = join(dataDir, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const words: DemirtaşWordInput[] = JSON.parse(content);

      if (!Array.isArray(words)) {
        log.warn(`File ${file} does not contain a valid JSON array. Skipping.`);
        continue;
      }

      log.info(`Processing ${file} (${words.length} items)...`);

      const dbRows: LexicalItemInsert[] = [];

      words.forEach((w, idx) => {
        const rawWord = w.word ?? w.lemma;
        if (!rawWord) {
          log.warn(`Skipping entry at index ${idx} in ${file}: missing required 'word' / 'lemma'`);
          return;
        }

        const baseLemma = rawWord.toLowerCase().trim();
        const modNum = w.module_number ?? 1;

        let uniqueLemma = baseLemma;
        if (seenLemmas.has(uniqueLemma)) {
          uniqueLemma = `${baseLemma} (Modül ${modNum})`;
        }
        seenLemmas.add(uniqueLemma);

        const collocationsStr = Array.isArray(w.collocations)
          ? w.collocations.join(', ')
          : w.collocations ?? null;

        const primaryTr = w.turkish_translation ?? w.l1_meanings?.[0] ?? null;
        const l1Meanings = w.l1_meanings ?? (primaryTr ? [primaryTr] : null);
        const definition = w.l2_definition ?? w.definition ?? null;

        dbRows.push({
          lemma: uniqueLemma,
          pos: w.pos ?? null,
          cefr_level: w.cefr_level ?? null,
          coca_rank: w.coca_rank ?? (idx + 1),
          module_number: modNum,
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
        });
      });

      if (dbRows.length === 0) continue;

      // Insert in chunks of 100 to avoid payload size limits
      const CHUNK_SIZE = 100;
      for (let i = 0; i < dbRows.length; i += CHUNK_SIZE) {
        const chunk = dbRows.slice(i, i + CHUNK_SIZE);
        const { data, error } = await (supabase as any)
          .from('LEXICAL_ITEMS')
          .insert(chunk)
          .select('id');

        if (error) {
          log.error(`Error inserting chunk from ${file}: ${error.message}`);
        } else {
          totalWordsSeeded += data?.length ?? chunk.length;
        }
      }

      log.success(`Successfully seeded items from ${file}`);
    } catch (err: any) {
      log.error(`Failed to read/parse ${file}: ${err.message}`);
    }
  }

  // ── Verification & Summary ────────────────────────────────────────────────
  log.header("Seeding Summary & Module Word Count Verification");

  const { data: dbItems, error: verifyErr } = await (supabase as any)
    .from('LEXICAL_ITEMS')
    .select('module_number');

  if (verifyErr) {
    log.error(`Verification error: ${verifyErr.message}`);
  } else {
    const modMap: Record<number, number> = {};
    dbItems?.forEach((item: any) => {
      const m = item.module_number ?? 0;
      modMap[m] = (modMap[m] || 0) + 1;
    });

    log.info("Word count per module in database:");
    const sortedModules = Object.keys(modMap)
      .map(Number)
      .sort((a, b) => a - b);

    sortedModules.forEach((mod) => {
      const count = modMap[mod];
      const status = count === 10 ? `${A.green}10 kelime ✓${A.reset}` : `${A.red}${count} kelime ✗${A.reset}`;
      console.log(`  Modül ${String(mod).padStart(3, ' ')}: ${status}`);
    });

    log.success(`Total lexical items stored in DB: ${dbItems?.length}`);
  }
}

seedDemirtasWords().catch((err) => {
  log.error(`Unexpected seed error: ${err.message}`);
  process.exit(1);
});
