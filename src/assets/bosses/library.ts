export const loadSortedImages = (record: Record<string, string>): string[] => (
  Object.entries(record)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value)
);

const bossImageModules = import.meta.glob('./**/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const BOSS_ART_LIBRARY = loadSortedImages(bossImageModules);

const fallbackPool = BOSS_ART_LIBRARY.length ? BOSS_ART_LIBRARY : [];

export const hashSeed = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const pickBossArt = (seed: string, pool: string[] = fallbackPool): string => {
  if (!pool.length) return '';
  return pool[hashSeed(seed) % pool.length];
};

export const pickRandomBossArt = (pool: string[] = fallbackPool): string => {
  if (!pool.length) return '';
  return pool[Math.floor(Math.random() * pool.length)] || '';
};
