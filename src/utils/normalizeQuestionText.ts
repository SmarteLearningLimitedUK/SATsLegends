const QUESTION_STARTERS = [
  'what',
  'which',
  'who',
  'when',
  'where',
  'why',
  'how',
  'is',
  'are',
  'am',
  'do',
  'does',
  'did',
  'can',
  'could',
  'would',
  'should',
  'will',
  'true or false',
];

const endsWithTerminalPunctuation = (value: string) => /[.?!…]$/.test(value.trim());

const looksLikeQuestion = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes('?')) return true;

  const lower = trimmed.toLowerCase();
  return QUESTION_STARTERS.some((starter) => lower.startsWith(`${starter} `) || lower === starter);
};

const sentenceCaseFirstLetter = (value: string) => {
  // Find first a-z letter and uppercase it (leave leading quotes/emoji/etc untouched).
  const index = value.search(/[A-Za-z]/);
  if (index < 0) return value;
  return value.slice(0, index) + value[index].toUpperCase() + value.slice(index + 1);
};

/**
 * Conservative display normalizer for question/prompts.
 * - Trims whitespace
 * - Ensures first letter is capitalized
 * - Ensures a terminal punctuation mark (question-mark when it looks like a question)
 *
 * Intentionally does NOT attempt deep grammar rewriting.
 */
export const normalizeQuestionText = (input: string): string => {
  const normalizeLine = (line: string) => {
    const trimmed = line.replace(/[ \t]+/g, ' ').trim();
    if (!trimmed) return '';

    const cased = sentenceCaseFirstLetter(trimmed);
    if (endsWithTerminalPunctuation(cased)) return cased;
    return looksLikeQuestion(cased) ? `${cased}?` : `${cased}.`;
  };

  // Preserve author-intended line breaks for prompt layout.
  if (input.includes('\n')) {
    return input
      .split('\n')
      .map((line) => normalizeLine(line))
      .join('\n')
      .trim();
  }

  return normalizeLine(input);
};
