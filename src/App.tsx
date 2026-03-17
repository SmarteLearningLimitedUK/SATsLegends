import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from './components/AssetIcon';
import { ACHIEVEMENTS, AVATARS, INITIAL_DAILY_QUESTS, ISLANDS } from './constants';
import { DEFAULT_AVATAR_ID } from './assets/characters';
import { GameScreen, IslandData, LevelData, MiniGameType, PlayerData } from './types';
import WorldMap from './components/WorldMap';
import IslandLevels from './components/IslandLevels';
import PotionPourGame from './components/PotionPourGame';
import BurgerBuilderGame from './components/BurgerBuilderGame';
import FractionMatchGame from './components/FractionMatchGame';
import PrimePopGame from './components/PrimePopGame';
import AngleArenaGame from './components/AngleArenaGame';
import PolygonPalaceGame from './components/PolygonPalaceGame';
import DataDungeonGame from './components/DataDungeonGame';
import MonsterMarketGame from './components/MonsterMarketGame';
import RatioRapidsGame from './components/RatioRapidsGame';
import TimekeeperTempleGame from './components/TimekeeperTempleGame';
import MeasurementForgeGame from './components/MeasurementForgeGame';
import TowerOfFactorsGame from './components/TowerOfFactorsGame';
import DecimalSniperGame from './components/DecimalSniperGame';
import TreasureChartCoveGame from './components/TreasureChartCoveGame';
import RuneLockDungeonsGame from './components/RuneLockDungeonsGame';
import TreasurePathGame from './components/TreasurePathGame';
import ReasoningGame from './components/reasoning/ReasoningGame';
import CurriculumChallengeGame from './components/CurriculumChallengeGame';
import BossEncounterGame, { isBossEncounterGameType } from './components/BossEncounterGame';
import AvatarSelect from './components/AvatarSelect';
import DailyRewardsModal from './components/modals/DailyRewardsModal';
import DailyQuestsModal from './components/modals/DailyQuestsModal';
import AchievementsModal from './components/modals/AchievementsModal';
import ParentDashboard from './components/ParentDashboard';
import LevelResultModal from './components/LevelResultModal';
import GameRulesModal from './components/GameRulesModal';
import { GameScreenShell, HUDBar, RewardPanel } from './components/layout/ScreenPrimitives';
import { GAME_META } from './gameMeta';
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
  'burger_builder',
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

type StageOutputId =
  | 'splash'
  | 'name'
  | 'avatar'
  | 'map'
  | 'island'
  | 'gameplay'
  | 'boss'
  | 'report';

const STAGED_OUTPUT_STEPS: Array<{ id: StageOutputId; label: string; detail: string }> = [
  { id: 'splash', label: 'Splash', detail: 'Opening poster and CTA' },
  { id: 'name', label: 'Hero Name', detail: 'Profile naming screen' },
  { id: 'avatar', label: 'Avatar', detail: 'Character selection' },
  { id: 'map', label: 'World Map', detail: 'Island progression map' },
  { id: 'island', label: 'Island Route', detail: 'Island level nodes' },
  { id: 'gameplay', label: 'Gameplay', detail: 'Regular mini-game view' },
  { id: 'boss', label: 'Boss', detail: 'Boss encounter phase' },
  { id: 'report', label: 'Report', detail: 'Parent dashboard output' },
];

const resolveAvatarId = (avatarId?: string) => (
  AVATARS.some(avatar => avatar.id === avatarId) ? avatarId! : DEFAULT_AVATAR_ID
);

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
  const [screen, setScreen] = useState<GameScreen>('splash');
  const [isStagedPreviewOpen, setIsStagedPreviewOpen] = useState(false);
  const [activeStageId, setActiveStageId] = useState<StageOutputId>('splash');
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
      if (screen === 'gameplay' && selectedLevel?.gameType && GAME_META[selectedLevel.gameType]) {
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
  }, [screen, selectedLevel?.gameType]);

  const goToHome = () => {
    setSelectedLevel(null);
    setScreen('world_map');
  };

  const goToStage = (stageId: StageOutputId) => {
    const firstIsland = ISLANDS[0] || null;
    const firstPlayableLevel = firstIsland?.levels.find(level => !level.isBoss) || firstIsland?.levels[0] || null;
    const firstBossLevel = firstIsland?.levels.find(level => level.isBoss) || firstPlayableLevel;

    setActiveStageId(stageId);
    setLevelResult(null);

    switch (stageId) {
      case 'splash':
        setSelectedIsland(null);
        setSelectedLevel(null);
        setScreen('splash');
        return;
      case 'name':
        setDraftName(player.playerName || 'Explorer');
        setSelectedLevel(null);
        setScreen('profile_setup');
        return;
      case 'avatar':
        setSelectedLevel(null);
        setScreen('avatar_selection');
        return;
      case 'map':
        setSelectedLevel(null);
        setScreen('world_map');
        return;
      case 'island':
        if (!firstIsland) return;
        setSelectedIsland(firstIsland);
        setSelectedLevel(null);
        setScreen('island_levels');
        return;
      case 'gameplay':
        if (!firstIsland || !firstPlayableLevel) return;
        setSelectedIsland(firstIsland);
        setSelectedLevel(firstPlayableLevel);
        setScreen('gameplay');
        return;
      case 'boss':
        if (!firstIsland || !firstBossLevel) return;
        setSelectedIsland(firstIsland);
        setSelectedLevel(firstBossLevel);
        setScreen('gameplay');
        return;
      case 'report':
        setSelectedLevel(null);
        setScreen('parent_dashboard');
        return;
      default:
        return;
    }
  };

  const openStagePreview = (stageId: StageOutputId = 'splash') => {
    triggerHaptic('selection');
    setIsStagedPreviewOpen(true);
    goToStage(stageId);
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
    const islandUnlockedName = selectedLevel.isBoss && nextIslandId <= 6
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
        : [...prev.unlockedIslands, nextIslandId].filter(id => id <= 6);

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
    setLevelResult(null);

    if (nextLevel && !nextLevel.isLocked) {
      const canEnterNextLevel = nextLevel.isBoss
        ? selectedIsland.levels
            .filter(level => level.id < nextLevel.id)
            .every(level => completedInIsland.includes(level.id))
          && (player.stats?.totalCoinsEarned || 0) >= (nextLevel.bossUnlockCoins || 0)
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

    if (selectedLevel.isBoss && isBossEncounterGameType(selectedLevel.gameType)) {
      return (
        <BossEncounterGame
          gameType={selectedLevel.gameType}
          levelId={selectedLevel.id}
          avatarId={player.avatarId}
          onVictory={handleGameVictory}
          onGameOver={handleGameOver}
          onBack={() => setScreen('island_levels')}
        />
      );
    }

    const sharedProps = {
      levelId: selectedLevel.id,
      avatarId: player.avatarId,
      onVictory: handleGameVictory,
      onGameOver: handleGameOver,
      onBack: () => setScreen('island_levels' as GameScreen),
    };

    switch (selectedLevel.gameType) {
      case 'cloud_collapse':
        return <FractionMatchGame {...sharedProps} variantGameType="cloud_collapse" isBoss={Boolean(selectedLevel.isBoss)} />;
      case 'potion_pour':
        return <PotionPourGame {...sharedProps} />;
      case 'burger_builder':
        return <BurgerBuilderGame {...sharedProps} />;
      case 'fraction_match':
        return <FractionMatchGame {...sharedProps} isBoss={Boolean(selectedLevel.isBoss)} />;
      case 'prime_pop':
        return <PrimePopGame {...sharedProps} />;
      case 'angle_arena':
        return <AngleArenaGame {...sharedProps} />;
      case 'polygon_palace':
        return <PolygonPalaceGame {...sharedProps} />;
      case 'data_dungeon':
        return <DataDungeonGame {...sharedProps} />;
      case 'monster_market':
        return <MonsterMarketGame {...sharedProps} />;
      case 'ratio_rapids':
        return <RatioRapidsGame {...sharedProps} />;
      case 'timekeeper_temple':
        return <TimekeeperTempleGame {...sharedProps} />;
      case 'measurement_forge':
        return <MeasurementForgeGame {...sharedProps} />;
      case 'tower_of_factors':
        return <TowerOfFactorsGame {...sharedProps} isBoss={Boolean(selectedLevel.isBoss)} />;
      case 'place_value_peaks':
        return <DecimalSniperGame {...sharedProps} isBoss={Boolean(selectedLevel.isBoss)} />;
      case 'chart_chase':
        return <TreasureChartCoveGame {...sharedProps} />;
      case 'equation_grove':
        return <RuneLockDungeonsGame {...sharedProps} />;
      case 'coordinate_quest':
        return <TreasurePathGame {...sharedProps} />;
      case 'calculation_clash':
      case 'percent_pulse':
      case 'transform_temple':
      case 'scale_safari':
      case 'mean_machine':
      case 'rule_runner':
        return <CurriculumChallengeGame gameType={selectedLevel.gameType} isBoss={Boolean(selectedLevel.isBoss)} {...sharedProps} />;
      case 'sequence_sprint':
      case 'logic_sort':
      case 'shape_shift':
      case 'matrix_match':
        return (
          <ReasoningGame
            gameType={selectedLevel.gameType}
            isBoss={Boolean(selectedLevel.isBoss)}
            onVictory={handleGameVictory}
            onGameOver={handleGameOver}
            onBack={() => setScreen('island_levels')}
          />
        );
      default:
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
              alt="Sats Hero splash screen"
              className="absolute inset-0 h-full w-full object-cover"
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
                <button
                  onClick={() => openStagePreview('splash')}
                  className="ui-button-primary rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] md:text-xs"
                >
                  Staged Output
                </button>
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
          <GameScreenShell className="my-auto flex items-center justify-center">
            <div className="licensed-board-frame relative z-10 flex w-full max-w-sm flex-col gap-4 overflow-hidden p-4 text-center sm:max-w-md md:max-w-3xl md:gap-8 md:p-10">
              <HUDBar
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
                  className="licensed-slice-paper-panel w-full max-w-xl rounded-[1.25rem] px-5 py-3 text-center text-base font-black text-amber-950 shadow-[0_14px_28px_rgba(0,0,0,0.2)] outline-none placeholder:text-amber-900/35 focus:ring-4 focus:ring-yellow-300/45 md:rounded-[1.75rem] md:px-6 md:py-5 md:text-3xl"
                />
                <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                  <button
                    onClick={() => setScreen('splash')}
                    className="ui-button-primary rounded-[1.25rem] px-6 py-3 text-sm md:rounded-2xl md:px-8 md:py-4 md:text-base"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSaveProfileName}
                    className="ui-button-primary rounded-[1.25rem] px-8 py-3 text-base font-black text-white transition-all md:rounded-2xl md:px-10 md:py-4 md:text-lg"
                  >
                    Choose avatar
                  </button>
                </div>
              </div>
            </div>
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
              {renderGameplay()}
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
            <div className="licensed-board-frame flex w-full max-w-md flex-col gap-4 p-4 text-center md:max-w-2xl md:gap-6 md:p-8">
              <HUDBar eyebrow="Adventure menu" title={screen === 'shop' ? 'Shop' : screen === 'profile' ? 'Profile' : 'Settings'} className="justify-center text-center" />
              <RewardPanel className="mx-auto max-w-xl">
                <p className="text-sm font-black leading-relaxed text-amber-950 md:text-base">
                  This screen is parked for the next premium UI pass. The main adventure flow is live and fully playable.
                </p>
              </RewardPanel>
              <button
                onClick={goToHome}
                className="ui-button-primary mx-auto rounded-[1.25rem] px-8 py-3 text-base font-black text-white md:rounded-2xl md:px-10 md:py-4 md:text-lg"
              >
                Return to map
              </button>
            </div>
          </GameScreenShell>
        );

      default:
        return (
          <GameScreenShell className="my-auto flex items-center justify-center">
            <div className="licensed-board-frame flex w-full max-w-md flex-col gap-4 p-4 text-center md:max-w-2xl md:gap-6 md:p-8">
              <HUDBar eyebrow="Screen missing" title={`Screen ${screen}`} className="justify-center text-center" />
              <RewardPanel className="mx-auto max-w-xl">
                <p className="text-sm font-black text-amber-950 md:text-base">
                  This route is not wired into the live adventure flow yet.
                </p>
              </RewardPanel>
              <button
                onClick={goToHome}
                className="ui-button-primary mx-auto rounded-[1.25rem] px-8 py-3 text-base font-black text-white md:rounded-2xl md:px-10 md:py-4 md:text-lg"
              >
                Return to map
              </button>
            </div>
          </GameScreenShell>
        );
    }
  };

  const screenBehavior = SCREEN_BEHAVIOR[screen];
  const showBottomNav = ['world_map', 'avatar_selection', 'parent_dashboard'].includes(screen);
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

  return (
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
          className={`app-screen-content relative z-10 flex min-h-0 w-full flex-1 justify-center pointer-events-auto ${screenBehavior.scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'} ${isMapLayoutScreen ? 'sat-screen-map-content' : 'sat-screen-standard-content mx-auto max-w-7xl items-stretch'} ${bottomNavOffsetClass}`}
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
          primaryLabel: levelResult.type === 'victory' ? 'Continue' : 'Level select',
          onPrimary: levelResult.type === 'victory' ? handleAdvanceAfterVictory : handleCloseLevelResult,
          secondaryLabel: levelResult.type === 'victory' ? 'Map' : 'Try again',
          onSecondary: levelResult.type === 'victory' ? goToHome : handleRetryLevel,
        } : null}
      />

      <GameRulesModal
        isOpen={showGameRules}
        onClose={() => setShowGameRules(false)}
        rules={
          selectedLevel?.gameType
            ? GAME_META[selectedLevel.gameType]?.rules || null
            : null
        }
      />

      {!isStagedPreviewOpen && (
        <button
          onClick={() => openStagePreview(screen === 'splash' ? 'splash' : 'map')}
          className="ui-button-primary fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] md:right-4 md:px-5 md:text-[11px]"
        >
          Stage View
        </button>
      )}

      {isStagedPreviewOpen && (
        <div className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.25rem] border border-cyan-200/30 bg-slate-950/84 p-3 text-white shadow-[0_20px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl md:right-4 md:w-80">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/65 md:text-[10px]">Review flow</div>
              <div className="text-sm font-black md:text-base">Staged Output Panel</div>
            </div>
            <button
              onClick={() => setIsStagedPreviewOpen(false)}
              className="ui-button-primary rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
            >
              Close
            </button>
          </div>
          <div className="grid gap-1.5">
            {STAGED_OUTPUT_STEPS.map(step => (
              <button
                key={step.id}
                onClick={() => goToStage(step.id)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  activeStageId === step.id
                    ? 'ui-button-primary border-amber-200/72'
                    : 'ui-button-primary border-white/25 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="text-[11px] font-black uppercase tracking-[0.15em]">{step.label}</div>
                <div className="mt-0.5 text-[11px] text-white/72">{step.detail}</div>
              </button>
            ))}
          </div>
        </div>
      )}

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
    </div >
  );
};

export default App;




