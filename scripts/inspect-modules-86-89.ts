import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function inspectModules() {
  console.log('=== 1. Inspecting modules.json ===');
  const filePath = resolve(process.cwd(), 'scripts', 'data', 'modules.json');
  const jsonContent = readFileSync(filePath, 'utf-8');
  const rawData: any = JSON.parse(jsonContent);

  console.log(`Total items in modules.json: ${rawData.length}`);

  // Count items per module_number or module_id or other fields
  const moduleCounts: Record<string, number> = {};
  const moduleWords: Record<string, any[]> = {};
  const unexpectedKeysSet = new Set<string>();

  rawData.forEach((item: any, idx: number) => {
    Object.keys(item).forEach((k) => {
      if (!['module_number', 'word', 'lemma', 'phonetic', 'ipa_us', 'ipa_uk', 'pos', 'definition', 'l2_definition', 'example_sentence', 'context_sentence', 'turkish_translation', 'synonyms', 'antonyms', 'collocations', 'cefr_level', 'coca_rank', 'word_family', 'etymology'].includes(k)) {
        unexpectedKeysSet.add(k);
      }
    });

    const modKey = item.module_number !== undefined ? String(item.module_number) : (item.module_id !== undefined ? `module_id:${item.module_id}` : 'unknown');
    moduleCounts[modKey] = (moduleCounts[modKey] || 0) + 1;
    if (!moduleWords[modKey]) moduleWords[modKey] = [];
    moduleWords[modKey].push(item);
  });

  console.log('Unexpected keys found:', Array.from(unexpectedKeysSet));
  console.log('\n--- Modules 85 to 90 in JSON ---');
  [85, 86, 87, 88, 89, 90].forEach((m) => {
    const key = String(m);
    const words = moduleWords[key] || [];
    console.log(`Module ${m}: ${words.length} words -> ${words.map((w) => w.word || w.lemma).join(', ')}`);
  });

  // Check if any item uses module_id instead of module_number or words array
  const itemWithModuleId = rawData.filter((i: any) => i.module_id !== undefined);
  console.log(`\nItems with module_id property: ${itemWithModuleId.length}`);

  console.log('\n=== 2. Inspecting Supabase DB (LEXICAL_ITEMS) ===');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: dbItems, error: dbErr } = await supabase
    .from('LEXICAL_ITEMS')
    .select('id, lemma, module_number')
    .in('module_number', [85, 86, 87, 88, 89, 90]);

  if (dbErr) {
    console.error('DB Error:', dbErr.message);
    return;
  }

  const dbCounts: Record<number, string[]> = {};
  dbItems?.forEach((item: any) => {
    const m = item.module_number;
    if (!dbCounts[m]) dbCounts[m] = [];
    dbCounts[m].push(item.lemma);
  });

  [85, 86, 87, 88, 89, 90].forEach((m) => {
    const words = dbCounts[m] || [];
    console.log(`DB Module ${m}: ${words.length} words -> ${words.join(', ')}`);
  });
}

inspectModules();
