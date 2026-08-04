/**
 * lib/data/demirtas-sentences.ts
 * ────────────────────────────────
 * Sentence dictionary mapping for Hüseyin Demirtaş 100-Module Academic Vocabulary.
 * Provides authentic English example sentences and matching Turkish translations.
 */

import modulesData from '../../scripts/data/modules.json';

export interface DemirtasSentenceInfo {
  exampleSentence: string;
  turkishTranslation: string;
  definition?: string;
}

const sentenceMap = new Map<string, DemirtasSentenceInfo>();

// Build fast lookup map from modules.json
if (Array.isArray(modulesData)) {
  for (const item of (modulesData as any[])) {
    if (item.word && item.example_sentence) {
      const cleanKey = item.word.toLowerCase().trim();
      sentenceMap.set(cleanKey, {
        exampleSentence: item.example_sentence,
        turkishTranslation: item.turkish_translation,
        definition: item.definition,
      });
    }
  }
}

/**
 * Retrieves the authentic English example sentence and Turkish translation
 * for a given vocabulary lemma.
 */
export function getDemirtasSentenceInfo(lemma?: string | null): DemirtasSentenceInfo | undefined {
  if (!lemma) return undefined;
  // Remove suffix like "(Modül 1)" if present
  const cleanKey = lemma.replace(/\s*\([^)]*\)/, '').trim().toLowerCase();
  return sentenceMap.get(cleanKey);
}
