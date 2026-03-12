import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AssetIcon from './components/AssetIcon';
import { ACHIEVEMENTS, INITIAL_DAILY_QUESTS, ISLANDS } from './constants';
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
import AvatarSelect from './components/AvatarSelect';
import DailyRewardsModal from './components/modals/DailyRewardsModal';
import DailyQuestsModal from './components/modals/DailyQuestsModal';
import AchievementsModal from './components/modals/AchievementsModal';
import ParentDashboard from './components/ParentDashboard';
import LevelResultModal from './components/LevelResultModal';
import forestBg from './assets/licensed/background.jpeg';
import paperPanel from './assets/licensed/Atlas_07_Paper.png';

const PLAYER_STORAGE_KEY = 'maths_quest_player';

const createDefaultPlayer = (parsed?: Partial<PlayerData> | null): PlayerData => ({
  playerName: parsed?.playerName || '',
  avatarId: parsed?.avatarId || 'green_slime',
  level: parsed?.level || 1,
  xp: parsed?.xp || 0,
  coins: parsed?.coins || 100,
  gems: parsed?.gems || 10,
  unlockedIslands: parsed?.unlockedIslands || [1],
  completedLevels: parsed?.completedLevels || {},
  levelStars: parsed?.levelStars || {},
  lastLoginDate: parsed?.lastLoginDate,
  dailyStreak: parsed?.dailyStreak || 1,
  claimedDailyRewardToday: parsed?.claimedDailyRewardToday || false,
  dailyQuests: parsed?.dailyQuests || INITIAL_DAILY_QUESTS,
  achievements: parsed?.achievements || [],
  customSpriteUrl: parsed?.customSpriteUrl,
  stats: parsed?.stats || {
    totalStars: 0,
    totalGamesPlayed: 0,
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

  const goToHome = () => {
    setSelectedLevel(null);
    setScreen('world_map');
  };

  const handleStartAdventure = () => {
    if (!player.playerName.trim()) {
      setDraftName('Explorer');
      setScreen('profile_setup');
      return;
    }

    setScreen('avatar_selection');
  };

  const handleSaveProfileName = () => {
    const sanitizedName = draftName.trim() || 'Explorer';
    setPlayer(prev => ({ ...prev, playerName: sanitizedName }));
    setScreen('avatar_selection');
  };

  const handleAvatarConfirm = () => {
    setScreen('world_map');
  };

  const handleIslandSelect = (island: IslandData) => {
    setSelectedIsland(island);
    setSelectedLevel(null);
    setScreen('island_levels');
  };

  const handleLevelSelect = (level: LevelData) => {
    setSelectedLevel(level);
    setScreen('gameplay');
  };

  const handleGameVictory = (stars: number, score: number) => {
    if (!selectedIsland || !selectedLevel) return;

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
    setLevelResult(null);

    if (nextLevel && !nextLevel.isLocked) {
      setSelectedLevel(nextLevel);
      setScreen('gameplay');
      return;
    }

    setSelectedLevel(null);
    setScreen('world_map');
  };

  const handleClaimDailyReward = (reward: { type: string; amount: number }) => {
    setPlayer(prev => ({
      ...prev,
      coins: reward.type === 'coins' ? prev.coins + reward.amount : prev.coins,
      gems: reward.type === 'gems' ? prev.gems + reward.amount : prev.gems,
      claimedDailyRewardToday: true,
    }));
    setShowDailyRewards(false);
  };

  const handleClaimQuest = (questId: string) => {
    setPlayer(prev => {
      const quest = prev.dailyQuests.find(q => q.id === questId);
      if (!quest || quest.isClaimed || quest.current < quest.target) return prev;

      return {
        ...prev,
        coins: quest.reward.type === 'coins' ? prev.coins + quest.reward.amount : prev.coins,
        gems: quest.reward.type === 'gems' ? prev.gems + quest.reward.amount : prev.gems,
        xp: quest.reward.type === 'xp' ? prev.xp + quest.reward.amount : prev.xp,
        dailyQuests: prev.dailyQuests.map(q =>
          q.id === questId ? { ...q, isClaimed: true } : q,
        ),
      };
    });
  };

  const renderGameplay = () => {
    if (!selectedLevel) return null;

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
      case 'burger_bar':
        return <BurgerBuilderGame {...sharedProps} />;
      case 'fraction_match':
        return <FractionMatchGame {...sharedProps} />;
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
        return <TowerOfFactorsGame {...sharedProps} />;
      case 'sequence_sprint':
      case 'logic_sort':
      case 'shape_shift':
      case 'matrix_match':
        return (
          <ReasoningGame
            gameType={selectedLevel.gameType}
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
          <div className="relative my-auto flex w-full max-w-6xl flex-col items-center gap-10 px-6 text-center md:gap-14">
            <div className="absolute inset-0 -z-20 rounded-[3rem] bg-cover bg-center opacity-50 pointer-events-none" style={{ backgroundImage: `url(${forestBg})` }} />
            <div className="absolute inset-0 -z-10 rounded-[3rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.35),rgba(15,23,42,0.72))] pointer-events-none" />
            <div className="absolute inset-x-0 top-1/2 -z-10 h-[520px] -translate-y-1/2 rounded-[3rem] border border-white/20 bg-white/10 blur-0 backdrop-blur-2xl pointer-events-none" />
            <div className="absolute -z-10 w-[150%] h-[150%] flex items-center justify-center opacity-20 pointer-events-none">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-[800px] h-[800px] border-[40px] border-dashed border-white rounded-full pointer-events-none"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute w-[600px] h-[600px] border-[20px] border-dotted border-white rounded-full pointer-events-none"
              />
            </div>

            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            >
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-4">
                {['➕', '➖', '✖️', '➗'].map((emoji, i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -16, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    className="text-4xl"
                  >
                    {emoji}
                  </motion.span>
                ))}
              </div>
              <div className="mb-5 flex justify-center gap-2">
                {['Mobile-first', 'Quest map', 'Mini-games'].map(label => (
                  <span key={label} className="game-chip">{label}</span>
                ))}
              </div>
              <h1 className="text-[3.5rem] sm:text-6xl md:text-8xl lg:text-[9rem] leading-[0.85] font-black text-white tracking-tighter drop-shadow-[0_8px_0_rgba(0,0,0,0.24)]">
                SATS
                <br />
                <span className="text-yellow-400 drop-shadow-[0_8px_0_#ca8a04] text-[3rem] sm:text-[4.5rem] md:text-7xl lg:text-[8rem]">MASTERY</span>
              </h1>
              <p className="mt-4 md:mt-5 inline-block rounded-full bg-black/15 backdrop-blur-sm px-4 py-1.5 md:px-6 md:py-2 text-xs md:text-xl font-bold tracking-[0.25em] uppercase text-white/95">
                World map adventure build
              </p>
            </motion.div>

            <div className="flex flex-col items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartAdventure}
                className="game-button-primary licensed-wood-button group relative px-8 py-4 text-xl sm:px-12 sm:py-5 sm:text-2xl md:px-20 md:py-8 md:text-5xl rounded-[2rem] md:rounded-[2.3rem]"
              >
                {hasCompletedProfile ? 'CONTINUE' : 'START ADVENTURE'}
              </motion.button>
              <p className="max-w-xl text-white/80 font-bold text-sm md:text-base px-4">
                {hasCompletedProfile ? `Welcome back, ${player.playerName}.` : 'Create your hero and jump into the islands.'}
              </p>
            </div>
          </div>
        );

      case 'profile_setup':
        return (
          <div className="glass-panel relative z-10 w-full max-w-sm sm:max-w-md md:max-w-3xl my-auto overflow-hidden rounded-[3rem] p-6 text-center md:p-12">
            <div className="relative z-10 mb-8">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">Name your hero</h2>
              <p className="mt-3 text-white/75 font-bold uppercase tracking-[0.2em] text-xs md:text-sm">
                Step 1 of 2 · profile setup
              </p>
            </div>

            <div className="relative z-10 flex flex-col gap-5 items-center">
              <input
                value={draftName}
                onChange={event => setDraftName(event.target.value.slice(0, 18))}
                onKeyDown={event => {
                  if (event.key === 'Enter') handleSaveProfileName();
                }}
                placeholder="Explorer"
                className="w-full max-w-xl rounded-[1.75rem] border-2 border-white/20 bg-black/20 px-6 py-5 text-center text-2xl md:text-3xl font-black text-white placeholder:text-white/35 outline-none focus:border-yellow-300"
              />
              <div className="flex gap-4 flex-wrap justify-center">
                <button
                  onClick={() => setScreen('splash')}
                  className="game-button-secondary licensed-wood-button-secondary px-8 py-4 rounded-2xl"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveProfileName}
                  className="licensed-wood-button px-10 py-4 rounded-2xl text-white font-black transition-all"
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
  const isWideScreenScene = ['world_map', 'island_levels', 'gameplay', 'parent_dashboard'].includes(screen);
  const showCompactShell = !isWideScreenScene;

  return (
    <div className={`relative h-[100dvh] w-full flex flex-col items-center overflow-hidden ${isWideScreenScene ? 'licensed-playfield-bg bg-slate-950' : 'licensed-shell-bg p-3 md:p-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'}`}>
      <div className="soft-vignette" />
      {showCompactShell && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40 bg-gradient-to-b from-white/18 to-transparent" />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          className={`w-full flex-1 flex justify-center relative z-10 overflow-hidden pointer-events-auto ${isWideScreenScene ? '' : 'mx-auto max-w-7xl'}`}
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

      {!isWideScreenScene && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="cloud w-64 h-24 top-20" style={{ animationDuration: '25s' }} />
          <div className="cloud w-48 h-16 top-40" style={{ animationDuration: '40s', animationDelay: '-10s' }} />
          <div className="cloud w-80 h-32 bottom-20" style={{ animationDuration: '30s', animationDelay: '-5s' }} />
        </div>
      )}

      {showBottomNav && (
        <nav className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-[2rem] border border-white/20 bg-slate-950/55 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px)*0.5)] shadow-[0_20px_45px_rgba(0,0,0,0.3)] backdrop-blur-2xl md:bottom-6 md:w-auto md:gap-8 md:px-5 md:py-4 md:pb-4">
          <button
            onClick={goToHome}
            className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all ${screen === 'world_map' ? 'bg-white text-sky-600 scale-105 shadow-lg' : 'text-white/85 hover:bg-white/10'}`}
          >
            <AssetIcon name="home" className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em]">Map</span>
          </button>
          <button
            onClick={() => setScreen('avatar_selection')}
            className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all ${screen === 'avatar_selection' ? 'bg-white text-sky-600 scale-105 shadow-lg' : 'text-white/85 hover:bg-white/10'}`}
          >
            <AssetIcon name="user" className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em]">Hero</span>
          </button>
          <button
            onClick={() => setShowQuests(true)}
            className="relative flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-white/85 transition-all hover:bg-white/10"
          >
            <AssetIcon name="doc" className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em]">Quests</span>
            {(player.dailyQuests || []).some(q => q.current >= q.target && !q.isClaimed) && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setShowAchievements(true)}
            className="relative flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-white/85 transition-all hover:bg-white/10"
          >
            <AssetIcon name="medal" className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em]">Wins</span>
            {(player.achievements?.length || 0) > 0 && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
            )}
          </button>
          <button
            onClick={() => setScreen('parent_dashboard')}
            className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all ${screen === 'parent_dashboard' ? 'bg-white text-sky-600 scale-105 shadow-lg' : 'text-white/85 hover:bg-white/10'}`}
          >
            <AssetIcon name="gear" className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em]">Stats</span>
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-cyan-100 md:flex">
            <AssetIcon name="star" className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.24em]">Adventure mode</span>
          </div>
        </nav>
      )}
    </div>
  );
};

export default App;
