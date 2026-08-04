/**
 * lib/ai/llm.ts
 * ──────────────
 * LLM Service Layer — Google Gemini (gemini-1.5-flash)
 *
 * Provides two cognitive enrichment functions:
 *
 *  1. generateContextSentence   → Produces an authentic i+1 academic sentence
 *                                 for a given lemma and CEFR level.
 *  2. analyzeUserSentence       → Evaluates a learner's sentence for correctness,
 *                                 collocation fit, and L1 (Turkish) negative transfer.
 *
 * Design decisions:
 *  - Lazy GoogleGenerativeAI singleton avoids module-level errors in environments where
 *    GEMINI_API_KEY is not set (e.g., CI, static build).
 *  - generationConfig: { responseMimeType: 'application/json' } guarantees valid JSON output;
 *    Zod provides runtime type safety on top of that.
 *  - All public functions return a discriminated-union result type (never throw)
 *    so callers can handle errors without try/catch.
 *  - Graceful fallbacks prevent UI breakage when the API is unavailable.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z }                  from 'zod';

// =============================================================================
// 1. CLIENT — lazy singleton
// =============================================================================

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'GEMINI_API_KEY is not set.\n' +
      'Add it to .env.local:\n\n' +
      '  GEMINI_API_KEY=AQ...\n',
    );
  }

  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(apiKey.trim());
  }

  return _genAI;
}

// =============================================================================
// 2. ZOD SCHEMAS & TYPES
// =============================================================================

/** Output shape for generateContextSentence. */
export const ContextSentenceSchema = z.object({
  /** The generated i+1 example sentence containing the target word. */
  sentence:       z.string().min(10).max(400),
  /** The exact lemma as it appears in the sentence (may differ in form). */
  targetLemma:    z.string().min(1).max(60),
  /**
   * A brief Turkish contextual hint (not a full translation) that helps
   * the learner understand the sentence without revealing the word meaning.
   * Example: "araştırmacılar veriyi incelerken"
   */
  trContextHint:  z.string().min(2).max(120),
});

export type ContextSentenceResult = z.infer<typeof ContextSentenceSchema>;

/** Output shape for analyzeUserSentence. */
export const SentenceFeedbackSchema = z.object({
  /** Whether the sentence is overall correct and natural. */
  isValid:                  z.boolean(),
  /** Holistic quality score 0 – 100. */
  score:                    z.number().int().min(0).max(100),
  /** The corrected or confirmed sentence (returned even if isValid=true). */
  correctedSentence:        z.string().min(1),
  /** True if a Turkish-to-English calque / negative transfer error was detected. */
  l1TransferErrorDetected:  z.boolean(),
  /**
   * Encouraging, actionable feedback written in Turkish (2–4 sentences).
   * Must acknowledge effort, explain the error (if any), and give the fix.
   */
  feedbackTR:               z.string().min(10).max(600),
  /**
   * The most natural English collocation for the target word in this context.
   * Only included when a collocation error is present.
   */
  suggestedCollocation:     z.string().optional(),
});

export type SentenceFeedbackResult = z.infer<typeof SentenceFeedbackSchema>;

// =============================================================================
// 3. GENERIC JSON-MODE HELPER
// =============================================================================

type OkResult<T>   = { ok: true;  data: T };
type ErrResult     = { ok: false; error: string };
type CallResult<T> = OkResult<T> | ErrResult;

/**
 * Calls Google Gemini (gemini-1.5-flash) in JSON mode and validates the response
 * against a Zod schema.
 */
async function callWithJsonMode<T>(
  systemInstruction: string,
  prompt:            string,
  schema:            z.ZodType<T>,
  options?:          { temperature?: number; maxOutputTokens?: number },
): Promise<CallResult<T>> {
  try {
    const genAI = getGenAI();

    const model = genAI.getGenerativeModel({
      model:             'gemini-2.0-flash',
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature:      options?.temperature     ?? 0.3,
        maxOutputTokens:  options?.maxOutputTokens ?? 600,
      },
    });

    const result = await model.generateContent(prompt);
    const raw    = result.response.text();

    if (!raw) throw new Error('Model returned an empty response.');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Model output was not valid JSON:\n${raw.slice(0, 200)}`);
    }

    const validated = schema.parse(parsed); // throws ZodError on mismatch
    return { ok: true, data: validated };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[lib/ai/llm] Error:', msg);
    return { ok: false, error: msg };
  }
}

// =============================================================================
// 4. FUNCTION 1 — generateContextSentence
// =============================================================================

/**
 * Generates an authentic, level-appropriate i+1 academic sentence for a
 * given vocabulary lemma using Google Gemini.
 *
 * @param lemma      - The target vocabulary word (base form, e.g. "analysis").
 * @param cefrLevel  - Learner's current CEFR level ("B2", "C1", etc.).
 * @param userTopic  - Optional thematic context (e.g. "climate change").
 *
 * @returns A discriminated-union result: success yields ContextSentenceResult,
 *          failure yields the error message alongside a non-breaking fallback.
 */
export async function generateContextSentence(
  lemma:      string,
  cefrLevel:  string,
  userTopic?: string,
): Promise<{ data: ContextSentenceResult; error: string | null }> {

  const topicClause = userTopic
    ? ` The sentence must relate to the academic topic: "${userTopic}".`
    : '';

  const systemInstruction = `You are an expert academic English vocabulary teacher who specialises in teaching Turkish-speaking university students. Your task is to create authentic, compelling i+1 example sentences that make vocabulary acquisition memorable.

i+1 principle: the sentence must be slightly above the learner's declared CEFR level to create productive challenge — all vocabulary except the target word should be familiar.

You MUST return a single valid JSON object with exactly these keys: "sentence", "targetLemma", "trContextHint". No markdown, no explanation — only JSON.`;

  const userPrompt = `Generate one authentic, academically appropriate English sentence for the target word "${lemma}" for a ${cefrLevel}-level Turkish university student.${topicClause}

Constraints:
- The sentence must naturally contain the exact word "${lemma}" or one of its inflected forms.
- All other vocabulary must be at or below ${cefrLevel} level.
- The sentence must be 15–35 words long.
- "trContextHint": a 3–8 word Turkish phrase that hints at the sentence's theme WITHOUT translating "${lemma}" (e.g. "araştırmacılar veriyi incelerken").

Return ONLY this JSON structure:
{
  "sentence": "The full sentence here.",
  "targetLemma": "${lemma}",
  "trContextHint": "Türkçe bağlam ipucu"
}`;

  const result = await callWithJsonMode(systemInstruction, userPrompt, ContextSentenceSchema, {
    temperature:     0.7,
    maxOutputTokens: 350,
  });

  if (!result.ok) {
    return {
      data: {
        sentence:      `Researchers often use ${lemma} as a key concept when examining complex academic phenomena.`,
        targetLemma:   lemma,
        trContextHint: 'AI servisi şu an kullanılamıyor.',
      },
      error: result.error,
    };
  }

  return { data: result.data, error: null };
}

// =============================================================================
// 5. FUNCTION 2 — analyzeUserSentence
// =============================================================================

/**
 * Analyses a learner's sentence for correct target-word usage, collocation
 * quality, grammar, and Turkish-to-English negative transfer errors using Google Gemini.
 *
 * @param userSentence  - The sentence written by the learner.
 * @param targetLemma   - The word the learner was asked to use.
 * @param l1Meaning     - Turkish meaning(s) of the word (e.g. "analiz, çözümleme").
 *
 * @returns A discriminated-union result: success yields SentenceFeedbackResult,
 *          failure yields a non-breaking fallback alongside the error message.
 */
export async function analyzeUserSentence(
  userSentence: string,
  targetLemma:  string,
  l1Meaning:    string,
): Promise<{ data: SentenceFeedbackResult; error: string | null }> {

  const systemInstruction = `You are a precise, encouraging English language analyst who specialises in academic English for Turkish-speaking university students. Your analysis focuses on:

1. Correct usage of the target vocabulary item (morphological form, syntactic role, collocation fit).
2. Detection of L1 (Turkish) negative transfer errors — calque translations where Turkish structure bleeds into English, for example:
   • "make a research" (araştırma yapmak) → should be "conduct research" / "carry out research"
   • "do a decision" (karar vermek) → should be "make a decision"
   • "open/close the light" (ışığı açmak/kapatmak) → "turn on/off the light"
   • "attend to the meeting" (toplantıya katılmak) → "attend the meeting"
   • "I am graduated" (mezun oldum) → "I graduated" / "I have graduated"
   • Adding definite article to uncountable academic nouns (e.g., "the information", "the research")
3. Academic register and grammatical accuracy.
4. Collocation appropriateness (e.g., "strong evidence", not "big evidence").

Scoring guide (0-100):
  90-100: Perfect — natural, accurate, academic.
  70-89:  Good — minor issues, clear meaning.
  50-69:  Acceptable — noticeable error but target word used meaningfully.
  30-49:  Poor — significant grammar or collocation error.
  0-29:   Incorrect — target word misused or major structural error.

feedbackTR must be in Turkish, 2–4 sentences, warm and encouraging. Acknowledge effort first, then explain the issue, then give the fix.

Return ONLY a valid JSON object — no markdown, no extra text.`;

  const userPrompt = `Analyze the following learner sentence. The learner was asked to write a sentence using the English word "${targetLemma}" (Turkish meaning: ${l1Meaning}).

Learner's sentence:
"${userSentence}"

Evaluate the sentence and return ONLY this JSON structure:
{
  "isValid": true or false,
  "score": integer 0-100,
  "correctedSentence": "The corrected sentence, or the original if correct.",
  "l1TransferErrorDetected": true or false,
  "feedbackTR": "Türkçe teşvik edici ve açıklayıcı geribildirim (2-4 cümle).",
  "suggestedCollocation": "Optional: the most natural collocation with '${targetLemma}' if a collocation error was found."
}`;

  const result = await callWithJsonMode(systemInstruction, userPrompt, SentenceFeedbackSchema, {
    temperature:     0.2,
    maxOutputTokens: 600,
  });

  if (!result.ok) {
    return {
      data: {
        isValid:                 false,
        score:                   0,
        correctedSentence:       userSentence,
        l1TransferErrorDetected: false,
        feedbackTR:
          'AI analiz servisi şu an kullanılamıyor. ' +
          'Cümleniz kaydedildi; lütfen daha sonra tekrar deneyin.',
        suggestedCollocation: undefined,
      },
      error: result.error,
    };
  }

  return { data: result.data, error: null };
}
