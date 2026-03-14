import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from './components/AssetIcon';
import { ACHIEVEMENTS, AVATARS, INITIAL_DAILY_QUESTS, ISLANDS } from './constants';
import { DEFAULT_AVATAR_ID } from './assets/characters';
import { GameScreen, IslandData, LevelData, PlayerData } from './types';
import WorldMap from './components/WorldMap';
import IslandLevels from './components/IslandLevels';
import CloudCollapseGame from './components/CloudCollapseGame';
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
        return <CloudCollapseGame {...sharedProps} />;
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
      case 'calculation_clash':
      case 'percent_pulse':
      case 'coordinate_quest':
      case 'transform_temple':
      case 'scale_safari':
      case 'chart_chase':
      case 'mean_machine':
      case 'equation_grove':
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
              className="px-8 py-4 bg-white/20 text-white font-black rounded-2xl border-b-4 border-white/30"
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

            <div className="absolute inset-0 flex items-end justify-center pb-[max(4.5rem,7vh)] md:pb-[max(5.5rem,8vh)]">
              <motion.button
                whileHover={{ scale: 1.025, y: -3 }}
                whileTap={{ scale: 0.985, y: 1 }}
                onClick={handleStartAdventure}
                aria-label={hasCompletedProfile ? 'Continue adventure' : 'Start adventure'}
                className="splash-continue-button"
              >
                <span className="splash-continue-button-face">
                  <span className="splash-continue-button-flare" />
                  <span className="splash-continue-button-label">
                    {hasCompletedProfile ? 'Continue' : "Let's Go"}
                  </span>
                </span>
              </motion.button>
            </div>
          </div>
        );
      case 'profile_setup':
        return (
          <div className="casual-panel-strong relative z-10 my-auto flex w-full max-w-sm max-h-full flex-col justify-center overflow-hidden rounded-[2rem] p-4 text-center sm:max-w-md md:max-w-3xl md:rounded-[3rem] md:p-12">
            <div className="relative z-10 mb-5 md:mb-8">
              <h2 className="text-[1.7rem] font-black tracking-tight text-white md:text-6xl">Name your hero</h2>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/75 md:text-sm">
                Step 1 of 2 - profile setup
              </p>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-3.5 md:gap-5">
              <input
                value={draftName}
                onChange={event => setDraftName(event.target.value.slice(0, 18))}
                onKeyDown={event => {
                  if (event.key === 'Enter') handleSaveProfileName();
                }}
                placeholder="Explorer"
                className="w-full max-w-xl rounded-[1.25rem] border border-white/10 bg-slate-950/36 px-5 py-3 text-center text-base font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none placeholder:text-white/35 focus:border-yellow-300 md:rounded-[1.75rem] md:px-6 md:py-5 md:text-3xl"
              />
              <div className="flex gap-3 flex-wrap justify-center md:gap-4">
                <button
                  onClick={() => setScreen('splash')}
                  className="game-button-secondary licensed-wood-button-secondary px-6 py-3 rounded-[1.25rem] text-sm md:px-8 md:py-4 md:rounded-2xl md:text-base"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveProfileName}
                  className="licensed-wood-button px-8 py-3 rounded-[1.25rem] text-white text-base md:text-lg font-black transition-all md:px-10 md:py-4 md:rounded-2xl"
                >
                  Choose avatar
                </button>
              </div>
            </div>
          </div>
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
        return renderGameplay();

      case 'parent_dashboard':
        return <ParentDashboard player={player} onBack={goToHome} />;

      default:
        return <div className="text-white">Screen {screen} not implemented</div>;
    }
  };

  const showBottomNav = ['world_map', 'avatar_selection', 'parent_dashboard'].includes(screen);
  const isSplashScreen = screen === 'splash';
  const isWideScreenScene = ['world_map', 'island_levels', 'gameplay', 'parent_dashboard'].includes(screen);
  const showCompactShell = !isWideScreenScene && !isSplashScreen;
  const bottomNavOffsetClass = showBottomNav
    ? 'pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-[calc(7.25rem+env(safe-area-inset-bottom))]'
    : '';

  return (
    <div className={`app-viewport relative w-full flex flex-col items-center overflow-hidden ${isSplashScreen ? '' : isWideScreenScene ? 'licensed-playfield-bg bg-slate-950 pb-[env(safe-area-inset-bottom)]' : 'licensed-shell-bg p-3 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:p-8'}`}>
      {!isSplashScreen && <div className="soft-vignette" />}
      {showCompactShell && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40 bg-gradient-to-b from-cyan-300/8 via-sky-300/4 to-transparent" />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          className={`relative z-10 flex min-h-0 w-full flex-1 justify-center overflow-hidden pointer-events-auto ${isSplashScreen ? '' : isWideScreenScene ? '' : 'mx-auto max-w-7xl items-stretch'} ${bottomNavOffsetClass}`}
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

      {
        !isWideScreenScene && !isSplashScreen && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="cloud w-64 h-24 top-20" style={{ animationDuration: '25s' }} />
            <div className="cloud w-48 h-16 top-40" style={{ animationDuration: '40s', animationDelay: '-10s' }} />
            <div className="cloud w-80 h-32 bottom-20" style={{ animationDuration: '30s', animationDelay: '-5s' }} />
          </div>
        )
      }

      {
        showBottomNav && (
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 md:bottom-6">
            <div className="pointer-events-auto flex w-full max-w-3xl flex-col items-center gap-2 md:gap-3">
              <div className="casual-ribbon-chip hidden items-center gap-2 rounded-full px-3 py-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.22)] md:inline-flex md:px-4 md:py-2">
                <AssetIcon name="star" className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase tracking-[0.24em] md:text-[10px]">Adventure mode</span>
              </div>
              <nav className="casual-nav-shell flex w-full max-w-[28rem] items-center justify-between rounded-[2rem] px-2 py-2 md:max-w-3xl md:px-4 md:py-3">
                <button
                  onClick={goToHome}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 transition-all md:flex-none md:px-3 ${screen === 'world_map' ? 'casual-nav-button-active scale-[1.02] shadow-lg' : 'text-white/85 hover:bg-white/10'}`}
                >
                  <AssetIcon name="home" className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Map</span>
                </button>
                <button
                  onClick={() => setScreen('avatar_selection')}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 transition-all md:flex-none md:px-3 ${screen === 'avatar_selection' ? 'casual-nav-button-active scale-[1.02] shadow-lg' : 'text-white/85 hover:bg-white/10'}`}
                >
                  <AssetIcon name="user" className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Hero</span>
                </button>
                <button
                  onClick={() => setShowQuests(true)}
                  className="relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 text-white/85 transition-all hover:bg-white/10 md:flex-none md:px-3"
                >
                  <AssetIcon name="doc" className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Quests</span>
                  {(player.dailyQuests || []).some(q => q.current >= q.target && !q.isClaimed) && (
                    <span className="absolute right-2 top-1 h-3 w-3 rounded-full border-2 border-white bg-red-500 animate-pulse" />
                  )}
                </button>
                <button
                  onClick={() => setShowAchievements(true)}
                  className="relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 text-white/85 transition-all hover:bg-white/10 md:flex-none md:px-3"
                >
                  <AssetIcon name="medal" className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Wins</span>
                  {(player.achievements?.length || 0) > 0 && (
                    <span className="absolute right-2 top-1 h-3 w-3 rounded-full border-2 border-white bg-yellow-400" />
                  )}
                </button>
                <button
                  onClick={() => setScreen('parent_dashboard')}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-2 transition-all md:flex-none md:px-3 ${screen === 'parent_dashboard' ? 'casual-nav-button-active scale-[1.02] shadow-lg' : 'text-white/85 hover:bg-white/10'}`}
                >
                  <AssetIcon name="gear" className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em]">Stats</span>
                </button>
              </nav>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default App;




