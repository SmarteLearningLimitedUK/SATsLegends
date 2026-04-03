const START_PREFIXES = ['Quest:', 'Mission:', 'Spell:', 'Challenge:'];

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bpupil(s)?\b/gi, 'apprentice$1'],
  [/\bstudent(s)?\b/gi, 'apprentice$1'],
  [/\bteacher\b/gi, 'mentor'],
  [/\bshop\b/gi, 'market stall'],
  [/\bstore\b/gi, 'market stall'],
  [/\bstadium\b/gi, 'arena'],
  [/\bconcert\b/gi, 'festival'],
  [/\btrain\b/gi, 'airship'],
  [/\bbus\b/gi, 'caravan'],
  [/\btickets\b/gi, 'passes'],
  [/\btreasure\b/gi, 'relics'],
  [/\bscout\b/gi, 'ranger'],
];

const isMathExpression = (prompt: string) => /^[\d\s+\\-×x*/÷=().,]+$/.test(prompt.trim());

const isAllCapsWords = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!/[A-Z]/.test(trimmed)) return false;
  return trimmed === trimmed.toUpperCase() && /^[A-Z0-9 ,.'-]+$/.test(trimmed);
};

export const formatFantasyPrompt = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) return prompt;
  if (START_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return prompt;
  if (isAllCapsWords(trimmed)) return prompt;
  if (isMathExpression(trimmed)) return `Quest: Solve ${trimmed}`;

  let next = trimmed;
  REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });

  return `Quest: ${next}`;
};
