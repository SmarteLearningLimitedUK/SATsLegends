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

const isMathExpression = (prompt: string) => /^[\d\s+\-x*/=().,]+$/.test(prompt.trim());

const isAllCapsWords = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!/[A-Z]/.test(trimmed)) return false;
  return trimmed === trimmed.toUpperCase() && /^[A-Z0-9 ,.'-]+$/.test(trimmed);
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

  const strippedLegacy = trimmed.replace(LEGACY_WORLD_PREFIX, '');
  if (strippedLegacy !== trimmed) return formatFantasyPrompt(strippedLegacy);

  if (START_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return prompt;
  if (trimmed.startsWith('A Monster Mind') || trimmed.startsWith('The Monster Mind') || trimmed.startsWith('The bridge') || trimmed.startsWith('The village') || trimmed.startsWith('The forge') || trimmed.startsWith('The path') || trimmed.startsWith('The map') || trimmed.startsWith('The records')) {
    return prompt;
  }
  if (isAllCapsWords(trimmed)) return prompt;

  const fuelMix = rewriteFuelMixPrompt(trimmed);
  if (fuelMix) return fuelMix;


  if (isMathExpression(trimmed)) {
    return `Work out ${formatMultiplicationDisplay(trimmed)}.`;
  }

  return trimmed;
};
