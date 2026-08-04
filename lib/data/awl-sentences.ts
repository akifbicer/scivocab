/**
 * lib/data/awl-sentences.ts
 * ──────────────────────────
 * Sample academic sentences for AWL vocabulary items.
 * Provides authentic i+1 example sentences for flashcards when database records
 * do not have a dedicated example sentence column populated.
 */

export const AWL_SAMPLE_SENTENCES: Record<string, string> = {
  analysis:
    'The research team conducted a detailed statistical analysis of the experimental data to identify patterns that could support the central hypothesis.',
  approach:
    'The interdisciplinary approach the scientists adopted allowed them to combine linguistic theory with computational methods.',
  assessment:
    'Before approving the new curriculum, the committee carried out a comprehensive needs assessment across all participating schools.',
  assume:
    'Researchers commonly assume that participants will answer survey questions honestly, but this assumption is not always warranted.',
  authority:
    'The study questioned whether teachers retain sufficient authority to enforce academic integrity policies without institutional support.',
  available:
    'Because the data were freely available online, independent researchers were able to replicate the original findings without delay.',
  benefit:
    'For the benefit of future studies, the authors clearly documented all limitations and potential sources of bias in their methodology.',
  concept:
    'The concept of ecological resilience has become central to understanding how ecosystems recover from large-scale disturbances.',
  consistent:
    'The experimental results were consistent with the predictions of the theoretical model, providing strong support for the hypothesis.',
  context:
    'It is important to interpret any statistical finding within its broader social and political context before drawing causal conclusions.',
  evidence:
    'The authors presented compelling empirical evidence that early vocabulary instruction significantly accelerates reading comprehension in primary school students.',
  estimate:
    'Scientists estimate that approximately 8.7 million species exist on Earth, although only about 1.2 million have been formally described.',
  hypothesis:
    'Before designing the experiment, the team formulated a clear null hypothesis which stated that the treatment would have no measurable effect on cognitive performance.',
  indicate:
    'The survey results indicate that a majority of participants felt that access to quality education was the most significant factor in economic mobility.',
  method:
    'The most effective teaching method, according to the meta-analysis, was one that combined explicit instruction with opportunities for independent practice.',
  occur:
    'Cognitive dissonance is most likely to occur when an individual is forced to act in a way that conflicts with their core beliefs or values.',
  process:
    'Language acquisition is a complex, multi-stage process that is influenced by both innate biological factors and the richness of the linguistic environment.',
  significant:
    'There was a statistically significant improvement in the vocabulary scores of students who used spaced repetition compared to those who used traditional study methods.',
  structure:
    'Researchers argue that the underlying grammatical structure of a language can influence the way its speakers perceive time and causality.',
  variable:
    'In the study, the independent variable was the frequency of feedback given to learners, while the dependent variable was their retention score after two weeks.',
};

/**
 * Retrieves the authentic i+1 sample sentence for a given lemma.
 * Case-insensitive lookup.
 */
export function getSampleSentence(lemma?: string | null): string | undefined {
  if (!lemma) return undefined;
  const normalized = lemma.trim().toLowerCase();
  return AWL_SAMPLE_SENTENCES[normalized];
}
