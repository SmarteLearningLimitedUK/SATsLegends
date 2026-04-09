import { getXpRequiredForLevel } from './getXpRequiredForLevel';
import { PlayerProfile } from './types';

export type XpGainResult = {
  player: PlayerProfile;
  leveledUp: boolean;
  levelsGained: number;
  xpRequiredForNextLevel: number;
  previousLevel: number;
  previousXp: number;
};

export const applyXpGain = (player: PlayerProfile, gainedXp: number): XpGainResult => {
  let currentXp = player.currentXp + gainedXp;
  let level = player.level;
  let leveledUp = false;
  let levelsGained = 0;
  const previousLevel = player.level;
  const previousXp = player.currentXp;

  while (currentXp >= getXpRequiredForLevel(level)) {
    currentXp -= getXpRequiredForLevel(level);
    level += 1;
    leveledUp = true;
    levelsGained += 1;
  }

  return {
    player: {
      ...player,
      level,
      currentXp,
      totalXpEarned: player.totalXpEarned + gainedXp,
    },
    leveledUp,
    levelsGained,
    xpRequiredForNextLevel: getXpRequiredForLevel(level),
    previousLevel,
    previousXp,
  };
};
