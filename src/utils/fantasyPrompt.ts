import { formatMultiplicationDisplay } from './mathDisplay';

const START_PREFIXES = [
  'The Monster Minds have scrambled the numbers.',
  'The Monster Minds have mixed the fuel.',
  'The Monster Minds have corrupted the records.',
  'The Monster Minds have built a barrier.',
  'The Monster Minds have warped the forge.',
  'The Monster Minds have torn the map.',
  'The Monster Minds have jammed the clock.',
  'Quest:',
  'Mission:',
  'Spell:',
  'Challenge:',
];

const LEGACY_MATHARIA_PREFIX = /^Matharia\s+(mix|records|barrier|forge|map|clock)\s*-\s*/i;

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

const pickMathariaPrefix = (prompt: string) => {
  const lower = prompt.toLowerCase();
  if (/(fuel|ratio|fraction|percent|share|split|mix)/.test(lower)) return 'The Monster Minds have mixed the fuel.';
  if (/(graph|chart|bar|mean|data|record|ledger)/.test(lower)) return 'The Monster Minds have corrupted the records.';
  if (/(angle|triangle|polygon|turn|rotate|reflection)/.test(lower)) return 'The Monster Minds have built a barrier.';
  if (/(area|perimeter|volume|formula|cuboid|rectangle|length|width|height)/.test(lower)) return 'The Monster Minds have warped the forge.';
  if (/(coordinate|translate|beacon|scout|route|map)/.test(lower)) return 'The Monster Minds have torn the map.';
  if (/(time|clock|hour|minute|duration)/.test(lower)) return 'The Monster Minds have jammed the clock.';
  if (/(place value|round|digit|number)/.test(lower)) return 'The Monster Minds have scrambled the numbers.';
  return 'The Monster Minds have scrambled the numbers.';
};

const rewriteFuelMixPrompt = (prompt: string) => {
  const match = prompt.match(/^Fuel mix\s+([\d:]+)\.\s*Which fraction is\s+(.+?)\?$/i);
  if (!match) return null;
  const ratio = match[1];
  const target = match[2].trim();
  return `A Monster Mind has mixed the fuel. In the ratio ${ratio}, which fraction is ${target}?`;
};

export const formatFantasyPrompt = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) return prompt;

  const deMatharia = trimmed.replace(LEGACY_MATHARIA_PREFIX, '');
  if (deMatharia !== trimmed) return formatFantasyPrompt(deMatharia);

  if (START_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return prompt;
  if (trimmed.startsWith('A Monster Mind') || trimmed.startsWith('The Monster Minds') || trimmed.startsWith('The bridge') || trimmed.startsWith('The village') || trimmed.startsWith('The forge') || trimmed.startsWith('The path') || trimmed.startsWith('The map') || trimmed.startsWith('The records')) {
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
    return `The Monster Minds have scrambled the numbers. Solve ${formatMultiplicationDisplay(trimmed)}.`;
  }

  const prefix = pickMathariaPrefix(next);
  return prefix.endsWith('.') ? `${prefix} ${next}` : `${prefix} ${next}`;
};
