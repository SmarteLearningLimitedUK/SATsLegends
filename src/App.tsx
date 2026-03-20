import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from './components/AssetIcon';
import { ACHIEVEMENTS, AVATARS, INITIAL_DAILY_QUESTS, ISLANDS } from './constants';
import { DEFAULT_AVATAR_ID } from './assets/characters';
import { GameScreen, IslandData, LevelData, MiniGameType, PlayerData } from './types';
import WorldMap from './screens/WorldMap';
import IslandLevels from './screens/IslandLevels';
import { getMiniGame, MiniGameRegistryKey } from './games';
import { isBossEncounterGameType } from './games/BossEncounterGame';
import AvatarSelect from './screens/AvatarSelect';
import DailyRewardsModal from './components/modals/DailyRewardsModal';
import DailyQuestsModal from './components/modals/DailyQuestsModal';
import AchievementsModal from './components/modals/AchievementsModal';
import ParentDashboard from './screens/ParentDashboard';
import LevelResultModal from './components/LevelResultModal';
import GameRulesModal from './components/GameRulesModal';
import {
  FramedPanel,
  GameScreenShell,
  HUDBar,
  PrimaryActionButton,
  PremiumHeaderBar,
  RewardPanel,
  SecondaryActionButton,
} from './layout/ScreenPrimitives';
import { GAME_META } from './gameMeta';
import { getBlueprintRuleSet } from './systems/content/islandBlueprint';
import {
  GAME_AUDIO_STORAGE_KEY,
  GAME_HUD_HELP_EVENT,
  GAME_HUD_MUTE_EVENT,
  GAME_HUD_MUTE_SYNC_EVENT,
} from './gameHudEvents';
import { triggerHaptic } from './haptics';
import splashPoster from './assets/splash.png';

const PLAYER_STORAGE_KEY = 'maths_quest_player';
const ALL_ISLAND_IDS = ISLANDS.map(island => island.id);
const MAP_LAYOUT_SCREENS: GameScreen[] = ['world_map', 'island_levels'];
const QUESTION_MATCH_FRAME_GAMES: MiniGameType[] = [
  'cloud_collapse',
  'fraction_match',
  'potion_pour',
  'take_out_rush',
  'prime_pop',
  'angle_arena',
  'polygon_palace',
  'data_dungeon',
  'monster_market',
  'ratio_rapids',
  'timekeeper_temple',
  'measurement_forge',
  'tower_of_factors',
  'place_value_peaks',
  'chart_chase',
  'equation_grove',
  'coordinate_quest',
  'calculation_clash',
  'percent_pulse',
  'transform_temple',
  'scale_safari',
  'mean_machine',
  'rule_runner',
  'sequence_sprint',
  'logic_sort',
  'shape_shift',
  'matrix_match',
];
const SCREEN_BEHAVIOR: Record<GameScreen, {
  scrollable: boolean;
  shell: 'splash' | 'compact' | 'playfield';
  family: 'hub' | 'game' | 'overlay';
}> = {
  splash: { scrollable: false, shell: 'splash', family: 'hub' },
  profile_setup: { scrollable: false, shell: 'compact', family: 'hub' },
  avatar_selection: { scrollable: false, shell: 'playfield', family: 'hub' },
  world_map: { scrollable: true, shell: 'playfield', family: 'hub' },
  island_levels: { scrollable: true, shell: 'playfield', family: 'hub' },
  gameplay: { scrollable: false, shell: 'playfield', family: 'game' },
  level_result: { scrollable: false, shell: 'playfield', family: 'overlay' },
  shop: { scrollable: false, shell: 'compact', family: 'hub' },
  profile: { scrollable: false, shell: 'compact', family: 'hub' },
  settings: { scrollable: false, shell: 'compact', family: 'hub' },
  parent_dashboard: { scrollable: true, shell: 'playfield', family: 'hub' },
};

const IPHONE_STAGE_WIDTH = 390;
const IPHONE_STAGE_HEIGHT = 844;

type GameRulesMode = 'start' | 'help';

const resolveAvatarId = (avatarId?: string) => (
  AVATARS.some(avatar => avatar.id === avatarId) ? avatarId! : DEFAULT_AVATAR_ID
);

const resolveMiniGameRegistryKey = (level: LevelData): MiniGameRegistryKey | null => {
  if (level.isBoss && isBossEncounterGameType(level.gameType)) {
    return 'BossEncounterGame';
  }

  switch (level.gameType) {
    case 'cloud_collapse':
    case 'fraction_match':
      return 'FractionMatchGame';
    case 'potion_pour':
      return 'PotionPourGame';
    case 'take_out_rush':
      return 'TakeOutRushGame';
    case 'prime_pop':
      return 'PrimePopGame';
    case 'angle_arena':
      return 'AngleArenaGame';
    case 'polygon_palace':
      return 'PolygonPalaceGame';
    case 'data_dungeon':
      if (level.blueprintKey === 'data_dash' || level.blueprintKey === 'mode_miner') {
        return 'ModeMinerGame';
      }
      if (level.blueprintKey === 'table_trouble') {
        return 'LineGraphLabGame';
      }
      if (level.blueprintKey === 'data_detective') {
        return 'DataDetectiveGame';
      }
      return 'DataDungeonGame';
    case 'monster_market':
      return 'MonsterMarketGame';
    case 'ratio_rapids':
      if (level.blueprintKey === 'share_splitter') {
        return 'ShareSplitterGame';
      }
      if (level.blueprintKey === 'maths_vs_zombies') {
        return 'MathsVsZombiesGame';
      }
      return 'RatioRapidsGame';
    case 'timekeeper_temple':
      return 'TimekeeperTempleGame';
    case 'measurement_forge':
      if (level.blueprintKey === 'perimeter_path') {
        return 'PerimeterPathGame';
      }
      if (level.blueprintKey === 'volume_vault') {
        return 'VolumeVaultGame';
      }
      return 'MeasurementForgeGame';
    case 'tower_of_factors':
      if (level.blueprintKey === 'factor_frenzy') {
        return 'FactorFrenzyGame';
      }
      return 'TowerOfFactorsGame';
    case 'place_value_peaks':
      if (level.blueprintKey === 'place_value_panic') {
        return 'PlaceValuePanicGame';
      }
      if (level.blueprintKey === 'rounding_rampage') {
        return 'RoundingRocketGame';
      }
      return 'DecimalSniperGame';
    case 'chart_chase':
      if (level.blueprintKey === 'line_graph_lab') {
        return 'LineGraphLabGame';
      }
      if (level.blueprintKey === 'chart_challenge' || level.blueprintKey === 'median_mountain') {
        return 'MedianMountainGame';
      }
      return 'TreasureChartCoveGame';
    case 'equation_grove':
      return level.blueprintKey === 'order_ops_arena' ? 'OrderOpsArenaGame' : 'RuneLockDungeonsGame';
    case 'coordinate_quest':
      return 'CoordinateTranslationGame';
    case 'calculation_clash':
      return level.blueprintKey === 'division_dock' ? 'DivisionDockGame' : 'CalculationCrashGame';
    case 'percent_pulse':
      return 'CurriculumChallengeGame';
    case 'transform_temple':
      if (level.blueprintKey === 'reflection_rescue') {
        return 'RotationReflectionGame';
      }
      return 'CurriculumChallengeGame';
    case 'scale_safari':
      if (level.blueprintKey === 'scale_builder') {
        return 'ScaleBuilderGame';
      }
    case 'mean_machine':
      if (level.blueprintKey === 'mean_machine') {
        return 'MeanMachineGame';
      }
      if (level.blueprintKey === 'median_mountain') {
        return 'MedianMountainGame';
      }
    case 'rule_runner':
      if (level.blueprintKey === 'median_mountain') {
        return 'MedianMountainGame';
      }
      return 'CurriculumChallengeGame';
    case 'sequence_sprint':
    case 'logic_sort':
    case 'shape_shift':
      if (level.blueprintKey === 'rotation_relay') {
        return 'RotationReflectionGame';
      }
      return 'ReasoningGame';
    case 'matrix_match':
      return 'ReasoningGame';
    default:
      return null;
  }
};

const createDefaultPlayer = (parsed?: Partial<PlayerData> | null): PlayerData => ({
  playerName: parsed?.playerName || '',
  avatarId: resolveAvatarId(parsed?.avatarId),
  level: parsed?.level || 1,
  xp: parsed?.xp || 0,
  coins: parsed?.coins || 100,
  gems: parsed?.gems || 10,
  unlockedIslands: ALL_ISLAND_IDS,
  completedLevels: parsed?.completedLevels || {},
  levelStars: parsed?.levelStars || {},
  lastLoginDate: parsed?.lastLoginDate,
  dailyStreak: parsed?.dailyStreak || 1,
  claimedDailyRewardToday: parsed?.claimedDailyRewardToday || false,
  dailyQuests: parsed?.dailyQuests || INITIAL_DAILY_QUESTS,
  achievements: parsed?.achievements || [],
  customSpriteUrl: parsed?.customSpriteUrl,
  stats: {
    totalStars: parsed?.stats?.totalStars || 0,
    totalGamesPlayed: parsed?.stats?.totalGamesPlayed || 0,
    totalCoinsEarned: parsed?.stats?.totalCoinsEarned || 0,
  },
});

const App: React.FC = () => {
  const [stageScale, setStageScale] = useState(1);
  const [screen, setScreen] = useState<GameScreen>('splash');
  const [player, setPlayer] = useState<PlayerData>(() => {
    const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return createDefaultPlayer(parsed);
  });
  const [draftName, setDraftName] = useState('');
  const [selectedIsland, setSelectedIsland] = useState<IslandData | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<LevelData | null>(null);
  const [showDailyRewards, setShowDailyRewards] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGameRules, setShowGameRules] = useState(false);
  const [gameRulesMode, setGameRulesMode] = useState<GameRulesMode>('help');
  const [isGameplayInstructionPending, setIsGameplayInstructionPending] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true');
  const [levelResult, setLevelResult] = useState<null | {
    type: 'victory' | 'gameover';
    title: string;
    subtitle: string;
    score: number;
    stars: number;
    coinsEarned: number;
    xpEarned: number;
    islandUnlockedName?: string;
    achievementsUnlocked?: string[];
  }>(null);

  const hasCompletedProfile = useMemo(
    () => Boolean(player.playerName.trim() && player.avatarId),
    [player.playerName, player.avatarId],
  );
  const selectedRuleSet = useMemo(
    () => (
      getBlueprintRuleSet(selectedLevel?.blueprintKey)
      || (selectedLevel?.gameType ? GAME_META[selectedLevel.gameType]?.rules || null : null)
    ),
    [selectedLevel?.blueprintKey, selectedLevel?.gameType],
  );

  const closeGameRules = () => {
    setShowGameRules(false);
    if (screen === 'gameplay' && gameRulesMode === 'start') {
      setIsGameplayInstructionPending(false);
    }
    setGameRulesMode('help');
  };

  useEffect(() => {
    const updateStageScale = () => {
      const scale = Math.min(
        window.innerWidth / IPHONE_STAGE_WIDTH,
        window.innerHeight / IPHONE_STAGE_HEIGHT,
      );
      setStageScale(Number.isFinite(scale) && scale > 0 ? scale : 1);
    };

    updateStageScale();
    window.addEventListener('resize', updateStageScale);
    window.addEventListener('orientationchange', updateStageScale);

    return () => {
      window.removeEventListener('resize', updateStageScale);
      window.removeEventListener('orientationchange', updateStageScale);
    };
  }, []);

  useEffect(() => {
    if (screen === 'profile_setup') {
      setDraftName(player.playerName || '');
    }
  }, [screen]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (player.lastLoginDate !== today) {
      setPlayer(prev => {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const wasYesterday = prev.lastLoginDate === yesterday;

        return {
          ...prev,
          lastLoginDate: today,
          dailyStreak: wasYesterday ? prev.dailyStreak + 1 : 1,
          claimedDailyRewardToday: false,
          dailyQuests: INITIAL_DAILY_QUESTS.map(quest => ({ ...quest })),
        };
      });
      setShowDailyRewards(true);
    }
  }, [player.lastLoginDate]);

  useEffect(() => {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    localStorage.setItem(GAME_AUDIO_STORAGE_KEY, String(isMuted));
    window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_SYNC_EVENT, { detail: { muted: isMuted } }));
    document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((media) => {
      media.muted = isMuted;
    });
  }, [isMuted, screen]);

  useEffect(() => {
    const handleOpenHelp = () => {
      if (screen === 'gameplay' && selectedRuleSet) {
        setGameRulesMode('help');
        setShowGameRules(true);
      }
    };

    const handleMuteChange = (event: Event) => {
      const detail = (event as CustomEvent<{ muted?: boolean }>).detail;
      setIsMuted((prev) => (typeof detail?.muted === 'boolean' ? detail.muted : !prev));
    };

    window.addEventListener(GAME_HUD_HELP_EVENT, handleOpenHelp as EventListener);
    window.addEventListener(GAME_HUD_MUTE_EVENT, handleMuteChange as EventListener);

    return () => {
      window.removeEventListener(GAME_HUD_HELP_EVENT, handleOpenHelp as EventListener);
      window.removeEventListener(GAME_HUD_MUTE_EVENT, handleMuteChange as EventListener);
    };
  }, [screen, selectedRuleSet]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) {
      setIsGameplayInstructionPending(false);
      return;
    }

    if (!selectedRuleSet) {
      setIsGameplayInstructionPending(false);
      return;
    }

    setIsGameplayInstructionPending(true);
    setGameRulesMode('start');
    setShowGameRules(true);
  }, [screen, selectedLevel?.id, selectedRuleSet]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) return;

    const miniGameKey = resolveMiniGameRegistryKey(selectedLevel);
    if (!miniGameKey) return;

    const miniGame = getMiniGame(miniGameKey);
    miniGame.init();
    miniGame.update(0);
    miniGame.handleInput({
      type: 'mount',
      payload: {
        gameType: selectedLevel.gameType,
        levelId: selectedLevel.id,
        blueprintKey: selectedLevel.blueprintKey,
      },
    });
  }, [screen, selectedLevel]);

  const goToHome = () => {
    setSelectedLevel(null);
    setScreen('world_map');
  };

  const handleStartAdventure = () => {
    triggerHaptic('tap');
    if (!player.playerName.trim()) {
      setDraftName('Explorer');
      setScreen('profile_setup');
      return;
    }

    setScreen('avatar_selection');
  };

  const handleSaveProfileName = () => {
    triggerHaptic('selection');
    const sanitizedName = draftName.trim() || 'Explorer';
    setPlayer(prev => ({ ...prev, playerName: sanitizedName }));
    setScreen('avatar_selection');
  };

  const handleAvatarConfirm = () => {
    triggerHaptic('success');
    setScreen('world_map');
  };

  const handleIslandSelect = (island: IslandData) => {
    triggerHaptic('selection');
    setSelectedIsland(island);
    setSelectedLevel(null);
    setScreen('island_levels');
  };

  const handleLevelSelect = (level: LevelData) => {
    triggerHaptic('selection');
    setSelectedLevel(level);
    setScreen('gameplay');
  };

  const handleGameVictory = (stars: number, score: number) => {
    if (!selectedIsland || !selectedLevel) return;
    triggerHaptic('success');

    const earnedCoins = stars * 50;
    const earnedXp = stars * 100;
    const islandId = selectedIsland.id;
    const levelId = selectedLevel.id;
    const nextIslandId = islandId + 1;
    const islandUnlockedName = selectedLevel.isBoss && nextIslandId <= ISLANDS.length
      ? ISLANDS.find(island => island.id === nextIslandId)?.name
      : undefined;
    let achievementsUnlocked: string[] = [];

    setPlayer(prev => {
      const completedLevels = { ...prev.completedLevels };
      const levelStars = { ...prev.levelStars };

      if (!completedLevels[islandId]) completedLevels[islandId] = [];
      if (!completedLevels[islandId].includes(levelId)) {
        completedLevels[islandId] = [...completedLevels[islandId], levelId];
      }

      const levelStarKey = `${islandId}-${levelId}`;
      levelStars[levelStarKey] = Math.max(levelStars[levelStarKey] || 0, stars);

      const updatedQuests = prev.dailyQuests.map(quest => {
        if (quest.id === 'q1') {
          return { ...quest, current: Math.min(quest.target, quest.current + 1) };
        }
        if (quest.id === 'q2' && stars === 3) {
          return { ...quest, current: Math.min(quest.target, quest.current + 1) };
        }
        return quest;
      });

      const totalXp = prev.xp + earnedXp;
      const level = Math.floor(totalXp / 1000) + 1;
      const totalTrackedStars = Object.values(levelStars).reduce<number>((sum, value) => sum + Number(value || 0), 0);
      const stats = {
        totalStars: totalTrackedStars,
        totalGamesPlayed: (prev.stats?.totalGamesPlayed || 0) + 1,
        totalCoinsEarned: (prev.stats?.totalCoinsEarned || 0) + earnedCoins,
      };

      const achievements = [...(prev.achievements || [])];
      const totalCompletedLevels = Object.values(completedLevels).flat().length;
      const nextCoinTotal = prev.coins + earnedCoins;
      const unlockedIslands = prev.unlockedIslands.includes(nextIslandId) || !selectedLevel.isBoss
        ? prev.unlockedIslands
        : [...prev.unlockedIslands, nextIslandId].filter(id => id <= ISLANDS.length);

      ACHIEVEMENTS.forEach(achievement => {
        if (achievements.includes(achievement.id)) return;

        let unlocked = false;
        if (achievement.type === 'levels' && totalCompletedLevels >= achievement.target) unlocked = true;
        if (achievement.type === 'stars' && stats.totalStars >= achievement.target) unlocked = true;
        if (achievement.type === 'coins' && nextCoinTotal >= achievement.target) unlocked = true;
        if (achievement.type === 'streak' && prev.dailyStreak >= achievement.target) unlocked = true;

        if (unlocked) achievements.push(achievement.id);
      });

      achievementsUnlocked = achievements
        .filter(id => !prev.achievements.includes(id))
        .map(id => ACHIEVEMENTS.find(achievement => achievement.id === id)?.title || id);

      return {
        ...prev,
        coins: nextCoinTotal,
        xp: totalXp,
        level,
        completedLevels,
        levelStars,
        unlockedIslands,
        dailyQuests: updatedQuests,
        stats,
        achievements,
      };
    });

    setLevelResult({
      type: 'victory',
      title: stars === 3 ? 'Flawless clear' : stars === 2 ? 'Strong finish' : 'Level cleared',
      subtitle: stars === 3
        ? 'You nailed the target, banked the rewards, and pushed your run forward.'
        : 'Rewards are locked in. Keep the momentum going into the next challenge.',
      score,
      stars,
      coinsEarned: earnedCoins,
      xpEarned: earnedXp,
      islandUnlockedName,
      achievementsUnlocked,
    });
  };

  const handleGameOver = (score: number) => {
    triggerHaptic('error');
    setLevelResult({
      type: 'gameover',
      title: 'Round over',
      subtitle: 'No rewards lost forever. Reset, tighten the route, and take another shot.',
      score,
      stars: 0,
      coinsEarned: 0,
      xpEarned: 0,
      achievementsUnlocked: [],
    });
  };

  const handleCloseLevelResult = () => {
    setLevelResult(null);
    setSelectedLevel(null);
    setScreen('island_levels');
  };

  const handleRetryLevel = () => {
    setLevelResult(null);
    setScreen('gameplay');
  };

  const handleAdvanceAfterVictory = () => {
    if (!selectedIsland || !selectedLevel) {
      setLevelResult(null);
      setScreen('world_map');
      return;
    }

    const nextLevel = selectedIsland.levels.find(level => level.id === selectedLevel.id + 1);
    const completedInIsland = player.completedLevels[selectedIsland.id] || [];
    const isSequentialIsland = selectedIsland.id === 1;
    setLevelResult(null);

    if (nextLevel) {
      const canEnterNextLevel = nextLevel.isBoss
        ? selectedIsland.levels
            .filter(level => level.id < nextLevel.id)
            .every(level => completedInIsland.includes(level.id))
          && (player.stats?.totalCoinsEarned || 0) >= (nextLevel.bossUnlockCoins || 0)
        : isSequentialIsland
          ? selectedIsland.levels
              .filter(level => level.id < nextLevel.id)
              .every(level => completedInIsland.includes(level.id) || level.id === selectedLevel.id)
          : true;

      if (!canEnterNextLevel) {
        setSelectedLevel(null);
        setScreen('island_levels');
        return;
      }

      setSelectedLevel(nextLevel);
      setScreen('gameplay');
      return;
    }

    setSelectedLevel(null);
    setScreen('world_map');
  };

  const handleClaimDailyReward = (reward: { type: string; amount: number }) => {
    triggerHaptic('success');
    setPlayer(prev => ({
      ...prev,
      coins: reward.type === 'coins' ? prev.coins + reward.amount : prev.coins,
      gems: reward.type === 'gems' ? prev.gems + reward.amount : prev.gems,
      stats: {
        ...prev.stats,
        totalCoinsEarned: (prev.stats?.totalCoinsEarned || 0) + (reward.type === 'coins' ? reward.amount : 0),
      },
      claimedDailyRewardToday: true,
    }));
    setShowDailyRewards(false);
  };

  const handleClaimQuest = (questId: string) => {
    setPlayer(prev => {
      const quest = prev.dailyQuests.find(q => q.id === questId);
      if (!quest || quest.isClaimed || quest.current < quest.target) return prev;
      triggerHaptic('success');

      return {
        ...prev,
        coins: quest.reward.type === 'coins' ? prev.coins + quest.reward.amount : prev.coins,
        gems: quest.reward.type === 'gems' ? prev.gems + quest.reward.amount : prev.gems,
        xp: quest.reward.type === 'xp' ? prev.xp + quest.reward.amount : prev.xp,
        stats: {
          ...prev.stats,
          totalCoinsEarned: (prev.stats?.totalCoinsEarned || 0) + (quest.reward.type === 'coins' ? quest.reward.amount : 0),
        },
        dailyQuests: prev.dailyQuests.map(q =>
          q.id === questId ? { ...q, isClaimed: true } : q,
        ),
      };
    });
  };

  const renderGameplay = () => {
    if (!selectedLevel) return null;

    const renderFromRegistry = <P extends Record<string, unknown>>(key: MiniGameRegistryKey, props: P) => (
      getMiniGame(key).render(props)
    );

    const sharedProps = {
      levelId: selectedLevel.id,
      avatarId: player.avatarId,
      onVictory: handleGameVictory,
      onGameOver: handleGameOver,
      onBack: () => setScreen('island_levels' as GameScreen),
    };

    switch (selectedLevel.gameType) {
      case 'cloud_collapse':
        return renderFromRegistry('FractionMatchGame', { ...sharedProps, variantGameType: 'cloud_collapse', isBoss: Boolean(selectedLevel.isBoss) });
      case 'potion_pour':
        return renderFromRegistry('PotionPourGame', sharedProps);
      case 'take_out_rush':
        return renderFromRegistry('TakeOutRushGame', sharedProps);
      case 'fraction_match':
        return renderFromRegistry('FractionMatchGame', { ...sharedProps, isBoss: Boolean(selectedLevel.isBoss) });
      case 'prime_pop':
        return renderFromRegistry('PrimePopGame', sharedProps);
      case 'angle_arena':
        return renderFromRegistry('AngleArenaGame', sharedProps);
      case 'polygon_palace':
        return renderFromRegistry('PolygonPalaceGame', sharedProps);
      case 'data_dungeon':
        if (selectedLevel.blueprintKey === 'data_dash' || selectedLevel.blueprintKey === 'mode_miner') {
          return renderFromRegistry('ModeMinerGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'table_trouble') {
          return renderFromRegistry('LineGraphLabGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'data_detective') {
          return renderFromRegistry('DataDetectiveGame', sharedProps);
        }
        return renderFromRegistry('DataDungeonGame', sharedProps);
      case 'monster_market':
        return renderFromRegistry('MonsterMarketGame', sharedProps);
      case 'ratio_rapids':
        if (selectedLevel.blueprintKey === 'share_splitter') {
          return renderFromRegistry('ShareSplitterGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'maths_vs_zombies') {
          return renderFromRegistry('MathsVsZombiesGame', sharedProps);
        }
        return renderFromRegistry('RatioRapidsGame', { ...sharedProps, gameTitle: selectedLevel.displayName });
      case 'timekeeper_temple':
        return renderFromRegistry('TimekeeperTempleGame', sharedProps);
      case 'measurement_forge':
        if (selectedLevel.blueprintKey === 'perimeter_path') {
          return renderFromRegistry('PerimeterPathGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'volume_vault') {
          return renderFromRegistry('VolumeVaultGame', sharedProps);
        }
        return renderFromRegistry('MeasurementForgeGame', sharedProps);
      case 'tower_of_factors':
        if (selectedLevel.blueprintKey === 'factor_frenzy') {
          return renderFromRegistry('FactorFrenzyGame', sharedProps);
        }
        return renderFromRegistry('TowerOfFactorsGame', { ...sharedProps, isBoss: Boolean(selectedLevel.isBoss) });
      case 'place_value_peaks':
        if (selectedLevel.blueprintKey === 'place_value_panic') {
          return renderFromRegistry('PlaceValuePanicGame', {
            ...sharedProps,
            miniGameLevel: selectedLevel.miniGameLevel,
          });
        }
        if (selectedLevel.blueprintKey === 'rounding_rampage') {
          return renderFromRegistry('RoundingRocketGame', sharedProps);
        }
        return renderFromRegistry('DecimalSniperGame', { ...sharedProps, isBoss: Boolean(selectedLevel.isBoss) });
      case 'chart_chase':
        if (selectedLevel.blueprintKey === 'line_graph_lab') {
          return renderFromRegistry('LineGraphLabGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'chart_challenge' || selectedLevel.blueprintKey === 'median_mountain') {
          return renderFromRegistry('MedianMountainGame', sharedProps);
        }
        return renderFromRegistry('TreasureChartCoveGame', sharedProps);
      case 'equation_grove':
        if (selectedLevel.blueprintKey === 'order_ops_arena') {
          return renderFromRegistry('OrderOpsArenaGame', sharedProps);
        }
        return renderFromRegistry('RuneLockDungeonsGame', sharedProps);
      case 'coordinate_quest':
        return renderFromRegistry('CoordinateTranslationGame', sharedProps);
      case 'calculation_clash':
        if (selectedLevel.blueprintKey === 'division_dock') {
          return renderFromRegistry('DivisionDockGame', sharedProps);
        }
        return renderFromRegistry('CalculationCrashGame', sharedProps);
      case 'percent_pulse':
        return renderFromRegistry('CurriculumChallengeGame', {
          ...sharedProps,
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
        });
      case 'transform_temple':
        if (selectedLevel.blueprintKey === 'reflection_rescue') {
          return renderFromRegistry('RotationReflectionGame', sharedProps);
        }
        return renderFromRegistry('CurriculumChallengeGame', {
          ...sharedProps,
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
        });
      case 'scale_safari':
        if (selectedLevel.blueprintKey === 'scale_builder') {
          return renderFromRegistry('ScaleBuilderGame', sharedProps);
        }
      case 'mean_machine':
        if (selectedLevel.blueprintKey === 'mean_machine') {
          return renderFromRegistry('MeanMachineGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'median_mountain') {
          return renderFromRegistry('MedianMountainGame', sharedProps);
        }
      case 'rule_runner':
        if (selectedLevel.blueprintKey === 'median_mountain') {
          return renderFromRegistry('MedianMountainGame', sharedProps);
        }
        return renderFromRegistry('CurriculumChallengeGame', {
          ...sharedProps,
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
        });
      case 'sequence_sprint':
      case 'logic_sort':
      case 'shape_shift':
        if (selectedLevel.blueprintKey === 'rotation_relay') {
          return renderFromRegistry('RotationReflectionGame', sharedProps);
        }
      case 'matrix_match':
        return renderFromRegistry('ReasoningGame', {
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
          onVictory: handleGameVictory,
          onGameOver: handleGameOver,
          onBack: () => setScreen('island_levels'),
        });
      default:
        if (selectedLevel.isBoss && isBossEncounterGameType(selectedLevel.gameType)) {
          return renderFromRegistry('BossEncounterGame', {
            gameType: selectedLevel.gameType,
            levelId: selectedLevel.id,
            avatarId: player.avatarId,
            onVictory: handleGameVictory,
            onGameOver: handleGameOver,
            onBack: () => setScreen('island_levels'),
          });
        }
        return (
          <div className="flex flex-col items-center gap-6 p-10 bg-white/20 backdrop-blur-xl rounded-[3rem] border-4 border-white/30 my-auto text-center">
            <h2 className="text-4xl font-black text-white">Mini-game incoming</h2>
            <p className="text-white/80 max-w-xl text-lg">
              This slot is wired into the adventure flow, but the gameplay scene is still being built.
            </p>
            <button
              onClick={() => setScreen('island_levels')}
              className="ui-button-primary px-8 py-4 text-white font-black"
            >
              Back to island
            </button>
          </div>
        );
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return (
          <div className="relative h-full w-full overflow-hidden">
            <motion.img
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              src={splashPoster}
              alt="SATs Legends splash screen"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: '50% 46%' }}
              draggable={false}
            />

            <div className="absolute inset-0 flex items-end justify-center pb-[calc(max(4.5rem,7vh)-30px)] md:pb-[calc(max(5.5rem,8vh)-30px)]">
              <div className="flex flex-col items-center gap-2.5">
                <motion.button
                  initial={{ opacity: 0, y: -36, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  whileHover={{ scale: 1.025, y: -3 }}
                  whileTap={{ scale: 0.985, y: 1 }}
                  onClick={handleStartAdventure}
                  aria-label="Let's Go!"
                  className="ui-button-primary rounded-2xl px-10 py-3.5 text-lg md:px-12 md:py-4 md:text-xl"
                >
                  Let's Go!
                </motion.button>
              </div>

              {[
                { left: 'calc(50% - 7.5rem)', bottom: '5.4rem', delay: 0.45, size: 14 },
                { left: 'calc(50% - 5.6rem)', bottom: '7.1rem', delay: 0.9, size: 10 },
                { left: 'calc(50% + 5.8rem)', bottom: '7.4rem', delay: 0.6, size: 12 },
                { left: 'calc(50% + 7.8rem)', bottom: '5.8rem', delay: 1.15, size: 16 },
              ].map((sparkle, index) => (
                <motion.span
                  key={`splash-cta-sparkle-${index}`}
                  className="splash-cta-sparkle"
                  style={{
                    left: sparkle.left,
                    bottom: sparkle.bottom,
                    width: `${sparkle.size}px`,
                    height: `${sparkle.size}px`,
                  }}
                  initial={{ opacity: 0, scale: 0.4, y: 12 }}
                  animate={{
                    opacity: [0, 0.95, 0.5, 0],
                    scale: [0.4, 1, 0.82, 0.5],
                    y: [10, -8, -18, -26],
                    rotate: [0, 18, -14, 8],
                  }}
                  transition={{
                    duration: 2.4 + index * 0.25,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: sparkle.delay,
                    repeatDelay: 0.2 + index * 0.12,
                  }}
                />
              ))}
            </div>
          </div>
        );
      case 'profile_setup':
        return (
          <GameScreenShell className="aaa-name-screen my-auto flex items-center justify-center">
            <FramedPanel variant="paper" className="aaa-name-panel relative z-10 flex w-full max-w-sm flex-col gap-4 overflow-hidden p-4 text-center sm:max-w-md md:max-w-3xl md:gap-8 md:p-10">
              <PremiumHeaderBar
                eyebrow="Step 1 of 2"
                title="Name your hero"
                className="justify-center text-center"
              />

              <RewardPanel className="mx-auto w-full max-w-xl">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-900/65 md:text-sm">
                  Pick the name that appears across your adventure, rewards, and report screens.
                </p>
              </RewardPanel>

              <div className="relative z-10 flex flex-col items-center gap-3.5 md:gap-5">
                <input
                  value={draftName}
                  onChange={event => setDraftName(event.target.value.slice(0, 18))}
                  onKeyDown={event => {
                    if (event.key === 'Enter') handleSaveProfileName();
                  }}
                  placeholder="Explorer"
                  className="licensed-slice-paper-panel aaa-name-input w-full max-w-xl rounded-[1.25rem] px-5 py-3 text-center text-base font-black text-amber-950 shadow-[0_14px_28px_rgba(0,0,0,0.2)] outline-none placeholder:text-amber-900/35 focus:ring-4 focus:ring-yellow-300/45 md:rounded-[1.75rem] md:px-6 md:py-5 md:text-3xl"
                />
                <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                  <SecondaryActionButton onClick={() => setScreen('splash')} className="rounded-[1.25rem] px-6 py-3 text-sm md:rounded-2xl md:px-8 md:py-4 md:text-base">
                    Back
                  </SecondaryActionButton>
                  <PrimaryActionButton onClick={handleSaveProfileName} className="rounded-[1.25rem] px-8 py-3 text-base md:rounded-2xl md:px-10 md:py-4 md:text-lg">
                    Choose avatar
                  </PrimaryActionButton>
                </div>
              </div>
            </FramedPanel>
          </GameScreenShell>
        );

      case 'avatar_selection':
        return (
          <AvatarSelect
            selectedId={player.avatarId}
            onSelect={id => setPlayer(prev => ({ ...prev, avatarId: id }))}
            onConfirm={handleAvatarConfirm}
          />
        );

      case 'world_map':
        return <WorldMap player={player} onSelectIsland={handleIslandSelect} />;

      case 'island_levels':
        return selectedIsland ? (
          <IslandLevels
            island={selectedIsland}
            player={player}
            onBack={goToHome}
            onSelectLevel={handleLevelSelect}
          />
        ) : null;

      case 'gameplay':
        return (
          <div className={`game-shell-host ${gameplayTypeClass} ${usesQuestionMatchFrame ? 'question-match-shell' : ''} relative flex h-full w-full min-h-0 flex-col overflow-hidden`.trim()}>
            <div className="game-shell-contract relative flex h-full w-full min-h-0 flex-col overflow-hidden">
              <div className="structured-game-layout flex h-full w-full min-h-0 flex-1 flex-col">
                {isGameplayInstructionPending ? (
                  <div className="flex h-full w-full min-h-0 items-center justify-center p-3 md:p-6">
                    <div className="single-shell-briefing-card structured-playfield-frame flex w-full max-w-xl flex-col items-center gap-3 p-5 text-center md:gap-4 md:p-8">
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/70">Game Briefing</div>
                      <div className="text-lg font-black text-white md:text-2xl">
                        {selectedRuleSet?.title || selectedLevel?.displayName || 'How to play'}
                      </div>
                      <p className="max-w-md text-sm font-semibold leading-relaxed text-white/80 md:text-base">
                        Read the instructions, then tap Start Game to begin this round.
                      </p>
                    </div>
                  </div>
                ) : renderGameplay()}
              </div>
            </div>
          </div>
        );

      case 'parent_dashboard':
        return <ParentDashboard player={player} onBack={goToHome} />;

      case 'shop':
      case 'profile':
      case 'settings':
        return (
          <GameScreenShell className="my-auto flex items-center justify-center">
            <FramedPanel variant="surface" className="flex w-full max-w-md flex-col gap-4 p-4 text-center md:max-w-2xl md:gap-6 md:p-8">
              <PremiumHeaderBar eyebrow="Adventure menu" title={screen === 'shop' ? 'Shop' : screen === 'profile' ? 'Profile' : 'Settings'} className="justify-center text-center" />
              <RewardPanel className="mx-auto max-w-xl">
                <p className="text-sm font-black leading-relaxed text-amber-950 md:text-base">
                  This screen is parked for the next premium UI pass. The main adventure flow is live and fully playable.
                </p>
              </RewardPanel>
              <PrimaryActionButton onClick={goToHome} className="mx-auto rounded-[1.25rem] px-8 py-3 text-base md:rounded-2xl md:px-10 md:py-4 md:text-lg">
                Return to map
              </PrimaryActionButton>
            </FramedPanel>
          </GameScreenShell>
        );

      default:
        return (
          <GameScreenShell className="my-auto flex items-center justify-center">
            <FramedPanel variant="surface" className="flex w-full max-w-md flex-col gap-4 p-4 text-center md:max-w-2xl md:gap-6 md:p-8">
              <HUDBar eyebrow="Screen missing" title={`Screen ${screen}`} className="justify-center text-center" />
              <RewardPanel className="mx-auto max-w-xl">
                <p className="text-sm font-black text-amber-950 md:text-base">
                  This route is not wired into the live adventure flow yet.
                </p>
              </RewardPanel>
              <PrimaryActionButton onClick={goToHome} className="mx-auto rounded-[1.25rem] px-8 py-3 text-base md:rounded-2xl md:px-10 md:py-4 md:text-lg">
                Return to map
              </PrimaryActionButton>
            </FramedPanel>
          </GameScreenShell>
        );
    }
  };

  const screenBehavior = SCREEN_BEHAVIOR[screen];
  const showBottomNav = ['world_map', 'parent_dashboard', 'avatar_selection'].includes(screen);
  const isSplashScreen = screen === 'splash';
  const isMapLayoutScreen = MAP_LAYOUT_SCREENS.includes(screen);
  const isStandardShellScreen = !isMapLayoutScreen;
  const isWorldMapScreen = screen === 'world_map';
  const selectedGameType = selectedLevel?.gameType;
  const gameplayTypeClass = selectedGameType ? `game-type-${selectedGameType.replace(/_/g, '-')}` : '';
  const usesQuestionMatchFrame = Boolean(selectedGameType && QUESTION_MATCH_FRAME_GAMES.includes(selectedGameType));
  const bottomNavOffsetClass = showBottomNav
    ? isWorldMapScreen
      ? 'pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-[calc(2.4rem+env(safe-area-inset-bottom))]'
      : 'pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-[calc(7.25rem+env(safe-area-inset-bottom))]'
    : '';
  const stageStyle = {
    '--game-stage-width': `${IPHONE_STAGE_WIDTH}px`,
    '--game-stage-height': `${IPHONE_STAGE_HEIGHT}px`,
    '--game-stage-scale': `${stageScale}`,
  } as React.CSSProperties;

  return (
    <div className="iphone-game-viewport">
      <div className="iphone-game-stage" style={stageStyle}>
        <div className="iphone-game-stage-inner">
          <div className={`app-viewport app-shell-family-${screenBehavior.family} screen-${screen.replace(/_/g, '-')} relative w-full flex flex-col items-center overflow-hidden ${isMapLayoutScreen ? 'sat-shell-map licensed-playfield-bg bg-slate-950 pb-[env(safe-area-inset-bottom)]' : 'sat-shell-standard licensed-playfield-bg bg-slate-950 px-3 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:px-8 md:pt-[max(1rem,env(safe-area-inset-top))] md:pb-[max(1rem,env(safe-area-inset-bottom))]'}`}>
            {isStandardShellScreen && <div className="soft-vignette" />}
            {isStandardShellScreen && !isSplashScreen && screen !== 'gameplay' && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40 bg-gradient-to-b from-cyan-300/8 via-sky-300/4 to-transparent" />
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className={`app-screen-content relative z-10 flex min-h-0 w-full flex-1 justify-center pointer-events-auto ${screenBehavior.scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'} ${isMapLayoutScreen ? 'sat-screen-map-content' : 'sat-screen-standard-content items-stretch'} ${bottomNavOffsetClass}`}
                style={screenBehavior.scrollable ? { WebkitOverflowScrolling: 'touch' } : undefined}
              >
                {renderScreen()}
              </motion.div>
            </AnimatePresence>

            <DailyRewardsModal
              isOpen={showDailyRewards}
              onClose={() => setShowDailyRewards(false)}
              streak={player.dailyStreak}
              claimedToday={player.claimedDailyRewardToday}
              onClaim={handleClaimDailyReward}
            />

            <DailyQuestsModal
              isOpen={showQuests}
              onClose={() => setShowQuests(false)}
              quests={player.dailyQuests}
              onClaimQuest={handleClaimQuest}
            />

            <AchievementsModal
              isOpen={showAchievements}
              onClose={() => setShowAchievements(false)}
              player={player}
            />

            <LevelResultModal
              isOpen={Boolean(levelResult)}
              result={levelResult ? {
                ...levelResult,
                primaryLabel: levelResult.type === 'victory' ? 'Next level' : 'Level select',
                onPrimary: levelResult.type === 'victory' ? handleAdvanceAfterVictory : handleCloseLevelResult,
                secondaryLabel: levelResult.type === 'victory' ? 'Replay' : 'Try again',
                onSecondary: handleRetryLevel,
              } : null}
            />

            <GameRulesModal
              isOpen={showGameRules}
              onClose={closeGameRules}
              rules={selectedRuleSet}
              actionLabel={gameRulesMode === 'start' ? 'Start Game' : 'Back To Game'}
            />

            {
              isStandardShellScreen && !isSplashScreen && screen !== 'gameplay' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                  <div className="cloud w-64 h-24 top-20" style={{ animationDuration: '25s' }} />
                  <div className="cloud w-48 h-16 top-40" style={{ animationDuration: '40s', animationDelay: '-10s' }} />
                  <div className="cloud w-80 h-32 bottom-20" style={{ animationDuration: '30s', animationDelay: '-5s' }} />
                </div>
              )
            }

            {
              showBottomNav && (
                <div className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3 ${
                  isWorldMapScreen
                    ? 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))] md:bottom-[calc(1rem+env(safe-area-inset-bottom))]'
                    : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))] md:bottom-6'
                }`}>
                  <div className={`pointer-events-auto flex w-full max-w-3xl flex-col items-center ${
                    isWorldMapScreen ? 'gap-2 md:gap-1' : 'gap-2 md:gap-3'
                  }`}>
                    <div className={`casual-ribbon-chip hidden items-center gap-2 rounded-full px-3 py-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.22)] md:px-4 md:py-2 ${
                      isWorldMapScreen ? 'lg:inline-flex' : 'md:inline-flex'
                    }`}>
                      <AssetIcon name="star" className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.24em] md:text-[10px]">Adventure mode</span>
                    </div>
                    <nav className={`casual-nav-shell flex w-full items-center justify-between rounded-[2rem] px-2 py-2 ${
                      isWorldMapScreen
                        ? 'max-w-[28rem] md:max-w-[32rem] md:px-3 md:py-2.5'
                        : 'max-w-[28rem] md:max-w-3xl md:px-4 md:py-3'
                    }`}>
                      <motion.button
                        whileTap={{ scale: 0.96, y: 1 }}
                        onClick={goToHome}
                        className={`ui-icon-button hero-nav-button hero-nav-button-home flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 transition-all md:flex-none md:px-3 ${screen === 'world_map' ? 'hero-nav-button-active casual-nav-button-active scale-[1.02] shadow-lg' : 'hero-nav-button-idle'}`}
                      >
                        <AssetIcon name="home" className="hero-nav-icon h-5 w-5 md:h-6 md:w-6" />
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Map</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96, y: 1 }}
                        onClick={() => setScreen('avatar_selection')}
                        className={`ui-icon-button hero-nav-button hero-nav-button-hero flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 transition-all md:flex-none md:px-3 ${screen === 'avatar_selection' ? 'hero-nav-button-active casual-nav-button-active scale-[1.02] shadow-lg' : 'hero-nav-button-idle'}`}
                      >
                        <AssetIcon name="user" className="hero-nav-icon h-5 w-5 md:h-6 md:w-6" />
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Hero</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96, y: 1 }}
                        onClick={() => setShowQuests(true)}
                        className="ui-icon-button hero-nav-button hero-nav-button-idle hero-nav-button-quests relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 transition-all md:flex-none md:px-3"
                      >
                        <AssetIcon name="doc" className="hero-nav-icon h-5 w-5 md:h-6 md:w-6" />
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Quests</span>
                        {(player.dailyQuests || []).some(q => q.current >= q.target && !q.isClaimed) && (
                          <span className="absolute right-2 top-1 h-3 w-3 rounded-full border-2 border-white bg-red-500 animate-pulse" />
                        )}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96, y: 1 }}
                        onClick={() => setShowAchievements(true)}
                        className="ui-icon-button hero-nav-button hero-nav-button-idle hero-nav-button-wins relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 transition-all md:flex-none md:px-3"
                      >
                        <AssetIcon name="medal" className="hero-nav-icon h-5 w-5 md:h-6 md:w-6" />
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Wins</span>
                        {(player.achievements?.length || 0) > 0 && (
                          <span className="absolute right-2 top-1 h-3 w-3 rounded-full border-2 border-white bg-yellow-400" />
                        )}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96, y: 1 }}
                        onClick={() => setScreen('parent_dashboard')}
                        className={`ui-icon-button hero-nav-button hero-nav-button-stats flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 transition-all md:flex-none md:px-3 ${screen === 'parent_dashboard' ? 'hero-nav-button-active casual-nav-button-active scale-[1.02] shadow-lg' : 'hero-nav-button-idle'}`}
                      >
                        <AssetIcon name="gear" className="hero-nav-icon h-5 w-5 md:h-6 md:w-6" />
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Stats</span>
                      </motion.button>
                    </nav>
                  </div>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
