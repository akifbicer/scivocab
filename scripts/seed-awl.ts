#!/usr/bin/env node
/**
 * scripts/seed-awl.ts
 * ────────────────────
 * AWL Sublist 1 — Enriched Seed Script (Top 20 Academic Words)
 *
 * Usage:
 *   npx tsx scripts/seed-awl.ts
 *
 * Prerequisites:
 *   .env.local (or .env) must contain:
 *     NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *     SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...          ← service role, not anon
 *
 * Install peer deps if missing:
 *   npm install --save-dev dotenv tsx
 *
 * Design note — sample_sentence:
 *   sample_sentence is included in SeedWord for documentation and local use
 *   (e.g., WordCard contextSentence prop) but is NOT inserted into Supabase
 *   because LEXICAL_ITEMS has no dedicated column for it. Add a
 *   `context_sentence VARCHAR(500)` column to the schema if you need to
 *   persist it in the database.
 */

// ── 0. Load environment before any other imports ────────────────────────────
import { resolve }  from 'node:path';
import { config }   from 'dotenv';

config({ path: resolve(process.cwd(), '.env.local') }); // Next.js primary
config({ path: resolve(process.cwd(), '.env') });        // fallback

// ── 1. Imports ───────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import type { Database }            from '../types/database';
import type { LexicalItemInsert }   from '../types/database';
import type { WordFamily }          from '../types/database';

// =============================================================================
// 2. CONSOLE HELPERS (ANSI color — no chalk dependency)
// =============================================================================

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
  white:   '\x1b[37m',
};

const log = {
  header: (msg: string) =>
    console.log(`\n${A.bold}${A.cyan}━━ ${msg} ━━${A.reset}`),
  info:    (msg: string) => console.log(`  ${A.blue}ℹ${A.reset}  ${msg}`),
  success: (msg: string) => console.log(`  ${A.green}✓${A.reset}  ${msg}`),
  warn:    (msg: string) => console.log(`  ${A.yellow}⚠${A.reset}  ${msg}`),
  error:   (msg: string) => console.log(`  ${A.red}✗${A.reset}  ${msg}`),
  dim:     (msg: string) => console.log(`${A.dim}  ${msg}${A.reset}`),
  blank:   ()            => console.log(),
};

// =============================================================================
// 3. SEED WORD TYPE
// =============================================================================

type SeedWord = LexicalItemInsert & {
  /** Authentic i+1 academic sentence — for WordCard contextSentence prop. */
  sample_sentence: string;
};

// =============================================================================
// 4. AWL SUBLIST 1 — TOP 20 ENRICHED WORD CARDS
// =============================================================================

const AWL_WORDS: SeedWord[] = [
  // ── 1. analysis ─────────────────────────────────────────────────────────
  {
    lemma:         'analysis',
    pos:           'noun',
    cefr_level:    'C1',
    coca_rank:     650,
    ipa_us:        'əˈnæl.ɪ.sɪs',
    ipa_uk:        'əˈnæl.ɪ.sɪs',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['analiz', 'çözümleme', 'inceleme'],
    l2_definition: 'A careful, detailed examination of something in order to understand it better or to discover what it consists of.',
    collocations:  ['data analysis', 'conduct an analysis', 'in-depth analysis', 'statistical analysis'],
    word_family:   {
      root:      'analys-',
      noun:      ['analysis', 'analyst', 'analytics'],
      verb:      'analyse / analyze',
      adjective: 'analytical',
      adverb:    'analytically',
    } satisfies WordFamily,
    etymology:     'Greek "analusis" (a releasing; "ana-" + "luein" to loosen) → Medieval Latin "analysis" → English (16th c.).',
    sample_sentence: 'The research team conducted a detailed statistical analysis of the experimental data to identify patterns that could support the central hypothesis.',
  },

  // ── 2. approach ─────────────────────────────────────────────────────────
  {
    lemma:         'approach',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     520,
    ipa_us:        'əˈproʊtʃ',
    ipa_uk:        'əˈprəʊtʃ',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['yaklaşım', 'yöntem', 'yaklaşmak'],
    l2_definition: 'A way of dealing with a situation or problem, or of thinking about it; a method or strategy used to achieve a goal.',
    collocations:  ['interdisciplinary approach', 'take a new approach to', 'systematic approach', 'adopt an approach'],
    word_family:   {
      root:      'approch-',
      noun:      'approach',
      verb:      'approach',
      adjective: 'approachable',
      adverb:    null,
    } satisfies WordFamily,
    etymology:     'Old French "aprochier" (to draw near) → Late Latin "appropiare" ("ad-" + "propius" nearer) → English (14th c.).',
    sample_sentence: 'The interdisciplinary approach the scientists adopted allowed them to combine linguistic theory with computational methods.',
  },

  // ── 3. assessment ───────────────────────────────────────────────────────
  {
    lemma:         'assessment',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     1050,
    ipa_us:        'əˈses.mənt',
    ipa_uk:        'əˈses.mənt',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['değerlendirme', 'ölçme', 'sınav'],
    l2_definition: 'The process of making a judgment about the nature, quality, ability, or amount of something, especially after careful consideration.',
    collocations:  ['risk assessment', 'carry out an assessment', 'continuous assessment', 'needs assessment'],
    word_family:   {
      root:      'assess-',
      noun:      ['assessment', 'assessor'],
      verb:      'assess',
      adjective: 'assessable',
      adverb:    null,
    } satisfies WordFamily,
    etymology:     'Medieval Latin "assessmentum" → "assessare" (to fix a tax; "ad-" + "sedere" to sit beside) → Old French → English (15th c.).',
    sample_sentence: 'Before approving the new curriculum, the committee carried out a comprehensive needs assessment across all participating schools.',
  },

  // ── 4. assume ───────────────────────────────────────────────────────────
  {
    lemma:         'assume',
    pos:           'verb',
    cefr_level:    'B2',
    coca_rank:     780,
    ipa_us:        'əˈsuːm',
    ipa_uk:        'əˈsjuːm',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['varsaymak', 'üstlenmek', 'farz etmek'],
    l2_definition: 'To accept something as true without proof or question, or to take on a responsibility, position, or role.',
    collocations:  ['widely assumed', 'assume responsibility', 'it is assumed that', 'assume a role'],
    word_family:   {
      root:      'sum-',
      noun:      ['assumption', 'presumption'],
      verb:      ['assume', 'presume'],
      adjective: ['assumed', 'assumptive'],
      adverb:    'presumably',
    } satisfies WordFamily,
    etymology:     'Latin "assumere" ("ad-" + "sumere" to take); cognate with "consume" and "resume" → English (15th c.).',
    sample_sentence: 'Researchers commonly assume that participants will answer survey questions honestly, but this assumption is not always warranted.',
  },

  // ── 5. authority ────────────────────────────────────────────────────────
  {
    lemma:         'authority',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     750,
    ipa_us:        'əˈθɔːr.ɪ.ti',
    ipa_uk:        'ɔːˈθɒr.ɪ.ti',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['otorite', 'yetki', 'yetkili makam'],
    l2_definition: 'The power or right to give orders, make decisions, and enforce obedience; a person or body with official power.',
    collocations:  ['have authority over', 'local authority', 'under the authority of', 'central authority'],
    word_family:   {
      root:      'author-',
      noun:      ['authority', 'author', 'authorization'],
      verb:      'authorize',
      adjective: 'authoritative',
      adverb:    'authoritatively',
    } satisfies WordFamily,
    etymology:     'Old French "autorite" → Latin "auctoritas" (influence, command; from "auctor" originator) → English (13th c.).',
    sample_sentence: 'The study questioned whether teachers retain sufficient authority to enforce academic integrity policies without institutional support.',
  },

  // ── 6. available ────────────────────────────────────────────────────────
  {
    lemma:         'available',
    pos:           'adjective',
    cefr_level:    'B2',
    coca_rank:     450,
    ipa_us:        'əˈveɪ.lə.bəl',
    ipa_uk:        'əˈveɪ.lə.bəl',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['mevcut', 'erişilebilir', 'müsait'],
    l2_definition: 'Able to be obtained, used, or reached; not busy or already engaged.',
    collocations:  ['readily available', 'make available', 'freely available', 'available resources'],
    word_family:   {
      root:      'avail-',
      noun:      'availability',
      verb:      'avail',
      adjective: ['available', 'unavailable'],
      adverb:    null,
    } satisfies WordFamily,
    etymology:     '"avail" (Old French "avaloir" → Latin "ad-" + "valere" to be worth) + "-able" → English (15th c.).',
    sample_sentence: 'Because the data were freely available online, independent researchers were able to replicate the original findings without delay.',
  },

  // ── 7. benefit ──────────────────────────────────────────────────────────
  {
    lemma:         'benefit',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     870,
    ipa_us:        'ˈben.ɪ.fɪt',
    ipa_uk:        'ˈben.ɪ.fɪt',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['fayda', 'yarar', 'avantaj'],
    l2_definition: 'An advantage, improvement, or positive result that something gives; money or services provided by a government or organization.',
    collocations:  ['for the benefit of', 'potential benefit', 'mutual benefit', 'benefit from'],
    word_family:   {
      root:      'bene-',
      noun:      ['benefit', 'beneficiary', 'benefactor'],
      verb:      'benefit',
      adjective: 'beneficial',
      adverb:    'beneficially',
    } satisfies WordFamily,
    etymology:     'Latin "benefactum" (good deed; "bene" well + "factum" done) → Old French "bienfet" → English (14th c.).',
    sample_sentence: 'For the benefit of future studies, the authors clearly documented all limitations and potential sources of bias in their methodology.',
  },

  // ── 8. concept ──────────────────────────────────────────────────────────
  {
    lemma:         'concept',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     950,
    ipa_us:        'ˈkɑːn.sept',
    ipa_uk:        'ˈkɒn.sept',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['kavram', 'konsept', 'fikir'],
    l2_definition: 'An abstract idea or general principle, especially one that forms part of a theory or that underlies a body of knowledge.',
    collocations:  ['key concept', 'abstract concept', 'core concept', 'concept of identity'],
    word_family:   {
      root:      '-cept- (capere, to take)',
      noun:      ['concept', 'conception', 'preconception'],
      verb:      'conceive',
      adjective: 'conceptual',
      adverb:    'conceptually',
    } satisfies WordFamily,
    etymology:     'Latin "conceptum" (something conceived; past participle of "concipere": "con-" + "capere" to take) → English (17th c.).',
    sample_sentence: 'The concept of ecological resilience has become central to understanding how ecosystems recover from large-scale disturbances.',
  },

  // ── 9. consistent ───────────────────────────────────────────────────────
  {
    lemma:         'consistent',
    pos:           'adjective',
    cefr_level:    'B2',
    coca_rank:     1200,
    ipa_us:        'kənˈsɪs.tənt',
    ipa_uk:        'kənˈsɪs.tənt',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['tutarlı', 'istikrarlı', 'uyumlu'],
    l2_definition: 'Always behaving or occurring in the same way; not containing contradictions; in agreement with other facts or evidence.',
    collocations:  ['consistent with', 'remain consistent', 'internally consistent', 'consistent results'],
    word_family:   {
      root:      'sist- (stare, to stand)',
      noun:      ['consistency', 'inconsistency'],
      verb:      null,
      adjective: ['consistent', 'inconsistent'],
      adverb:    'consistently',
    } satisfies WordFamily,
    etymology:     'Latin "consistentem" (standing firm; present participle of "consistere": "con-" + "sistere" to stand) → English (17th c.).',
    sample_sentence: 'The experimental results were consistent with the predictions of the theoretical model, providing strong support for the hypothesis.',
  },

  // ── 10. context ─────────────────────────────────────────────────────────
  {
    lemma:         'context',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     700,
    ipa_us:        'ˈkɑːn.tekst',
    ipa_uk:        'ˈkɒn.tekst',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['bağlam', 'içerik', 'ortam'],
    l2_definition: 'The circumstances, facts, or events that surround something and help to explain or interpret its meaning.',
    collocations:  ['in context', 'historical context', 'out of context', 'cultural context'],
    word_family:   {
      root:      'text- (texere, to weave)',
      noun:      ['context', 'contextualization'],
      verb:      'contextualize',
      adjective: 'contextual',
      adverb:    'contextually',
    } satisfies WordFamily,
    etymology:     'Latin "contextus" (connection; from "contexere": "con-" + "texere" to weave) → English (15th c.).',
    sample_sentence: 'It is important to interpret any statistical finding within its broader social and political context before drawing causal conclusions.',
  },

  // ── 11. evidence ────────────────────────────────────────────────────────
  {
    lemma:         'evidence',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     580,
    ipa_us:        'ˈev.ɪ.dəns',
    ipa_uk:        'ˈev.ɪ.dəns',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['kanıt', 'delil', 'bulgu'],
    l2_definition: 'Facts, information, or signs that show whether something is true or whether it has actually happened.',
    collocations:  ['empirical evidence', 'provide evidence', 'evidence suggests', 'scientific evidence'],
    word_family:   {
      root:      'vid- (videre, to see)',
      noun:      ['evidence', 'evident'],
      verb:      'evidence',
      adjective: 'evident',
      adverb:    'evidently',
    } satisfies WordFamily,
    etymology:     'Latin "evidentia" (clarity; "e-" + "videre" to see) → Old French "evidence" → English (14th c.).',
    sample_sentence: 'The authors presented compelling empirical evidence that early vocabulary instruction significantly accelerates reading comprehension in primary school students.',
  },

  // ── 12. estimate ────────────────────────────────────────────────────────
  {
    lemma:         'estimate',
    pos:           'verb',
    cefr_level:    'B2',
    coca_rank:     1100,
    ipa_us:        'ˈes.tɪ.meɪt',
    ipa_uk:        'ˈes.tɪ.meɪt',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['tahmin etmek', 'öngörmek', 'yaklaşık hesaplamak'],
    l2_definition: 'To form an approximate idea of the size, cost, value, or extent of something, based on available information.',
    collocations:  ['rough estimate', 'conservative estimate', 'estimate the cost', 'initial estimate'],
    word_family:   {
      root:      'estim- (aestimare, to appraise)',
      noun:      ['estimate', 'estimation', 'estimator'],
      verb:      'estimate',
      adjective: 'estimated',
      adverb:    null,
    } satisfies WordFamily,
    etymology:     'Latin "aestimare" (to appraise, value; related to "aes" copper/money); cognate with "esteem" → English (16th c.).',
    sample_sentence: 'Scientists estimate that approximately 8.7 million species exist on Earth, although only about 1.2 million have been formally described.',
  },

  // ── 13. hypothesis ──────────────────────────────────────────────────────
  {
    lemma:         'hypothesis',
    pos:           'noun',
    cefr_level:    'C1',
    coca_rank:     2200,
    ipa_us:        'haɪˈpɒθ.ɪ.sɪs',
    ipa_uk:        'haɪˈpɒθ.ɪ.sɪs',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['hipotez', 'varsayım', 'sınama önermesi'],
    l2_definition: 'A proposed explanation for a phenomenon that can be tested through investigation and experimentation.',
    collocations:  ['test a hypothesis', 'null hypothesis', 'alternative hypothesis', 'form a hypothesis'],
    word_family:   {
      root:      'hypo- + thesis (tithenai, to place)',
      noun:      ['hypothesis', 'hypotheses (pl.)'],
      verb:      'hypothesize',
      adjective: 'hypothetical',
      adverb:    'hypothetically',
    } satisfies WordFamily,
    etymology:     'Greek "hypothesis" (basis, supposition; "hypo" under + "thesis" a placing) → Latin → English (16th c.).',
    sample_sentence: 'Before designing the experiment, the team formulated a clear null hypothesis which stated that the treatment would have no measurable effect on cognitive performance.',
  },

  // ── 14. indicate ────────────────────────────────────────────────────────
  {
    lemma:         'indicate',
    pos:           'verb',
    cefr_level:    'B2',
    coca_rank:     820,
    ipa_us:        'ˈɪn.dɪ.keɪt',
    ipa_uk:        'ˈɪn.dɪ.keɪt',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['göstermek', 'belirtmek', 'işaret etmek'],
    l2_definition: 'To show or suggest something; to make something clear by directing attention to it or stating it explicitly.',
    collocations:  ['research indicates', 'clearly indicate', 'indicate a trend', 'the data indicate'],
    word_family:   {
      root:      'dict- (dicare, to proclaim)',
      noun:      ['indication', 'indicator', 'index'],
      verb:      'indicate',
      adjective: 'indicative',
      adverb:    'indicatively',
    } satisfies WordFamily,
    etymology:     'Latin "indicare" (to point out; "in-" + "dicare" to proclaim); related to "index" and "diction" → English (17th c.).',
    sample_sentence: 'The survey results indicate that a majority of participants felt that access to quality education was the most significant factor in economic mobility.',
  },

  // ── 15. method ──────────────────────────────────────────────────────────
  {
    lemma:         'method',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     620,
    ipa_us:        'ˈmeθ.əd',
    ipa_uk:        'ˈmeθ.əd',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['yöntem', 'metot', 'usul'],
    l2_definition: 'A particular procedure, technique, or systematic way of doing something, especially one that is established or official.',
    collocations:  ['research method', 'scientific method', 'teaching method', 'adopt a method'],
    word_family:   {
      root:      'meth- + hodos (way)',
      noun:      ['method', 'methodology', 'methodologist'],
      verb:      null,
      adjective: 'methodical',
      adverb:    'methodically',
    } satisfies WordFamily,
    etymology:     'Greek "methodos" (pursuit of knowledge; "meta-" after + "hodos" way) → Latin "methodus" → French → English (16th c.).',
    sample_sentence: 'The most effective teaching method, according to the meta-analysis, was one that combined explicit instruction with opportunities for independent practice.',
  },

  // ── 16. occur ───────────────────────────────────────────────────────────
  {
    lemma:         'occur',
    pos:           'verb',
    cefr_level:    'B2',
    coca_rank:     900,
    ipa_us:        'əˈkɜːr',
    ipa_uk:        'əˈkɜː',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['gerçekleşmek', 'meydana gelmek', 'olmak'],
    l2_definition: 'To happen, especially as an event that was not planned; to exist or be found somewhere.',
    collocations:  ['occur frequently', 'occur in nature', 'when it occurs', 'naturally occurring'],
    word_family:   {
      root:      'curr- (currere, to run)',
      noun:      'occurrence',
      verb:      'occur',
      adjective: 'occurring',
      adverb:    null,
    } satisfies WordFamily,
    etymology:     'Latin "occurrere" (to run to meet; "ob-" toward + "currere" to run); cognate with "current" → English (16th c.).',
    sample_sentence: 'Cognitive dissonance is most likely to occur when an individual is forced to act in a way that conflicts with their core beliefs or values.',
  },

  // ── 17. process ─────────────────────────────────────────────────────────
  {
    lemma:         'process',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     400,
    ipa_us:        'ˈprɑː.ses',
    ipa_uk:        'ˈprəʊ.ses',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['süreç', 'işlem', 'süreçten geçirmek'],
    l2_definition: 'A series of actions or steps taken in order to achieve a particular goal; a series of changes that happen naturally.',
    collocations:  ['decision-making process', 'ongoing process', 'manufacturing process', 'iterative process'],
    word_family:   {
      root:      'cess- (cedere, to go)',
      noun:      ['process', 'processor', 'processing'],
      verb:      'process',
      adjective: 'processed',
      adverb:    null,
    } satisfies WordFamily,
    etymology:     'Latin "processus" (a going forward; from "procedere": "pro-" + "cedere" to go) → Old French "procès" → English (14th c.).',
    sample_sentence: 'Language acquisition is a complex, multi-stage process that is influenced by both innate biological factors and the richness of the linguistic environment.',
  },

  // ── 18. significant ─────────────────────────────────────────────────────
  {
    lemma:         'significant',
    pos:           'adjective',
    cefr_level:    'B2',
    coca_rank:     500,
    ipa_us:        'sɪɡˈnɪf.ɪ.kənt',
    ipa_uk:        'sɪɡˈnɪf.ɪ.kənt',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['önemli', 'anlamlı', 'belirgin'],
    l2_definition: 'Large or important enough to have a noticeable effect or to be worth giving attention to; having a particular meaning.',
    collocations:  ['statistically significant', 'significant difference', 'highly significant', 'no significant change'],
    word_family:   {
      root:      'sign- (signum, mark/sign)',
      noun:      ['significance', 'insignificance'],
      verb:      'signify',
      adjective: ['significant', 'insignificant'],
      adverb:    'significantly',
    } satisfies WordFamily,
    etymology:     'Latin "significantem" (indicating; from "significare": "signum" sign + "facere" to make) → English (16th c.).',
    sample_sentence: 'There was a statistically significant improvement in the vocabulary scores of students who used spaced repetition compared to those who used traditional study methods.',
  },

  // ── 19. structure ───────────────────────────────────────────────────────
  {
    lemma:         'structure',
    pos:           'noun',
    cefr_level:    'B2',
    coca_rank:     680,
    ipa_us:        'ˈstrʌk.tʃər',
    ipa_uk:        'ˈstrʌk.tʃə',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['yapı', 'düzen', 'yapılandırmak'],
    l2_definition: 'The way in which the parts of something are arranged or organized; something that has been built, such as a building.',
    collocations:  ['organizational structure', 'grammatical structure', 'underlying structure', 'social structure'],
    word_family:   {
      root:      'struct- (struere, to pile/build)',
      noun:      ['structure', 'infrastructure', 'construction'],
      verb:      ['structure', 'construct', 'restructure'],
      adjective: ['structural', 'structured'],
      adverb:    'structurally',
    } satisfies WordFamily,
    etymology:     'Latin "structura" (a fitting together; from "struere" to pile/build); cognate with "construct" → English (15th c.).',
    sample_sentence: 'Researchers argue that the underlying grammatical structure of a language can influence the way its speakers perceive time and causality.',
  },

  // ── 20. variable ────────────────────────────────────────────────────────
  {
    lemma:         'variable',
    pos:           'noun',
    cefr_level:    'C1',
    coca_rank:     1500,
    ipa_us:        'ˈver.i.ə.bəl',
    ipa_uk:        'ˈveər.i.ə.bəl',
    audio_us_url:  null,
    audio_uk_url:  null,
    l1_meanings:   ['değişken', 'değişen faktör', 'değişken büyüklük'],
    l2_definition: 'A quantity or factor that can take on different values or change; in research, an element that is measured, manipulated, or controlled.',
    collocations:  ['dependent variable', 'independent variable', 'control variable', 'confounding variable'],
    word_family:   {
      root:      'vari- (varius, diverse)',
      noun:      ['variable', 'variation', 'variance', 'variety'],
      verb:      'vary',
      adjective: ['variable', 'varied', 'various', 'invariable'],
      adverb:    ['variably', 'variously'],
    } satisfies WordFamily,
    etymology:     'Latin "variabilis" (changeable; from "variare" to change, from "varius" diverse) → English (14th c.).',
    sample_sentence: 'In the study, the independent variable was the frequency of feedback given to learners, while the dependent variable was their retention score after two weeks.',
  },
];

// =============================================================================
// 5. CONSTANTS
// =============================================================================

const LEMMAS = AWL_WORDS.map((w) => w.lemma);

// =============================================================================
// 6. MAIN
// =============================================================================

async function run(): Promise<void> {
  log.header('AWL Sublist 1 — Seed Script');
  log.blank();

  // ── Validate environment ──────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    log.error(
      'Missing environment variables. Ensure .env.local contains:\n' +
      '    NEXT_PUBLIC_SUPABASE_URL=...\n' +
      '    SUPABASE_SERVICE_ROLE_KEY=...',
    );
    process.exit(1);
  }

  log.info(`Supabase URL : ${supabaseUrl}`);
  log.info(`Words        : ${AWL_WORDS.length} (AWL Sublist 1)`);
  log.blank();

  // ── Create service-role client (bypasses RLS) ─────────────────────────────
  const supabase = createClient<any>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 1: Upsert LEXICAL_ITEMS
  // ────────────────────────────────────────────────────────────────────────────
  log.header('Step 1 — Upserting LEXICAL_ITEMS');

  // Strip sample_sentence before inserting (no matching DB column).
  const insertPayload: LexicalItemInsert[] = AWL_WORDS.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ sample_sentence, ...rest }) => rest,
  );

  const { error: upsertError } = await supabase
    .from('LEXICAL_ITEMS')
    .upsert(insertPayload, { onConflict: 'lemma' });

  if (upsertError) {
    log.error(`LEXICAL_ITEMS upsert failed: ${upsertError.message}`);
    process.exit(1);
  }

  // Fetch back all 20 items to obtain their UUIDs (needed for enrollment).
  const { data: insertedItems, error: fetchError } = await supabase
    .from('LEXICAL_ITEMS')
    .select('id, lemma')
    .in('lemma', LEMMAS);

  if (fetchError || !insertedItems) {
    log.error(`Failed to fetch inserted items: ${fetchError?.message}`);
    process.exit(1);
  }

  log.success(
    `${insertedItems.length} / ${AWL_WORDS.length} lexical items upserted.`,
  );

  insertedItems.forEach((item) => {
    log.dim(`  ${A.magenta}${item.lemma.padEnd(16)}${A.reset} → ${item.id}`);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2: Enumerate auth users
  // ────────────────────────────────────────────────────────────────────────────
  log.header('Step 2 — Enumerating Auth Users');

  const allUsers: Array<{ id: string; email?: string }> = [];
  let page = 1;

  while (true) {
    const {
      data: { users: pageBatch },
      error: usersError,
    } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (usersError) {
      log.error(`Failed to list users (page ${page}): ${usersError.message}`);
      break;
    }

    allUsers.push(...pageBatch);
    if (pageBatch.length < 1000) break;
    page++;
  }

  if (allUsers.length === 0) {
    log.warn('No users found in auth.users. LEXICAL_ITEMS upserted; enrollment skipped.');
    log.blank();
    printSampleSentences();
    process.exit(0);
  }

  log.success(`${allUsers.length} user(s) found.`);
  allUsers.forEach((u) => log.dim(`  ${u.id}  ${u.email ?? '(no email)'}`));

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3: Auto-enroll users into USER_LEXICAL_STATE
  // ────────────────────────────────────────────────────────────────────────────
  log.header('Step 3 — Enrolling Users (USER_LEXICAL_STATE)');

  let totalEnrolled  = 0;
  let totalSkipped   = 0;

  for (const user of allUsers) {
    const statePayload = insertedItems.map((item) => ({
      user_id:          user.id,
      lexical_item_id:  item.id,
      state:            'New'  as const,
      stability:        0.0,
      difficulty:       0.0,
      lapses:           0,
      repetition_count: 0,
      avg_latency_ms:   0,
    }));

    // ignoreDuplicates: true → INSERT … ON CONFLICT DO NOTHING
    const { error: enrollError, data: enrolled } = await supabase
      .from('USER_LEXICAL_STATE')
      .upsert(statePayload, {
        onConflict:       'user_id,lexical_item_id',
        ignoreDuplicates: true,
      })
      .select('id');

    if (enrollError) {
      log.error(
        `Enrollment failed for user ${user.id}: ${enrollError.message}`,
      );
      continue;
    }

    const enrolledCount = enrolled?.length ?? 0;
    const skippedCount  = statePayload.length - enrolledCount;
    totalEnrolled       += enrolledCount;
    totalSkipped        += skippedCount;

    log.success(
      `User ${A.cyan}${user.email ?? user.id.slice(0, 8)}${A.reset}: ` +
      `${A.green}${enrolledCount} new${A.reset} enrolled, ` +
      `${A.dim}${skippedCount} already exist${A.reset}`,
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ────────────────────────────────────────────────────────────────────────────
  log.header('Summary');
  log.blank();

  const rows: Array<[string, string | number]> = [
    ['Words upserted',         insertedItems.length],
    ['Users processed',        allUsers.length],
    ['State rows created',     totalEnrolled],
    ['State rows skipped',     totalSkipped],
  ];

  const labelW = Math.max(...rows.map(([l]) => l.length)) + 2;
  rows.forEach(([label, value]) => {
    const isZero = value === 0;
    const valStr = String(value);
    const colored = isZero
      ? `${A.dim}${valStr}${A.reset}`
      : `${A.bold}${A.white}${valStr}${A.reset}`;
    console.log(
      `  ${A.dim}${label.padEnd(labelW)}${A.reset}${colored}`,
    );
  });

  log.blank();
  printSampleSentences();

  console.log(`\n${A.green}${A.bold}✓ Done.${A.reset}\n`);
}

// =============================================================================
// 7. SAMPLE SENTENCE REFERENCE (printed at end for copy-paste into app)
// =============================================================================

function printSampleSentences(): void {
  log.header('Sample Sentences (for contextSentence prop)');
  log.dim('These are not stored in the DB. Pass them to <WordCard contextSentence=...>.');
  log.blank();

  AWL_WORDS.forEach(({ lemma, sample_sentence }) => {
    console.log(
      `  ${A.magenta}${A.bold}${lemma}${A.reset}\n` +
      `  ${A.dim}${sample_sentence}${A.reset}\n`,
    );
  });
}

// =============================================================================
// 8. ENTRY POINT
// =============================================================================

run().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  log.error(`Fatal: ${msg}`);
  process.exit(1);
});
