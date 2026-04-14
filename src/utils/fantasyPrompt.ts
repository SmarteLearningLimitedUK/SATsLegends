const START_PREFIXES = ['Matharia alert -', 'Matharia mix -', 'Matharia records -', 'Matharia barrier -', 'Matharia forge -', 'Matharia map -', 'Matharia clock -', 'Quest:', 'Mission:', 'Spell:', 'Challenge:'];

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
  if (/(fuel|ratio|fraction|percent|share|split|mix)/.test(lower)) return 'Matharia mix -';
  if (/(graph|chart|bar|mean|data|record|ledger)/.test(lower)) return 'Matharia records -';
  if (/(angle|triangle|polygon|turn|rotate|reflection)/.test(lower)) return 'Matharia barrier -';
  if (/(area|perimeter|volume|formula|cuboid|rectangle|length|width|height)/.test(lower)) return 'Matharia forge -';
  if (/(coordinate|translate|beacon|scout|route|map)/.test(lower)) return 'Matharia map -';
  if (/(time|clock|hour|minute|duration)/.test(lower)) return 'Matharia clock -';
  if (/(place value|round|digit|number)/.test(lower)) return 'Matharia alert -';
  return 'Matharia alert -';
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
  if (START_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return prompt;
  if (trimmed.startsWith('A Monster Mind') || trimmed.startsWith('The bridge') || trimmed.startsWith('The village') || trimmed.startsWith('The forge') || trimmed.startsWith('The path') || trimmed.startsWith('The map') || trimmed.startsWith('The records')) {
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
    return `Matharia alert - Solve ${trimmed}`;
  }

  const prefix = pickMathariaPrefix(next);
  return `${prefix} ${next}`;
};
