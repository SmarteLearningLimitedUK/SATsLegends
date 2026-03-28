import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GAME_META } from './gameMeta';
import {
  GAME_HUD_HELP_EVENT,
} from './gameHudEvents';
import { triggerHaptic } from './haptics';
import { getBlueprintRuleSet } from './systems/content/islandBlueprint';
import {
  ISLANDS,
} from './constants';
import DailyRewardsModal from './components/modals/DailyRewardsModal';
import DailyQuestsModal from './components/modals/DailyQuestsModal';
import AchievementsModal from './components/modals/AchievementsModal';
import LevelResultModal from './components/LevelResultModal';
import GameRulesModal from './components/GameRulesModal';
import GameActionDock from './components/GameActionDock';
import ViewportBossEnemy from './components/ViewportBossEnemy';
import { IslandData, LevelData } from './types';
import { AppRouter } from './app/AppRouter';
import { useScreenFlow } from './app/useScreenFlow';
import { useOverlayState } from './app/useOverlayState';
import { usePlayerProgression } from './app/usePlayerProgression';
import {
  GLOBAL_MINIGAME_HUD_DURATION_SECONDS,
  useGameplaySession,
} from './app/useGameplaySession';
import { GameplaySessionEventHandlers, GameplaySessionState } from './app/gameplaySessionContract';
import { useMiniGameLifecycle } from './app/useMiniGameLifecycle';
import { getBossVisualForLevel } from './bossVisuals';
import {
  IPHONE_STAGE_HEIGHT,
  IPHONE_STAGE_WIDTH,
  MAP_LAYOUT_SCREENS,
  QUESTION_MATCH_FRAME_GAMES,
  SCREEN_BEHAVIOR,
} from './app/screenConfig';

const App: React.FC = () => {
  const [stageScale, setStageScale] = useState(1);

  const {
    screen,
    selectedIsland,
    selectedLevel,
    setScreen,
    setSelectedLevel,
    goToHome,
    goToProfileSetup,
    goToAvatarSelection,
    goToWorldMap,
    goToIslandLevels,
    goToGameplay,
    handleIslandSelect: selectIslandInFlow,
    handleLevelSelect: selectLevelInFlow,
    handleGlobalDockBack,
  } = useScreenFlow();

  const {
    player,
    setPlayer,
    draftName,
    setDraftName,
    hasCompletedProfile,
    dailyRewardsNudge,
    saveProfileName,
    claimDailyReward,
    claimQuest,
    applyGameVictory,
  } = usePlayerProgression();

  const {
    showDailyRewards,
    showQuests,
    showAchievements,
    showGameRules,
    gameRulesMode,
    levelResult,
    setShowDailyRewards,
    setShowQuests,
    setShowAchievements,
    setShowGameRules,
    setGameRulesMode,
    setLevelResult,
    closeGameRules,
  } = useOverlayState();

  const handleGameOver = useCallback((score: number) => {
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
  }, [setLevelResult]);

  const {
    globalMiniGameHudTimeLeft,
    globalMiniGameLives,
    consumeLife,
  } = useGameplaySession({
    screen,
    selectedLevel,
    onLifeDepleted: () => handleGameOver(0),
    onTimeDepleted: () => handleGameOver(0),
  });

  useMiniGameLifecycle({ screen, selectedLevel });

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
    if (dailyRewardsNudge > 0) {
      setShowDailyRewards(true);
    }
  }, [dailyRewardsNudge, setShowDailyRewards]);

  useEffect(() => {
    if (screen === 'profile_setup') {
      setDraftName(player.playerName || '');
    }
  }, [player.playerName, screen, setDraftName]);

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
    document.body.style.touchAction = screen === 'world_map' ? 'pan-y' : 'none';
    document.body.style.overscrollBehaviorY = screen === 'world_map' ? 'contain' : 'none';
  }, [screen]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) return;
    setShowGameRules(false);
    setGameRulesMode('help');
  }, [screen, selectedLevel?.id, setGameRulesMode, setShowGameRules]);

  useEffect(() => {
    const handleOpenHelp = () => {
      if (screen === 'gameplay' && hintRuleSet) {
        setGameRulesMode('help');
        setShowGameRules(true);
      }
    };

    window.addEventListener(GAME_HUD_HELP_EVENT, handleOpenHelp as EventListener);
    return () => {
      window.removeEventListener(GAME_HUD_HELP_EVENT, handleOpenHelp as EventListener);
    };
  }, [hintRuleSet, screen, setGameRulesMode, setShowGameRules]);

  const handleStartAdventure = () => {
    triggerHaptic('tap');
    if (!player.playerName.trim()) {
      setDraftName('Explorer');
      goToProfileSetup();
      return;
    }

    goToAvatarSelection();
  };

  const handleSaveProfileName = () => {
    triggerHaptic('selection');
    saveProfileName();
    goToAvatarSelection();
  };

  const handleAvatarConfirm = () => {
    triggerHaptic('success');
    goToWorldMap();
  };

  const handleIslandSelect = (island: IslandData) => {
    triggerHaptic('selection');
    selectIslandInFlow(island);
  };

  const handleLevelSelect = (level: LevelData) => {
    triggerHaptic('selection');
    selectLevelInFlow(level);
  };

  const handleGameVictory = (stars: number, score: number) => {
    triggerHaptic('success');
    const result = applyGameVictory(selectedIsland, selectedLevel, stars, score);
    if (result) setLevelResult(result);
  };

  const handleCloseLevelResult = () => {
    setLevelResult(null);
    setSelectedLevel(null);
    goToIslandLevels();
  };

  const handleRetryLevel = () => {
    setLevelResult(null);
    goToGameplay();
  };

  const handleAdvanceAfterVictory = () => {
    if (!selectedIsland || !selectedLevel) {
      setLevelResult(null);
      goToHome();
      return;
    }

    const completedInIsland = player.completedLevels[selectedIsland.id] || [];
    const isSequentialIsland = selectedIsland.id === 1;
    const isLevelConsideredComplete = (levelId: number) => (
      completedInIsland.includes(levelId) || levelId === selectedLevel.id
    );

    const isPlaceValuePanic = selectedLevel.blueprintKey === 'place_value_panic';

    const laneNextLevel = selectedLevel.miniGameKey && selectedLevel.miniGameLevel
      ? selectedIsland.levels.find((level) => (
        level.miniGameKey === selectedLevel.miniGameKey
        && level.miniGameLevel === selectedLevel.miniGameLevel! + 1
      ))
      : undefined;

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
        goToIslandLevels();
        return;
      }

      setSelectedLevel(nextLevel);
      goToGameplay();
      return;
    }

    setSelectedLevel(null);
    goToHome();
  };

  const handleClaimDailyReward = (reward: { type: string; amount: number }) => {
    triggerHaptic('success');
    claimDailyReward(reward);
    setShowDailyRewards(false);
  };

  const handleClaimQuest = (questId: string) => {
    const quest = player.dailyQuests.find(q => q.id === questId);
    if (!quest || quest.isClaimed || quest.current < quest.target) return;
    triggerHaptic('success');
    claimQuest(questId);
  };

  const sessionState: GameplaySessionState = useMemo(() => ({
    timeLeft: globalMiniGameHudTimeLeft,
    totalTime: GLOBAL_MINIGAME_HUD_DURATION_SECONDS,
    lives: globalMiniGameLives,
  }), [globalMiniGameHudTimeLeft, globalMiniGameLives]);

  const sessionEvents: GameplaySessionEventHandlers = useMemo(() => ({
    onCorrectAnswer: () => {
      triggerHaptic('selection');
    },
    onIncorrectAnswer: () => {
      triggerHaptic('error');
      if (screen === 'gameplay') {
        consumeLife(1);
      }
    },
    onPuzzleComplete: () => {
      triggerHaptic('selection');
    },
    onGameComplete: () => {
      triggerHaptic('success');
    },
    onGameFailed: () => {
      triggerHaptic('error');
    },
  }), [consumeLife, screen]);

  const screenBehavior = SCREEN_BEHAVIOR[screen];
  const backgroundIntensityClass = screenBehavior.family === 'hub'
    ? 'bg-intensity-hub'
    : screenBehavior.family === 'game'
      ? 'bg-intensity-game'
      : 'bg-intensity-overlay';
  const showGlobalDock = screen !== 'splash';
  const isSplashScreen = screen === 'splash';
  const isAvatarSelectionScreen = screen === 'avatar_selection';
  const isGameplayScreen = screen === 'gameplay';
  const isMapLayoutScreen = MAP_LAYOUT_SCREENS.includes(screen);
  const isWorldMapScreen = screen === 'world_map';
  const selectedGameType = selectedLevel?.gameType;
  const activeBossArt = useMemo(
    () => getBossVisualForLevel(selectedLevel?.gameType, selectedLevel?.id),
    [selectedLevel?.gameType, selectedLevel?.id],
  );
  const gameplayTypeClass = selectedGameType ? `game-type-${selectedGameType.replace(/_/g, '-')}` : '';
  const usesQuestionMatchFrame = Boolean(selectedGameType && QUESTION_MATCH_FRAME_GAMES.includes(selectedGameType));
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
          <div
            data-screen-family={screenBehavior.family}
            className={`app-viewport sat-theme-bluegold app-background-intensity ${backgroundIntensityClass} app-shell-family-${screenBehavior.family} screen-${screen.replace(/_/g, '-')} ${isGameplayScreen ? gameplayTypeClass : ''} relative w-full flex flex-col items-center overflow-hidden ${viewportShellClass}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, scale: screenEnterScale }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: screenExitScale }}
                className={`app-screen-content relative z-10 flex min-h-0 w-full flex-1 justify-center pointer-events-auto ${screenBehavior.scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'} ${contentShellClass} ${globalDockOffsetClass}`}
                style={screenBehavior.scrollable ? { WebkitOverflowScrolling: 'touch' } : undefined}
              >
                <AppRouter
                  screen={screen}
                  player={player}
                  draftName={draftName}
                  setDraftName={setDraftName}
                  selectedIsland={selectedIsland}
                  selectedLevel={selectedLevel}
                  selectedRuleSet={selectedRuleSet}
                  hintRuleSet={hintRuleSet}
                  gameplayTypeClass={gameplayTypeClass}
                  usesQuestionMatchFrame={usesQuestionMatchFrame}
                  globalMiniGameHudTimeLeft={globalMiniGameHudTimeLeft}
                  globalMiniGameLives={globalMiniGameLives}
                  globalMiniGameHudDurationSeconds={GLOBAL_MINIGAME_HUD_DURATION_SECONDS}
                  sessionState={sessionState}
                  sessionEvents={sessionEvents}
                  onStartAdventure={handleStartAdventure}
                  onSaveProfileName={handleSaveProfileName}
                  onAvatarSelect={(id) => setPlayer(prev => ({ ...prev, avatarId: id }))}
                  onAvatarConfirm={handleAvatarConfirm}
                  onGoHome={goToHome}
                  onBackToSplash={() => setScreen('splash')}
                  onSelectIsland={handleIslandSelect}
                  onSelectLevel={handleLevelSelect}
                  onBackToIslandLevels={goToIslandLevels}
                  onGameplayVictory={handleGameVictory}
                  onGameplayOver={handleGameOver}
                />

                {isGameplayScreen && selectedLevel && !levelResult ? (
                  <ViewportBossEnemy
                    gameType={selectedLevel.gameType}
                    levelId={selectedLevel.id}
                    resultType={null}
                  />
                ) : null}
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
              enemyArt={activeBossArt || undefined}
              result={levelResult ? {
                ...levelResult,
                primaryLabel: levelResult.type === 'victory' ? 'Continue adventure' : 'Try again',
                onPrimary: levelResult.type === 'victory' ? handleAdvanceAfterVictory : handleRetryLevel,
                secondaryLabel: levelResult.type === 'victory' ? 'Replay level' : 'Level select',
                onSecondary: levelResult.type === 'victory' ? handleRetryLevel : handleCloseLevelResult,
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
                      onBack={handleGlobalDockBack}
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
