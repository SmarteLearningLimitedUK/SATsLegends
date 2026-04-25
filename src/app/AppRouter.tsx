import React, { Suspense, useMemo } from 'react';
import { motion } from 'motion/react';
import AvatarSelect from '../screens/AvatarSelect';
import WorldMap from '../screens/WorldMap';
import IslandLevels from '../screens/IslandLevels';
import ParentDashboard from '../screens/ParentDashboard';
import PlayerProfile from '../screens/PlayerProfile';
import CharacterShop from '../screens/CharacterShop';
import AchievementTracker from '../screens/AchievementTracker';
import MathsHelpHub from '../screens/MathsHelpHub';
import WellbeingHub from '../wellbeing/WellbeingHub';
import { WELLBEING_ACTIVITIES, WELLBEING_ACTIVITY_BY_ISLAND, WELLBEING_BY_ID } from '../wellbeing/data';
import { WellbeingActivityId } from '../wellbeing/types';
import GameplayContentViewport from '../components/GameplayContentViewport';
import GameLoadBoundary, { GameLoadFallback } from '../components/GameLoadBoundary';
import {
  FramedPanel,
  GameScreenShell,
  HUDBar,
  PrimaryActionButton,
  PremiumHeaderBar,
  RewardPanel,
} from '../layout/ScreenPrimitives';
import { getMiniGame, MiniGameRegistryKey } from '../games';
import { buildAngleQuestions } from '../games/angleArena/questions';
import { isBossEncounterGameType } from '../games/bossEncounterTypes';
import { GameScreen, IslandData, LevelData, PlayerData } from '../types';
import { getLevelGameTitle } from '../utils/gameNames';
import splashPoster from '../assets/casual_ui/splashrep1.png';
import {
  bindMiniGameSessionHandlers,
  emitMiniGameSessionEvent,
  GameplaySessionEventHandlers,
  GameplaySessionState,
} from './gameplaySessionContract';

interface RuleSet {
  title: string;
  summary: string;
  bullets: string[];
}

interface AppRouterProps {
  screen: GameScreen;
  player: PlayerData;
  draftName: string;
  setDraftName: (value: string) => void;
  selectedIsland: IslandData | null;
  selectedLevel: LevelData | null;
  selectedRuleSet: RuleSet | null;
  hintRuleSet: RuleSet | null;
  gameplayTypeClass: string;
  gameplayRestartKey: number;
  usesQuestionMatchFrame: boolean;
  globalMiniGameHudTimeLeft: number;
  globalMiniGameLives: number;
  globalMiniGameHudDurationSeconds: number;
  sessionState: GameplaySessionState;
  sessionEvents: GameplaySessionEventHandlers;
  onStartAdventure: () => void;
  onAvatarSelect: (avatarId: string) => void;
  onAvatarConfirm: () => void;
  onGoHome: () => void;
  onBackToSplash: () => void;
  onSelectIsland: (island: IslandData) => void;
  onSelectLevel: (level: LevelData) => void;
  onBackToIslandLevels: () => void;
  onOpenWellbeingHub: () => void;
  onOpenWellbeingActivity: (activityId: WellbeingActivityId) => void;
  onExitWellbeing: () => void;
  onCompleteWellbeingActivity: () => void;
  wellbeingActivityId: WellbeingActivityId | null;
  calmTokens: number;
  onGameplayVictory: (stars: number, XP: number) => void;
  onGameplayOver: (XP: number) => void;
  onOpenShop: () => void;
  onOpenAchievements: () => void;
  onOpenParentReport: () => void;
  onUpdatePlayer: (updater: (prev: PlayerData) => PlayerData) => void;
}

export const AppRouter: React.FC<AppRouterProps> = ({
  screen,
  player,
  draftName,
  setDraftName,
  selectedIsland,
  selectedLevel,
  selectedRuleSet,
  hintRuleSet,
  gameplayTypeClass,
  gameplayRestartKey,
  usesQuestionMatchFrame,
  globalMiniGameHudTimeLeft,
  globalMiniGameLives,
  globalMiniGameHudDurationSeconds,
  sessionState,
  sessionEvents,
  onStartAdventure,
  onAvatarSelect,
  onAvatarConfirm,
  onGoHome,
  onBackToSplash,
  onSelectIsland,
  onSelectLevel,
  onBackToIslandLevels,
  onOpenWellbeingHub,
  onOpenWellbeingActivity,
  onExitWellbeing,
  onCompleteWellbeingActivity,
  wellbeingActivityId,
  calmTokens,
  onGameplayVictory,
  onGameplayOver,
  onOpenShop,
  onOpenAchievements,
  onOpenParentReport,
  onUpdatePlayer,
}) => {
  const renderStandaloneRatioRacer = () => {
    const standaloneLevelId = 4;
    const gameTitle = 'Ratio Racer';
    const sessionContext = {
      gameType: 'ratio_fractions' as const,
      levelId: standaloneLevelId,
    };

    const sharedProps = {
      levelId: standaloneLevelId,
      avatarId: player.avatarId,
      useSharedTopHud: true,
      isPractice: false,
      practiceBriefing: null,
      gameTitle,
      onVictory: () => undefined,
      onGameOver: () => undefined,
      onBack: onGoHome,
      sessionState,
      sessionEvents: bindMiniGameSessionHandlers(sessionEvents, sessionContext),
    };

    return (
      <GameLoadBoundary
        key={`RatioRacerGame-standalone-${gameplayRestartKey}`}
        onBack={onGoHome}
        context={{
          title: gameTitle,
          gameType: sessionContext.gameType,
          levelId: standaloneLevelId,
          blueprintKey: 'ratio_fractions',
        }}
      >
        <Suspense
          fallback={(
            <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(10,31,83,0.72),rgba(6,19,56,0.86))] text-center shadow-[0_18px_36px_rgba(2,6,23,0.35)]">
              <div className="px-6 py-8 text-sm font-black uppercase tracking-[0.2em] text-cyan-100/80">
                Loading game...
              </div>
            </div>
          )}
        >
          {getMiniGame('RatioRacerGame').render(sharedProps)}
        </Suspense>
      </GameLoadBoundary>
    );
  };

  const renderStandaloneScaleBuilder = () => {
    const standaloneLevelId = 5;
    const gameTitle = 'Scale Builder';
    const sessionContext = {
      gameType: 'scale_safari' as const,
      levelId: standaloneLevelId,
    };

    const sharedProps = {
      levelId: standaloneLevelId,
      avatarId: player.avatarId,
      useSharedTopHud: true,
      isPractice: false,
      practiceBriefing: null,
      gameTitle,
      onVictory: () => undefined,
      onGameOver: () => undefined,
      onBack: onGoHome,
      sessionState,
      sessionEvents: bindMiniGameSessionHandlers(sessionEvents, sessionContext),
    };

    return (
      <GameLoadBoundary
        key={`ScaleBuilderGame-standalone-${gameplayRestartKey}`}
        onBack={onGoHome}
        context={{
          title: gameTitle,
          gameType: sessionContext.gameType,
          levelId: standaloneLevelId,
          blueprintKey: 'scale_builder',
        }}
      >
        <Suspense
          fallback={(
            <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(10,31,83,0.72),rgba(6,19,56,0.86))] text-center shadow-[0_18px_36px_rgba(2,6,23,0.35)]">
              <div className="px-6 py-8 text-sm font-black uppercase tracking-[0.2em] text-cyan-100/80">
                Loading game...
              </div>
            </div>
          )}
        >
          {getMiniGame('ScaleBuilderGame').render(sharedProps)}
        </Suspense>
      </GameLoadBoundary>
    );
  };

  const renderStandaloneShareSplitter = () => {
    const standaloneLevelId = 3;
    const gameTitle = 'Share Splitter';
    const sessionContext = {
      gameType: 'ratio_rapids' as const,
      levelId: standaloneLevelId,
    };

    const sharedProps = {
      levelId: standaloneLevelId,
      avatarId: player.avatarId,
      useSharedTopHud: true,
      isPractice: false,
      practiceBriefing: null,
      gameTitle,
      onVictory: () => undefined,
      onGameOver: () => undefined,
      onBack: onGoHome,
      sessionState,
      sessionEvents: bindMiniGameSessionHandlers(sessionEvents, sessionContext),
    };

    return (
      <GameLoadBoundary
        key={`ShareSplitterGame-standalone-${gameplayRestartKey}`}
        onBack={onGoHome}
        context={{
          title: gameTitle,
          gameType: sessionContext.gameType,
          levelId: standaloneLevelId,
          blueprintKey: 'share_splitter',
        }}
      >
        <Suspense
          fallback={(
            <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(10,31,83,0.72),rgba(6,19,56,0.86))] text-center shadow-[0_18px_36px_rgba(2,6,23,0.35)]">
              <div className="px-6 py-8 text-sm font-black uppercase tracking-[0.2em] text-cyan-100/80">
                Loading game...
              </div>
            </div>
          )}
        >
          {getMiniGame('ShareSplitterGame').render(sharedProps)}
        </Suspense>
      </GameLoadBoundary>
    );
  };

  const renderGameplay = () => {
    if (!selectedLevel) {
      return (
        <GameLoadFallback
          title="This game is missing"
          subtitle="We could not find the selected level data."
          onBack={onBackToIslandLevels}
        />
      );
    }

    const renderFromRegistry = <P extends Record<string, unknown>>(key: MiniGameRegistryKey, props: P) => (
      <GameLoadBoundary
        key={`${key}-${selectedLevel.id}-${gameplayRestartKey}`}
        onBack={onBackToIslandLevels}
        context={{
          title: getLevelGameTitle(selectedLevel),
          gameType: selectedLevel.gameType,
          levelId: selectedLevel.id,
          blueprintKey: selectedLevel.blueprintKey,
        }}
      >
        <Suspense
          fallback={(
            <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(10,31,83,0.72),rgba(6,19,56,0.86))] text-center shadow-[0_18px_36px_rgba(2,6,23,0.35)]">
              <div className="px-6 py-8 text-sm font-black uppercase tracking-[0.2em] text-cyan-100/80">
                Loading game…
              </div>
            </div>
          )}
        >
          {getMiniGame(key).render(props)}
        </Suspense>
      </GameLoadBoundary>
    );

    const gameplayLevelId = selectedLevel.miniGameLevel || selectedLevel.id;

    const sharedProps = {
      levelId: gameplayLevelId,
      avatarId: player.avatarId,
      useSharedTopHud: true,
      isPractice: Boolean(selectedLevel.isPractice),
      practiceBriefing: hintRuleSet,
      gameTitle: getLevelGameTitle(selectedLevel),
      onVictory: onGameplayVictory,
      onGameOver: onGameplayOver,
      onBack: onBackToIslandLevels,
      sessionState,
      sessionEvents: bindMiniGameSessionHandlers(sessionEvents, {
        gameType: selectedLevel.gameType,
        levelId: selectedLevel.id,
      }),
    };

    switch (selectedLevel.gameType) {
      case 'cloud_collapse':
        return renderFromRegistry('FractionMatchGame', { ...sharedProps, variantGameType: 'cloud_collapse', isBoss: Boolean(selectedLevel.isBoss) });
      case 'potion_pour':
        return renderFromRegistry('PotionPanicGame', sharedProps);
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
        return renderFromRegistry('AngleArenaGame', {
          ...sharedProps,
          questions: buildAngleQuestions({
            level: selectedLevel.miniGameLevel || selectedLevel.id,
            launcherX: 0,
            groundY: 0,
            gravity: 0,
          }),
          onRoundComplete: (correct: boolean) => {
            emitMiniGameSessionEvent(
              sessionEvents,
              correct ? 'correct_answer' : 'incorrect_answer',
              {
                gameType: selectedLevel.gameType,
                levelId: selectedLevel.id,
              },
            );
          },
        });
      case 'polygon_palace':
        return renderFromRegistry('PolygonPalaceGame', sharedProps);
      case 'data_dungeon':
        if (selectedLevel.blueprintKey === 'table_trouble') {
          return renderFromRegistry('LineGraphLabGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'whodunnit_data' || selectedLevel.blueprintKey === 'data_detective') {
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
        return renderFromRegistry('RatioRacerGame', {
          ...sharedProps,
          gameTitle: getLevelGameTitle(selectedLevel),
        });
      case 'timekeeper_temple':
        return renderFromRegistry('ChronoDashGame', sharedProps);
      case 'measurement_forge':
        if (selectedLevel.blueprintKey === 'perimeter_path') {
          return renderFromRegistry('PerimeterPathGame', sharedProps);
        }
        return renderFromRegistry('ConversionCanyonGame', sharedProps);
      case 'tower_of_factors':
        if (selectedLevel.blueprintKey === 'factor_frenzy') {
          return renderFromRegistry('FactorFrenzyGame', sharedProps);
        }
        if (selectedLevel.isBoss && isBossEncounterGameType(selectedLevel.gameType)) {
          return renderFromRegistry('BossEncounterGame', {
            ...sharedProps,
            gameType: selectedLevel.gameType,
          });
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
            isPractice: Boolean(selectedLevel.isPractice),
          });
        }
        if (selectedLevel.blueprintKey === 'rounding_rocket') {
          return renderFromRegistry('RoundingRocketGame', sharedProps);
        }
        return renderFromRegistry('DecimalSniperGame', { ...sharedProps, isBoss: Boolean(selectedLevel.isBoss) });
      case 'graph_grabber':
        if (selectedLevel.blueprintKey === 'range_rodeo') {
          return renderFromRegistry('RangeRodeoGame', {
            ...sharedProps,
            isPractice: Boolean(selectedLevel.isPractice),
          });
        }
        if (selectedLevel.blueprintKey === 'line_graph_lab') {
          return renderFromRegistry('LineGraphLabGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'chart_challenge' || selectedLevel.blueprintKey === 'median_mountain') {
          return renderFromRegistry('MedianMountainGame', sharedProps);
        }
        return renderFromRegistry('GraphGrabberGame', {
          ...sharedProps,
          isPractice: Boolean(selectedLevel.isPractice),
        });
      case 'equation_grove':
        // Default all equation_grove gameplay to Order Ops Arena (single shipped experience for this lane).
        return renderFromRegistry('OrderOpsArenaGame', sharedProps);
      case 'formula_forge':
        return renderFromRegistry('FormulaForgeGame', sharedProps);
      case 'unit_mixer':
        return renderFromRegistry('LavaPathGame', sharedProps);
      case 'change_counter':
        return renderFromRegistry('ChangeCounterGame', sharedProps);
      case 'reasoning_quest':
        return renderFromRegistry('ReasoningQuestGame', sharedProps);
      case 'coordinate_quest':
        if (selectedLevel.blueprintKey === 'number_line_ninja') {
          return renderFromRegistry('NumberLineNinjaGame', sharedProps);
        }
        return renderFromRegistry('CoordinatesQuestGame', sharedProps);
      case 'calculation_clash':
        if (selectedLevel.blueprintKey === 'multiplication_mine') {
          return renderFromRegistry('MultiplicationMineGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'remainder_run') {
          return renderFromRegistry('RemainderRunGame', sharedProps);
        }
        return renderFromRegistry('CalculationCrashGame', sharedProps);
      case 'percent_power':
        return renderFromRegistry('PercentPowerGame', sharedProps);
      case 'transform_temple':
        if (selectedLevel.blueprintKey === 'rotation_relay') {
          return renderFromRegistry('RotationStationGame', sharedProps);
        }
        return renderFromRegistry('CurriculumChallengeGame', {
          ...sharedProps,
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
        });
      case 'area_architect':
        return renderFromRegistry('AreaArchitectGame', sharedProps);
      case 'ratio_fractions':
        return renderFromRegistry('RatioRacerGame', sharedProps);
      case 'scale_safari':
        if (selectedLevel.blueprintKey === 'scale_builder') {
          return renderFromRegistry('ScaleBuilderGame', sharedProps);
        }
        return renderFromRegistry('CurriculumChallengeGame', {
          ...sharedProps,
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
        });
      case 'mean_machine':
        if (selectedLevel.blueprintKey === 'mean_machine') {
          return renderFromRegistry('MeanMachineGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'median_mountain') {
          return renderFromRegistry('MedianMountainGame', sharedProps);
        }
        return renderFromRegistry('CurriculumChallengeGame', {
          ...sharedProps,
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
        });
      case 'rule_runner':
        if (selectedLevel.blueprintKey === 'median_mountain') {
          return renderFromRegistry('MedianMountainGame', sharedProps);
        }
        if (selectedLevel.blueprintKey === 'problem_pyramid') {
          return renderFromRegistry('ProblemPyramidGame', sharedProps);
        }
        return renderFromRegistry('CurriculumChallengeGame', {
          ...sharedProps,
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
        });
      case 'logic_sort':
        return renderFromRegistry('ReasoningGame', {
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
          isPractice: Boolean(selectedLevel.isPractice),
          onVictory: onGameplayVictory,
          onGameOver: onGameplayOver,
          onBack: onBackToIslandLevels,
        });
      case 'matrix_match':
        if (selectedLevel.isBoss && isBossEncounterGameType(selectedLevel.gameType)) {
          return renderFromRegistry('BossEncounterGame', {
            ...sharedProps,
            gameType: selectedLevel.gameType,
          });
        }
        return renderFromRegistry('ReasoningGame', {
          gameType: selectedLevel.gameType,
          isBoss: Boolean(selectedLevel.isBoss),
          isPractice: Boolean(selectedLevel.isPractice),
          onVictory: onGameplayVictory,
          onGameOver: onGameplayOver,
          onBack: onBackToIslandLevels,
        });
      default:
        if (selectedLevel.isBoss && isBossEncounterGameType(selectedLevel.gameType)) {
          return renderFromRegistry('BossEncounterGame', {
            ...sharedProps,
            gameType: selectedLevel.gameType,
          });
        }
        return (
          <div className="my-auto flex flex-col items-center gap-6 rounded-[2.2rem] border border-cyan-100/35 bg-[linear-gradient(180deg,rgba(18,48,102,0.84),rgba(12,31,78,0.88))] p-8 text-center shadow-[0_18px_32px_rgba(2,6,23,0.4)]">
            <h2 className="text-4xl font-black text-amber-100">Mini-game incoming</h2>
            <p className="max-w-xl text-lg font-semibold text-cyan-100/88">
              This slot is wired into the adventure flow, but the gameplay scene is still being built.
            </p>
            <button
              onClick={onBackToIslandLevels}
              className="ui-button-primary rounded-2xl px-8 py-4 font-black text-white"
            >
              Back to island
            </button>
          </div>
        );
    }
  };

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
            <button
              type="button"
              onClick={onStartAdventure}
              aria-label="Start"
              className="ui-button-primary flex h-full w-full items-center justify-center border-0 bg-transparent px-4 py-0 text-lg !font-black uppercase tracking-[0.12em] text-[#16233d] sm:text-xl"
            >
              <span className="font-black">Start</span>
            </button>
          </div>
        </div>
      );
    case 'profile_setup':
    case 'avatar_selection':
      return (
        <AvatarSelect
          selectedId={player.avatarId}
          onSelect={onAvatarSelect}
          draftName={draftName}
          onDraftNameChange={setDraftName}
          onBackToSplash={onBackToSplash}
          onConfirm={onAvatarConfirm}
        />
      );

    case 'world_map':
      return (
        <WorldMap
          player={player}
          onSelectIsland={onSelectIsland}
          onOpenShop={onOpenShop}
          onOpenAchievements={onOpenAchievements}
          onOpenParentReport={onOpenParentReport}
        />
      );

    case 'island_levels':
      return selectedIsland ? (
        <IslandLevels
          island={selectedIsland}
          player={player}
          onBack={onGoHome}
          onSelectLevel={onSelectLevel}
          wellbeingTitle={WELLBEING_BY_ID[WELLBEING_ACTIVITY_BY_ISLAND[selectedIsland.id]]?.title}
          wellbeingSubtitle={WELLBEING_BY_ID[WELLBEING_ACTIVITY_BY_ISLAND[selectedIsland.id]]?.description}
          wellbeingType={WELLBEING_BY_ID[WELLBEING_ACTIVITY_BY_ISLAND[selectedIsland.id]]?.type}
          onOpenWellbeing={() => onOpenWellbeingActivity(WELLBEING_ACTIVITY_BY_ISLAND[selectedIsland.id])}
        />
      ) : null;

    case 'shop':
      return (
        <CharacterShop
          player={player}
          onBack={onGoHome}
          onUpdatePlayer={onUpdatePlayer}
        />
      );

    case 'achievements_tracker':
      return <AchievementTracker player={player} onBack={onGoHome} />;

    case 'maths_help_hub':
      return <MathsHelpHub onBack={onGoHome} />;

    case 'wellbeing_hub':
      return (
        <WellbeingHub
          activities={WELLBEING_ACTIVITIES}
          calmTokens={calmTokens}
          onSelect={onOpenWellbeingActivity}
          onExit={onExitWellbeing}
        />
      );

    case 'wellbeing_activity': {
      if (!wellbeingActivityId) return null;
      const SelectedWellbeingActivity = WELLBEING_BY_ID[wellbeingActivityId]?.component;
      return SelectedWellbeingActivity ? (
        <SelectedWellbeingActivity onComplete={onCompleteWellbeingActivity} onExit={onExitWellbeing} />
      ) : null;
    }

    case 'gameplay':
      return (
        <div
          className={`game-shell-host unified-minigame-hud-enabled ${gameplayTypeClass} ${usesQuestionMatchFrame ? 'question-match-shell' : ''} relative flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden`.trim()}
        >
            <div className="game-shell-contract relative z-[2] flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">

            <div
              className="structured-game-layout relative flex h-full max-h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
              style={{
                padding: 0,
              }}
            >
              <GameplayContentViewport>
                {renderGameplay()}
              </GameplayContentViewport>
            </div>

          </div>
        </div>
      );

    case 'ratio_racer':
      return (
        <div className="game-shell-host unified-minigame-hud-enabled game-type-ratio-fractions relative flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">
          <div className="game-shell-contract relative z-[2] flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">
            <div
              className="structured-game-layout relative flex h-full max-h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
              style={{ padding: 0 }}
            >
              <GameplayContentViewport>
                {renderStandaloneRatioRacer()}
              </GameplayContentViewport>
            </div>
          </div>
        </div>
      );

    case 'scale_builder':
      return (
        <div className="game-shell-host unified-minigame-hud-enabled game-type-scale-safari relative flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">
          <div className="game-shell-contract relative z-[2] flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">
            <div
              className="structured-game-layout relative flex h-full max-h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
              style={{ padding: 0 }}
            >
              <GameplayContentViewport>
                {renderStandaloneScaleBuilder()}
              </GameplayContentViewport>
            </div>
          </div>
        </div>
      );

    case 'share_splitter':
      return (
        <div className="game-shell-host unified-minigame-hud-enabled game-type-ratio-rapids relative flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">
          <div className="game-shell-contract relative z-[2] flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">
            <div
              className="structured-game-layout relative flex h-full max-h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
              style={{ padding: 0 }}
            >
              <GameplayContentViewport>
                {renderStandaloneShareSplitter()}
              </GameplayContentViewport>
            </div>
          </div>
        </div>
      );

    case 'parent_dashboard':
      return <ParentDashboard player={player} onBack={onGoHome} />;

    case 'profile':
      return <PlayerProfile player={player} onBack={onGoHome} />;

    case 'settings':
      return (
        <GameScreenShell className="my-auto flex items-center justify-center">
          <FramedPanel variant="surface" className="flex w-full max-w-md flex-col gap-4 p-4 text-center md:max-w-2xl md:gap-6 md:p-8">
            <PremiumHeaderBar eyebrow="Adventure menu" title={screen === 'profile' ? 'Profile' : 'Settings'} className="justify-center text-center" />
            <RewardPanel className="mx-auto max-w-xl">
              <p className="text-sm font-black leading-relaxed text-amber-950 md:text-base">
                This screen is parked for the next premium UI pass. The main adventure flow is live and fully playable.
              </p>
            </RewardPanel>
            <PrimaryActionButton onClick={onGoHome} className="mx-auto rounded-[1.25rem] px-8 py-3 text-base md:rounded-2xl md:px-10 md:py-4 md:text-lg">
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
            <PrimaryActionButton onClick={onGoHome} className="mx-auto rounded-[1.25rem] px-8 py-3 text-base md:rounded-2xl md:px-10 md:py-4 md:text-lg">
              Return to map
            </PrimaryActionButton>
          </FramedPanel>
        </GameScreenShell>
      );
  }
};
