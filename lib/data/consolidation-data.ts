/**
 * lib/data/consolidation-data.ts
 * ────────────────────────────────
 * Data loader and accessor for module consolidation exercises
 * (Fill in the blanks & TR -> EN Sentence Translations).
 *
 * Source: scripts/data/academic_vocabulary_modules_1_100.json
 */

import rawModulesData from '../../scripts/data/academic_vocabulary_modules_1_100.json';
import rawWordsData from '../../scripts/data/modules_corrected_1000.json';

export interface ClozeQuestion {
  id: string;
  question: string;        // Sentence containing "________"
  answer: string;          // Target word (e.g., "repertoire")
  targetWord: string;      // Normalized target word
}

export interface TranslationQuestion {
  id: string;
  turkishSentence: string; // L1 target sentence
  englishSentence: string; // Target English model sentence
  targetWord: string;      // Target English lemma
}

export interface ModuleConsolidationData {
  moduleNumber: number;
  targetWords: string[];
  clozeQuestions: ClozeQuestion[];
  translationQuestions: TranslationQuestion[];
}

const moduleMap = new Map<number, ModuleConsolidationData>();

// Build fast lookup map at startup
if (Array.isArray(rawModulesData)) {
  for (const modItem of (rawModulesData as any[])) {
    const modNum = modItem.module;
    if (typeof modNum !== 'number') continue;

    const exercises = modItem.exercises || {};
    const clozeData = exercises['Fill in the blanks'] || {};
    const transData = exercises['Translation'] || {};

    const clozeQuestions: ClozeQuestion[] = [];
    const clozeQList: string[] = clozeData.questions || [];
    const clozeAList: string[] = clozeData.answerKey || [];

    const targetWordsSet = new Set<string>();

    for (let i = 0; i < clozeQList.length; i++) {
      const q = clozeQList[i];
      const a = clozeAList[i] || '';
      if (q && a) {
        clozeQuestions.push({
          id: `cloze-${modNum}-${i}`,
          question: q,
          answer: a.trim(),
          targetWord: a.trim().toLowerCase(),
        });
        targetWordsSet.add(a.trim());
      }
    }

    const translationQuestions: TranslationQuestion[] = [];
    const transQList: string[] = transData.questions || [];
    const transAList: string[] = transData.answerKey || [];

    for (let i = 0; i < transQList.length; i++) {
      const trSent = transQList[i];
      const enSent = transAList[i] || '';
      const targetWord = clozeAList[i] || '';

      if (trSent && enSent) {
        translationQuestions.push({
          id: `trans-${modNum}-${i}`,
          turkishSentence: trSent,
          englishSentence: enSent,
          targetWord: targetWord.trim(),
        });
      }
    }

    // If target words empty from cloze, fallback to rawWordsData
    if (targetWordsSet.size === 0 && Array.isArray(rawWordsData)) {
      for (const wItem of (rawWordsData as any[])) {
        if (wItem.module_number === modNum && wItem.word) {
          targetWordsSet.add(wItem.word.trim());
        }
      }
    }

    moduleMap.set(modNum, {
      moduleNumber: modNum,
      targetWords: Array.from(targetWordsSet),
      clozeQuestions,
      translationQuestions,
    });
  }
}

/**
 * Retrieves the consolidation questions and word bank for a given module (1-100).
 */
export function getModuleConsolidationData(moduleNumber: number): ModuleConsolidationData {
  const data = moduleMap.get(moduleNumber);

  if (data) {
    return data;
  }

  // Fallback generation if module number not explicitly found
  const fallbackWords: string[] = [];
  if (Array.isArray(rawWordsData)) {
    for (const wItem of (rawWordsData as any[])) {
      if (wItem.module_number === moduleNumber && wItem.word) {
        fallbackWords.push(wItem.word.trim());
      }
    }
  }

  return {
    moduleNumber,
    targetWords: fallbackWords.slice(0, 10),
    clozeQuestions: [],
    translationQuestions: [],
  };
}
