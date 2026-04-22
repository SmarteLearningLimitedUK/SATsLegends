import { formatMultiplicationDisplay } from './mathDisplay';

const START_PREFIXES = [
  'The Monster Mind has scrambled the numbers.',
  'The Monster Mind has mixed the fuel.',
  'The Monster Mind has corrupted the records.',
  'The Monster Mind has built a barrier.',
  'The Monster Mind has warped the forge.',
  'The Monster Mind has torn the map.',
  'The Monster Mind has jammed the clock.',
  'Quest:',
  'Mission:',
  'Spell:',
  'Challenge:',
];

const LEGACY_WORLD_PREFIX = /^[a-z]+\s+(mix|records|barrier|forge|map|clock)\s*-\s*/i;

export const stripLegacyWorldPrefix = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) return prompt;

  const stripped = trimmed.replace(LEGACY_WORLD_PREFIX, '');
  if (stripped === trimmed) return prompt;
  return stripLegacyWorldPrefix(stripped);
};

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

const isMathExpression = (prompt: string) => /^[\d\s+\-x*/=().,]+$/.test(prompt.trim());

const isAllCapsWords = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!/[A-Z]/.test(trimmed)) return false;
  return trimmed === trimmed.toUpperCase() && /^[A-Z0-9 ,.'-]+$/.test(trimmed);
};

const pickScenarioPrefix = (prompt: string) => {
  const lower = prompt.toLowerCase();
  if (/(fuel|ratio|fraction|percent|share|split|mix)/.test(lower)) return 'The Monster Mind has mixed the fuel.';
  if (/(graph|chart|bar|mean|data|record|ledger)/.test(lower)) return 'The Monster Mind has corrupted the records.';
  if (/(angle|triangle|polygon|turn|rotate|reflection)/.test(lower)) return 'The Monster Mind has built a barrier.';
  if (/(area|perimeter|volume|formula|cuboid|rectangle|length|width|height)/.test(lower)) return 'The Monster Mind has warped the forge.';
  if (/(coordinate|translate|beacon|scout|route|map)/.test(lower)) return 'The Monster Mind has torn the map.';
  if (/(time|clock|hour|minute|duration)/.test(lower)) return 'The Monster Mind has jammed the clock.';
  if (/(place value|round|digit|number)/.test(lower)) return 'The Monster Mind has scrambled the numbers.';
  return 'The Monster Mind has scrambled the numbers.';
};

const rewriteFuelMixPrompt = (prompt: string) => {
  const match = prompt.match(/^Fuel mix\s+([\d:]+)\.\s*Which fraction is\s+(.+?)\?$/i);
  if (!match) return null;
  const ratio = match[1];
  const target = match[2].trim();
  return `A Monster Mind has mixed the fuel. In the ratio ${ratio}, which fraction is ${target}?`;
};

const collapseRepeatedWords = (prompt: string) =>
  prompt
    .replace(/\s+/g, ' ')
    .replace(/\b([A-Za-z][A-Za-z'-]*)\b(?:\s+\1\b)+/gi, '$1');

const dedupeRepeatedSentences = (prompt: string) => {
  const sentences = prompt.match(/[^.!?]+[.!?]?/g);
  if (!sentences) return prompt;

  const seen = new Set<string>();
  const unique: string[] = [];

  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;

    const normalized = trimmed
      .replace(/\s+/g, ' ')
      .replace(/[.!?]+$/g, '')
      .toLowerCase();

    if (seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(trimmed);
  });

  return unique.join(' ');
};

export const normalizePromptText = (prompt: string) => {
  const collapsed = collapseRepeatedWords(prompt.trim());
  return dedupeRepeatedSentences(collapsed)
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

type QuestionAction = 'Add' | 'Subtract' | 'Multiply' | 'Divide' | 'Match' | 'Select' | 'Round' | 'Rebuild' | 'Calculate';

const QUESTION_ACTION_RULES: Array<{ action: QuestionAction; patterns: RegExp[] }> = [
  { action: 'Add', patterns: [/\b(add|sum|plus|total)\b/i, /\+/] },
  { action: 'Subtract', patterns: [/\b(subtract|minus|difference|take away|less)\b/i, /-/] },
  { action: 'Multiply', patterns: [/\b(multiply|product|times|groups of)\b/i, /\b\d+\s*[x×*]\s*\d+/i] },
  { action: 'Divide', patterns: [/\b(divide|quotient|share equally|split equally|shared equally)\b/i, /\//] },
  { action: 'Match', patterns: [/\b(ratio|fraction|percent|share|split|mix|equal parts?)\b/i] },
  { action: 'Round', patterns: [/\b(round|nearest)\b/i] },
  { action: 'Rebuild', patterns: [/\b(place value|digit|scrambled the numbers|rebuild)\b/i] },
  { action: 'Calculate', patterns: [/\b(area|perimeter|volume|formula|cuboid|length|width|height)\b/i] },
  { action: 'Select', patterns: [/\b(select|choose|which|what|spot|pick|identify|find)\b/i] },
];

const inferQuestionAction = (prompt: string): QuestionAction => {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  if (/^[\d\s+\-x*/=().,]+$/.test(trimmed)) {
    if (/[+]/.test(trimmed)) return 'Add';
    if (/[×x*]/i.test(trimmed)) return 'Multiply';
    if (/[\/]/.test(trimmed)) return 'Divide';
    if (/-/.test(trimmed)) return 'Subtract';
    return 'Calculate';
  }

  for (const { action, patterns } of QUESTION_ACTION_RULES) {
    if (patterns.some((pattern) => pattern.test(lower))) return action;
  }

  if (/(graph|chart|bar|mean|median|mode|data|record|ledger)/.test(lower)) return 'Select';
  if (/(angle|triangle|polygon|rotate|reflection|turn)/.test(lower)) return 'Select';
  if (/(coordinate|translate|route|map|beacon|scout)/.test(lower)) return 'Select';
  if (/(time|clock|hour|minute|duration)/.test(lower)) return 'Select';

  return 'Select';
};

const stripQuestionLeadIn = (prompt: string) => {
  let next = prompt.trim();
  next = next.replace(/^(?:A|The) Monster Mind has [^.?!]+[.?!]\s*/i, '');
  next = next.replace(/^(?:A|The) Monster Mind(?:'s)?(?: has)?\s*/i, '');
  next = next.replace(/^(?:Solve|Work out|Calculate|Find|Select|Choose|Match|Add|Subtract|Multiply|Divide|Rebuild|Round|Spot|Pick out|Identify)\s+/i, '');
  next = next.replace(/^(?:Which|What|How many|How much)\s+/i, (match) => match.charAt(0).toUpperCase() + match.slice(1));
  return next.trim();
};

export const formatQuestionCardPrompt = (prompt: string) => {
  const normalized = normalizePromptText(prompt);
  if (!normalized) return prompt;

  if (normalized.includes('\n')) {
    const [firstLine] = normalized.split('\n');
    const actionLine = inferQuestionAction(firstLine);
    return `${actionLine}\n${normalized}`;
  }

  const action = inferQuestionAction(normalized);
  return `${action}\n${normalized}`;
};

export const formatFantasyPrompt = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) return prompt;

  const strippedLegacy = trimmed.replace(LEGACY_WORLD_PREFIX, '');
  if (strippedLegacy !== trimmed) return formatFantasyPrompt(strippedLegacy);

  if (START_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return prompt;
  if (trimmed.startsWith('A Monster Mind') || trimmed.startsWith('The Monster Mind') || trimmed.startsWith('The bridge') || trimmed.startsWith('The village') || trimmed.startsWith('The forge') || trimmed.startsWith('The path') || trimmed.startsWith('The map') || trimmed.startsWith('The records')) {
    return prompt;
  }
  if (isAllCapsWords(trimmed)) return prompt;

  const fuelMix = rewriteFuelMixPrompt(trimmed);
  if (fuelMix) return fuelMix;

  let next = trimmed;
  REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });

  if (isMathExpression(trimmed)) {
    return normalizePromptText(`The Monster Mind has scrambled the numbers. Solve ${formatMultiplicationDisplay(trimmed)}.`);
  }

  const prefix = pickScenarioPrefix(next);
  return normalizePromptText(prefix.endsWith('.') ? `${prefix} ${next}` : `${prefix} ${next}`);
};
