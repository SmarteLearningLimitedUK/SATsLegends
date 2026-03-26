import React from 'react';
import { motion } from 'motion/react';
import AvatarSelect from '../screens/AvatarSelect';
import WorldMap from '../screens/WorldMap';
import IslandLevels from '../screens/IslandLevels';
import ParentDashboard from '../screens/ParentDashboard';
import UnifiedMiniGameHud from '../components/UnifiedMiniGameHud';
import {
  FramedPanel,
  GameScreenShell,
  HUDBar,
  PrimaryActionButton,
  PremiumHeaderBar,
  RewardPanel,
  SecondaryActionButton,
} from '../layout/ScreenPrimitives';
import { getMiniGame, MiniGameRegistryKey } from '../games';
import { isBossEncounterGameType } from '../games/BossEncounterGame';
import { GameScreen, IslandData, LevelData, PlayerData } from '../types';
import splashPoster from '../assets/casual_ui/splashrep1.png';
import splashStartPill from '../assets/casual_ui/inputs/btn_1.png';
import { GameplaySessionEventHandlers, GameplaySessionState } from './gameplaySessionContract';

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
  isGameplayInstructionPending: boolean;
  gameplayTypeClass: string;
  usesQuestionMatchFrame: boolean;
  globalMiniGameHudTimeLeft: number;
  globalMiniGameLives: number;
  globalMiniGameHudDurationSeconds: number;
  sessionState: GameplaySessionState;
  sessionEvents: GameplaySessionEventHandlers;
  onStartAdventure: () => void;
  onSaveProfileName: () => void;
  onAvatarSelect: (avatarId: string) => void;
  onAvatarConfirm: () => void;
  onGoHome: () => void;
  onBackToSplash: () => void;
  onSelectIsland: (island: IslandData) => void;
  onSelectLevel: (level: LevelData) => void;
  onBackToIslandLevels: () => void;
  onDismissGameplayInstruction: () => void;
  onGameplayVictory: (stars: number, score: number) => void;
  onGameplayOver: (score: number) => void;
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
  isGameplayInstructionPending,
  gameplayTypeClass,
  usesQuestionMatchFrame,
  globalMiniGameHudTimeLeft,
  globalMiniGameLives,
  globalMiniGameHudDurationSeconds,
  sessionState,
  sessionEvents,
  onStartAdventure,
  onSaveProfileName,
  onAvatarSelect,
  onAvatarConfirm,
  onGoHome,
  onBackToSplash,
  onSelectIsland,
  onSelectLevel,
  onBackToIslandLevels,
  onDismissGameplayInstruction,
  onGameplayVictory,
  onGameplayOver,
}) => {
  const renderGameplay = () => {
    if (!selectedLevel) return null;

    const renderFromRegistry = <P extends Record<string, unknown>>(key: MiniGameRegistryKey, props: P) => (
      getMiniGame(key).render(props)
    );

    const sharedProps = {
      levelId: selectedLevel.id,
      avatarId: player.avatarId,
      useSharedTopHud: true,
      onVictory: onGameplayVictory,
      onGameOver: onGameplayOver,
      onBack: onBackToIslandLevels,
      sessionState,
      sessionEvents: {
        ...sessionEvents,
        onCorrectAnswer: (payload) => sessionEvents.onCorrectAnswer?.({
          gameType: selectedLevel.gameType,
          levelId: selectedLevel.id,
          ...payload,
        }),
        onIncorrectAnswer: (payload) => sessionEvents.onIncorrectAnswer?.({
          gameType: selectedLevel.gameType,
          levelId: selectedLevel.id,
          ...payload,
        }),
        onPuzzleComplete: (payload) => sessionEvents.onPuzzleComplete?.({
          gameType: selectedLevel.gameType,
          levelId: selectedLevel.id,
          ...payload,
        }),
        onGameComplete: (payload) => sessionEvents.onGameComplete?.({
          gameType: selectedLevel.gameType,
          levelId: selectedLevel.id,
          ...payload,
        }),
        onGameFailed: (payload) => sessionEvents.onGameFailed?.({
          gameType: selectedLevel.gameType,
          levelId: selectedLevel.id,
          ...payload,
        }),
      },
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
          onVictory: onGameplayVictory,
          onGameOver: onGameplayOver,
          onBack: onBackToIslandLevels,
        });
      default:
        if (selectedLevel.isBoss && isBossEncounterGameType(selectedLevel.gameType)) {
          return renderFromRegistry('BossEncounterGame', {
            gameType: selectedLevel.gameType,
            levelId: selectedLevel.id,
            avatarId: player.avatarId,
            onVictory: onGameplayVictory,
            onGameOver: onGameplayOver,
            onBack: onBackToIslandLevels,
          });
        }
        return (
          <div className="flex flex-col items-center gap-6 p-10 bg-white/20 backdrop-blur-xl rounded-[3rem] border-4 border-white/30 my-auto text-center">
            <h2 className="text-4xl font-black text-white">Mini-game incoming</h2>
            <p className="text-white/80 max-w-xl text-lg">
              This slot is wired into the adventure flow, but the gameplay scene is still being built.
            </p>
            <button
              onClick={onBackToIslandLevels}
              className="ui-button-primary px-8 py-4 text-white font-black"
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
              onClick={onStartAdventure}
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
                  if (event.key === 'Enter') onSaveProfileName();
                }}
                placeholder="Explorer"
                className="licensed-slice-paper-panel aaa-name-input w-full max-w-xl rounded-[1.25rem] px-5 py-3 text-center text-base font-black text-amber-950 shadow-[0_14px_28px_rgba(0,0,0,0.2)] outline-none placeholder:text-amber-900/35 focus:ring-4 focus:ring-yellow-300/45 md:rounded-[1.75rem] md:px-6 md:py-5 md:text-3xl"
              />
              <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                <SecondaryActionButton onClick={onBackToSplash} className="rounded-[1.25rem] px-6 py-3 text-sm md:rounded-2xl md:px-8 md:py-4 md:text-base">
                  Back
                </SecondaryActionButton>
                <PrimaryActionButton onClick={onSaveProfileName} className="rounded-[1.25rem] px-8 py-3 text-base md:rounded-2xl md:px-10 md:py-4 md:text-lg">
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
          onSelect={onAvatarSelect}
          onConfirm={onAvatarConfirm}
        />
      );

    case 'world_map':
      return <WorldMap player={player} onSelectIsland={onSelectIsland} />;

    case 'island_levels':
      return selectedIsland ? (
        <IslandLevels
          island={selectedIsland}
          player={player}
          onBack={onGoHome}
          onSelectLevel={onSelectLevel}
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
                      onClick={onDismissGameplayInstruction}
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
                totalTime={globalMiniGameHudDurationSeconds}
                lives={globalMiniGameLives}
              />
            </div>
          </div>
        </div>
      );

    case 'parent_dashboard':
      return <ParentDashboard player={player} onBack={onGoHome} />;

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
