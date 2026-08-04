import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function inspectDetails() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const filePath = resolve(process.cwd(), 'scripts', 'data', 'modules.json');
  const jsonContent = readFileSync(filePath, 'utf-8');
  const jsonWords: any[] = JSON.parse(jsonContent);

  console.log('=== Checking JSON vs DB for Modules 86, 87, 88, 89 ===\n');

  for (const modNum of [86, 87, 88, 89]) {
    const jsonModWords = jsonWords.filter((w) => w.module_number === modNum);
    console.log(`--- Module ${modNum} in JSON (${jsonModWords.length} words) ---`);

    const { data: dbModWords } = await supabase
      .from('LEXICAL_ITEMS')
      .select('*')
      .eq('module_number', modNum);

    console.log(`Module ${modNum} in DB: ${dbModWords?.length ?? 0} words`);

    const jsonLemmas = jsonModWords.map((w) => (w.word || w.lemma).toLowerCase().trim());
    const dbLemmas = (dbModWords ?? []).map((w: any) => w.lemma.toLowerCase().trim());

    const missingInDb = jsonLemmas.filter((l) => !dbLemmas.some((dbl) => dbl.startsWith(l)));
    const missingInJson = dbLemmas.filter((l) => !jsonLemmas.some((jl) => l.startsWith(jl)));

    console.log(`  JSON lemmas (${jsonLemmas.length}):`, jsonLemmas);
    console.log(`  DB lemmas (${dbLemmas.length}):`, dbLemmas);
    if (missingInDb.length > 0) {
      console.log(`  ❌ Missing in DB:`, missingInDb);
    } else {
      console.log(`  ✓ All JSON lemmas present in DB.`);
    }

    // Check for incomplete / null fields in DB
    const incompleteDbWords = (dbModWords ?? []).filter(
      (w: any) => !w.turkish_translation || !w.l2_definition || !w.pos
    );
    if (incompleteDbWords.length > 0) {
      console.log(`  ⚠️ Incomplete DB rows (missing translation/definition/pos):`, incompleteDbWords.map((w: any) => w.lemma));
    } else {
      console.log(`  ✓ All DB rows have full definition, translation, and POS.`);
    }
    console.log('');
  }

  // Also check USER_LEXICAL_STATE count and links
  const { count: stateCount } = await supabase
    .from('USER_LEXICAL_STATE')
    .select('id', { count: 'exact', head: true });

  console.log(`=== USER_LEXICAL_STATE total rows: ${stateCount} ===`);
}

inspectDetails();
