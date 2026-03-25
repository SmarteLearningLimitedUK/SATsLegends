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
import UnifiedMiniGameHud from './components/UnifiedMiniGameHud';
import GameActionDock from './components/GameActionDock';
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
import splashPoster from './assets/casual_ui/splashrep1.png';
import splashStartPill from './assets/casual_ui/inputs/btn_1.png';

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
const GLOBAL_MINIGAME_HUD_DURATION_SECONDS = 90;
const GLOBAL_MINIGAME_LIVES = 3;

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
      if (level.blueprintKey === 'fraction_flow') {
        return 'FractionFlowGame';
      }
    case 'fraction_match':
      if (level.blueprintKey === 'simplify_sprint') {
        return 'SimplifySprintGame';
      }
      return 'FractionMatchGame';
    case 'potion_pour':
      return 'PotionPourGame';
    case 'take_out_rush':
      if (level.blueprintKey === 'fraction_forge') {
        return 'FractionForgeGame';
      }
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
      if (level.blueprintKey === 'number_line_ninja') {
        return 'NumberLineNinjaGame';
      }
      return 'CoordinateTranslationGame';
    case 'calculation_clash':
      if (level.blueprintKey === 'arithmetic_gauntlet') {
        return 'ArithmeticGauntletGame';
      }
      if (level.blueprintKey === 'multiplication_mine') {
        return 'MultiplicationMineGame';
      }
      if (level.blueprintKey === 'remainder_run') {
        return 'RemainderRunGame';
      }
      return level.blueprintKey === 'division_dock' ? 'DivisionDockGame' : 'CalculationCrashGame';
    case 'percent_pulse':
      return 'CurriculumChallengeGame';
    case 'transform_temple':
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
  const [globalMiniGameHudTimeLeft, setGlobalMiniGameHudTimeLeft] = useState(GLOBAL_MINIGAME_HUD_DURATION_SECONDS);
  const [globalMiniGameLives, setGlobalMiniGameLives] = useState(GLOBAL_MINIGAME_LIVES);
  const [globalMiniGameLifeLock, setGlobalMiniGameLifeLock] = useState(false);

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
  const hintRuleSet = useMemo(
    () => (
      selectedRuleSet
      || (selectedLevel
        ? {
            title: selectedLevel.displayName || 'How To Play',
            summary: 'Solve each challenge as accurately and quickly as you can.',
            bullets: [
              'Read the mission text first, then choose or place your answer.',
              'Use the bottom bar for back, sound, and hint support.',
              'Keep an eye on the timer and complete the objective before it ends.',
            ],
          }
        : null)
    ),
    [selectedRuleSet, selectedLevel],
  );

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) return undefined;
    setGlobalMiniGameHudTimeLeft(GLOBAL_MINIGAME_HUD_DURATION_SECONDS);
    setGlobalMiniGameLives(GLOBAL_MINIGAME_LIVES);
    setGlobalMiniGameLifeLock(false);
    const timerId = window.setInterval(() => {
      setGlobalMiniGameHudTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [screen, selectedLevel?.id]);

  useEffect(() => {
    if (screen !== 'gameplay' || globalMiniGameLives > 0 || globalMiniGameLifeLock) return;
    setGlobalMiniGameLifeLock(true);
    window.setTimeout(() => {
      handleGameOver(0);
    }, 160);
  }, [globalMiniGameLifeLock, globalMiniGameLives, screen]);

  const closeGameRules = () => {
    setShowGameRules(false);
    setGameRulesMode('help');
  };

  useEffect(() => {
    const updateStageScale = () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const scale = Math.min(
        viewportWidth / IPHONE_STAGE_WIDTH,
        viewportHeight / IPHONE_STAGE_HEIGHT,
      );
      setStageScale(Number.isFinite(scale) && scale > 0 ? scale : 1);
    };

    const visualViewport = window.visualViewport;
    updateStageScale();
    window.addEventListener('resize', updateStageScale);
    window.addEventListener('orientationchange', updateStageScale);
    visualViewport?.addEventListener('resize', updateStageScale);
    visualViewport?.addEventListener('scroll', updateStageScale);

    return () => {
      window.removeEventListener('resize', updateStageScale);
      window.removeEventListener('orientationchange', updateStageScale);
      visualViewport?.removeEventListener('resize', updateStageScale);
      visualViewport?.removeEventListener('scroll', updateStageScale);
    };
  }, []);

  useEffect(() => {
    // Keep strict non-scroll touch handling for gameplay screens,
    // but allow vertical panning on the world map.
    document.body.style.touchAction = screen === 'world_map' ? 'pan-y' : 'none';
    document.body.style.overscrollBehaviorY = screen === 'world_map' ? 'contain' : 'none';
  }, [screen]);

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
      if (screen === 'gameplay' && hintRuleSet) {
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
  }, [screen, hintRuleSet]);

  useEffect(() => {
    const lastPenaltyRef = { value: 0 };

    const handleHapticIntent = (event: Event) => {
      if (screen !== 'gameplay') return;
      if (isGameplayInstructionPending) return;

      const detail = (event as CustomEvent<{ intent?: string }>).detail;
      const intent = detail?.intent;
      if (intent !== 'error' && intent !== 'warning') return;

      const now = Date.now();
      if (now - lastPenaltyRef.value < 450) return;
      lastPenaltyRef.value = now;

      setGlobalMiniGameLives((previous) => Math.max(0, previous - 1));
    };

    window.addEventListener('sats-mastery:haptic', handleHapticIntent as EventListener);
    return () => {
      window.removeEventListener('sats-mastery:haptic', handleHapticIntent as EventListener);
    };
  }, [isGameplayInstructionPending, screen]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) {
      setIsGameplayInstructionPending(false);
      return;
    }

    setIsGameplayInstructionPending(true);
    setShowGameRules(false);
    setGameRulesMode('help');
  }, [screen, selectedLevel?.id]);

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

    const completedInIsland = player.completedLevels[selectedIsland.id] || [];
    const isSequentialIsland = selectedIsland.id === 1;
    const isLevelConsideredComplete = (levelId: number) => (
      completedInIsland.includes(levelId) || levelId === selectedLevel.id
    );

    const isPlaceValuePanic = selectedLevel.blueprintKey === 'place_value_panic';

    // Prefer advancing inside the same mini-game lane when metadata is present.
    const laneNextLevel = selectedLevel.miniGameKey && selectedLevel.miniGameLevel
      ? selectedIsland.levels.find((level) => (
        level.miniGameKey === selectedLevel.miniGameKey
        && level.miniGameLevel === selectedLevel.miniGameLevel! + 1
      ))
      : undefined;
    // Explicit guard: Place Value Panic should always advance to its own next level.
    const placeValueNextLevel = isPlaceValuePanic
      ? selectedIsland.levels
          .filter((level) => level.blueprintKey === 'place_value_panic')
          .sort((a, b) => ((a.miniGameLevel || a.id) - (b.miniGameLevel || b.id)))
          .find((level) => (
            (level.miniGameLevel || level.id)
            > (selectedLevel.miniGameLevel || selectedLevel.id)
          ))
      : undefined;
    const sequentialNextLevel = selectedIsland.levels.find(level => level.id === selectedLevel.id + 1);
    const nextLevel = placeValueNextLevel || laneNextLevel || sequentialNextLevel;
    setLevelResult(null);

    if (nextLevel) {
      const canEnterNextLevel = nextLevel.isBoss
        ? selectedIsland.levels
            .filter(level => level.id < nextLevel.id)
            .every(level => isLevelConsideredComplete(level.id))
          && (player.stats?.totalCoinsEarned || 0) >= (nextLevel.bossUnlockCoins || 0)
        : isSequentialIsland
          ? nextLevel.miniGameKey && nextLevel.miniGameLevel
            ? selectedIsland.levels
                .filter((level) => (
                  level.miniGameKey === nextLevel.miniGameKey
                  && (level.miniGameLevel || 0) < (nextLevel.miniGameLevel || 0)
                ))
                .every(level => isLevelConsideredComplete(level.id))
            : selectedIsland.levels
                .filter(level => level.id < nextLevel.id)
                .every(level => isLevelConsideredComplete(level.id))
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
      useSharedTopHud: true,
      onVictory: handleGameVictory,
      onGameOver: handleGameOver,
      onBack: () => setScreen('island_levels' as GameScreen),
    };

    switch (selectedLevel.gameType) {
      case 'cloud_collapse':
        if (selectedLevel.blueprintKey === 'fraction_flow') {
          return renderFromRegistry('FractionFlowGame', sharedProps);
        }
        return renderFromRegistry('FractionMatchGame', { ...sharedProps, variantGameType: 'cloud_collapse', isBoss: Boolean(selectedLevel.isBoss) });
      case 'potion_pour':
        return renderFromRegistry('PotionPourGame', sharedProps);
      case 'take_out_rush':
        if (selectedLevel.blueprintKey === 'fraction_forge') {
          return renderFromRegistry('FractionForgeGame', sharedProps);
        }
        return renderFromRegistry('TakeOutRushGame', sharedProps);
      case 'fraction_match':
        if (selectedLevel.blueprintKey === 'simplify_sprint') {
          return renderFromRegistry('SimplifySprintGame', sharedProps);
        }
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
          const inferredMiniGameLevel = (
            selectedLevel.miniGameLevel
            || selectedIsland?.levels
              .filter((level) => level.blueprintKey === 'place_value_panic')
              .sort((a, b) => a.id - b.id)
              .findIndex((level) => level.id === selectedLevel.id) + 1
            || 1
          );
          return renderFromRegistry('PlaceValuePanicGame', {
            ...sharedProps,
            miniGameLevel: inferredMiniGameLevel,
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
        if (selectedLevel.blueprintKey === 'number_line_ninja') {
          return renderFromRegistry('NumberLineNinjaGame', sharedProps);
        }
        return renderFromRegistry('CoordinateTranslationGame', sharedProps);
      case 'calculation_clash':
        if (selectedLevel.blueprintKey === 'arithmetic_gauntlet') {
          return renderFromRegistry('ArithmeticGauntletGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'multiplication_mine') {
          return renderFromRegistry('MultiplicationMineGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'remainder_run') {
          return renderFromRegistry('RemainderRunGame', sharedProps);
        }
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
              style={{ objectPosition: '50% 0%' }}
              draggable={false}
            />

            <div className="absolute bottom-[7.5%] left-1/2 h-14 w-56 -translate-x-1/2 sm:h-16 sm:w-64">
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-teal-300/80 blur-[2px]"
                animate={{
                  opacity: [0.42, 0.92, 0.42],
                  scale: [0.995, 1.015, 0.995]
                }}
                transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
              />

              <motion.button
                type="button"
                onClick={handleStartAdventure}
                aria-label="Start"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.35, ease: 'easeOut' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative h-full w-full rounded-full border-0 bg-transparent p-0 shadow-[0_8px_22px_rgba(0,0,0,0.35)]"
              >
                <img
                  src={splashStartPill}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute inset-0 h-full w-full rounded-full object-fill"
                />
                <span className="relative z-10 text-lg font-black uppercase tracking-[0.12em] text-amber-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] sm:text-xl">
                  Start
                </span>
              </motion.button>
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
          <div className={`game-shell-host unified-minigame-hud-enabled ${gameplayTypeClass} ${usesQuestionMatchFrame ? 'question-match-shell' : ''} relative flex h-full w-full min-h-0 flex-col overflow-hidden`.trim()}>
            <div className="game-shell-contract relative flex h-full w-full min-h-0 flex-col overflow-hidden">
              <div className="structured-game-layout flex h-full w-full min-h-0 flex-1 flex-col">
                {isGameplayInstructionPending ? (
                  <div className="flex h-full w-full min-h-0 items-center justify-center p-3 md:p-6">
                    <div className="single-shell-briefing-card structured-playfield-frame relative flex w-full max-w-xl flex-col items-center gap-3 overflow-hidden rounded-[2rem] border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(18,48,112,0.88),rgba(10,29,74,0.92))] p-5 text-center shadow-[0_20px_50px_rgba(2,6,23,0.5)] md:gap-4 md:p-8">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.22),transparent_38%)]" />
                      <div className="relative flex w-full items-center justify-center gap-2">
                        <div className="inline-flex items-center rounded-full border border-slate-100/25 bg-slate-900/60 px-4 py-1 text-sm font-black uppercase tracking-[0.08em] text-slate-100">
                          Streak 0
                        </div>
                        <div className="inline-flex items-center rounded-full border border-slate-100/25 bg-slate-900/60 px-4 py-1 text-sm font-black uppercase tracking-[0.08em] text-slate-100">
                          Mistakes {Math.max(0, GLOBAL_MINIGAME_LIVES - globalMiniGameLives)}/{GLOBAL_MINIGAME_LIVES}
                        </div>
                      </div>
                      <div className="relative mt-1 h-16 w-16 rounded-full border border-amber-200/60 bg-[linear-gradient(180deg,rgba(251,191,36,0.28),rgba(245,158,11,0.18))] shadow-[0_0_24px_rgba(251,191,36,0.32)]" />
                      <div className="relative text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/80">Mission Brief</div>
                      <div className="relative text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
                        {selectedLevel?.displayName || selectedRuleSet?.title || 'Mini Game'}
                      </div>
                      <p className="relative max-w-md text-base font-semibold leading-relaxed text-cyan-50/90 md:text-lg">
                        {hintRuleSet?.summary || 'Read the objective, then start the mission and solve as many challenges as you can before time runs out.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setIsGameplayInstructionPending(false);
                        }}
                        className="relative mt-2 inline-flex h-14 min-w-[15rem] items-center justify-center rounded-full border border-amber-100/80 bg-[linear-gradient(180deg,#fde047_0%,#f59e0b_100%)] px-8 text-lg font-black uppercase tracking-[0.12em] text-amber-950 shadow-[0_12px_24px_rgba(217,119,6,0.42)] transition hover:brightness-105 active:translate-y-[1px]"
                      >
                        Start Mission
                      </button>
                    </div>
                  </div>
                ) : renderGameplay()}
                <UnifiedMiniGameHud
                  playerName={player.playerName || 'Learner'}
                  avatarId={player.avatarId}
                  timeLeft={globalMiniGameHudTimeLeft}
                  totalTime={GLOBAL_MINIGAME_HUD_DURATION_SECONDS}
                  hideTimer={Boolean(activeMiniGameKey === 'CalculationCrashGame')}
                  lives={globalMiniGameLives}
                />
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
  const showGlobalDock = true;
  const isSplashScreen = screen === 'splash';
  const isAvatarSelectionScreen = screen === 'avatar_selection';
  const isGameplayScreen = screen === 'gameplay';
  const isMapLayoutScreen = MAP_LAYOUT_SCREENS.includes(screen);
  const isStandardShellScreen = !isMapLayoutScreen;
  const isWorldMapScreen = screen === 'world_map';
  const selectedGameType = selectedLevel?.gameType;
  const activeMiniGameKey = selectedLevel ? resolveMiniGameRegistryKey(selectedLevel) : null;
  const gameplayTypeClass = selectedGameType ? `game-type-${selectedGameType.replace(/_/g, '-')}` : '';
  const usesQuestionMatchFrame = Boolean(selectedGameType && QUESTION_MATCH_FRAME_GAMES.includes(selectedGameType));
  // Keep only pure cinematic/map screens unbounded.
  // All gameplay runs inside the constrained stage for consistent accessibility.
  const useUnboundedStageShell = isSplashScreen || isAvatarSelectionScreen || isWorldMapScreen;
  const globalDockOffsetClass = showGlobalDock && !isGameplayScreen
    ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-[calc(5.2rem+env(safe-area-inset-bottom))]'
    : '';
  const viewportShellClass = isGameplayScreen
    ? 'sat-shell-standard bg-transparent'
    : isWorldMapScreen
    ? 'sat-shell-map licensed-playfield-bg bg-transparent pb-[env(safe-area-inset-bottom)]'
    : useUnboundedStageShell
      ? 'sat-shell-standard licensed-playfield-bg bg-transparent'
      : isMapLayoutScreen
      ? 'sat-shell-map licensed-playfield-bg bg-transparent pb-[env(safe-area-inset-bottom)]'
      : 'sat-shell-standard licensed-playfield-bg bg-transparent px-3 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:px-8 md:pt-[max(1rem,env(safe-area-inset-top))] md:pb-[max(1rem,env(safe-area-inset-bottom))]';
  const contentShellClass = isGameplayScreen
    ? 'sat-screen-full-bleed items-stretch'
    : useUnboundedStageShell
    ? 'sat-screen-full-bleed items-stretch'
    : isWorldMapScreen
      ? 'sat-screen-full-bleed items-stretch'
      : isMapLayoutScreen
      ? 'sat-screen-map-content'
      : 'sat-screen-standard-content items-stretch';
  const useFlatScreenScaleTransition = isAvatarSelectionScreen;
  const screenEnterScale = useFlatScreenScaleTransition ? 1 : 0.98;
  const screenExitScale = useFlatScreenScaleTransition ? 1 : 1.02;
  const stageStyle = {
    '--game-stage-width': `${IPHONE_STAGE_WIDTH}px`,
    '--game-stage-height': `${IPHONE_STAGE_HEIGHT}px`,
    '--game-stage-scale': `${stageScale}`,
  } as React.CSSProperties;

  return (
    <div className="iphone-game-viewport">
      <div className={`iphone-game-stage${useUnboundedStageShell ? ' iphone-game-stage-unbounded' : ''}`} style={useUnboundedStageShell ? undefined : stageStyle}>
        <div className="iphone-game-stage-inner">
          <div className={`app-viewport app-shell-family-${screenBehavior.family} screen-${screen.replace(/_/g, '-')} ${isGameplayScreen ? gameplayTypeClass : ''} relative w-full flex flex-col items-center overflow-hidden ${viewportShellClass}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, scale: screenEnterScale }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: screenExitScale }}
                className={`app-screen-content relative z-10 flex min-h-0 w-full flex-1 justify-center pointer-events-auto ${screenBehavior.scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'} ${contentShellClass} ${globalDockOffsetClass}`}
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
              rules={hintRuleSet}
              actionLabel={gameRulesMode === 'start' ? 'Start Game' : 'Back To Game'}
            />

            {
              showGlobalDock && (
                <div className="global-app-dock pointer-events-none fixed inset-x-0 bottom-[calc(0.65rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3">
                  <div className="pointer-events-auto">
                    <GameActionDock
                      onBack={() => {
                        if (screen === 'gameplay') {
                          setScreen('island_levels');
                          return;
                        }
                        if (screen === 'avatar_selection') {
                          setScreen('profile_setup');
                          return;
                        }
                        if (screen === 'profile_setup') {
                          setScreen('splash');
                          return;
                        }
                        if (screen === 'shop' || screen === 'profile' || screen === 'settings' || screen === 'parent_dashboard') {
                          goToHome();
                          return;
                        }
                        if (screen === 'splash') {
                          setScreen('splash');
                          return;
                        }
                        goToHome();
                      }}
                      compact
                      accentClass="text-slate-100"
                      variant="global"
                    />
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
