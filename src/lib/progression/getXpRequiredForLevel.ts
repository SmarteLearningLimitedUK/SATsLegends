export const getXpRequiredForLevel = (level: number) => 100 + Math.max(0, level - 1) * 50;
