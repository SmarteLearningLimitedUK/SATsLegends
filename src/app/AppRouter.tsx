import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import AvatarSelect from '../screens/AvatarSelect';
import WorldMap from '../screens/WorldMap';
import IslandLevels from '../screens/IslandLevels';
import ParentDashboard from '../screens/ParentDashboard';
import UnifiedMiniGameHud from '../components/UnifiedMiniGameHud';
import GameplayContentViewport from '../components/GameplayContentViewport';
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
import {
  bindMiniGameSessionHandlers,
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
  onGameplayVictory,
  onGameplayOver,
}) => {
  const [showInlineHint, setShowInlineHint] = useState(false);

  const inlineHintText = useMemo(() => {
    if (hintRuleSet?.summary?.trim()) return hintRuleSet.summary.trim();
    if (selectedRuleSet?.summary?.trim()) return selectedRuleSet.summary.trim();
    return 'Solve the mission quickly and accurately before time runs out.';
  }, [hintRuleSet?.summary, selectedRuleSet?.summary]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) {
      setShowInlineHint(false);
      return undefined;
    }

    setShowInlineHint(true);
    const timeoutId = window.setTimeout(() => {
      setShowInlineHint(false);
    }, 1400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [screen, selectedLevel?.id]);

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
      sessionEvents: bindMiniGameSessionHandlers(sessionEvents, {
        gameType: selectedLevel.gameType,
        levelId: selectedLevel.id,
      }),
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
        <div className={`game-shell-host unified-minigame-hud-enabled ${gameplayTypeClass} ${usesQuestionMatchFrame ? 'question-match-shell' : ''} relative flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden md:h-full md:max-h-full`.trim()}>
          <div className="game-shell-contract relative flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">
            <div className="structured-game-layout flex h-full max-h-full w-full min-h-0 flex-1 flex-col overflow-hidden">
              <div className="game-shell-zone game-shell-zone-hud shrink-0" aria-hidden />
              <GameplayContentViewport>
                {renderGameplay()}
                {showInlineHint ? (
                  <div className="pointer-events-none absolute inset-x-3 top-3 z-50 flex justify-center md:inset-x-5 md:top-4">
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      className="max-w-[30rem] rounded-2xl border border-cyan-100/45 bg-[linear-gradient(180deg,rgba(19,53,120,0.92),rgba(12,36,92,0.94))] px-4 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.12em] text-cyan-50 shadow-[0_12px_24px_rgba(2,6,23,0.45)] md:px-5 md:py-3 md:text-xs"
                    >
                      {inlineHintText}
                    </motion.div>
                  </div>
                ) : null}
              </GameplayContentViewport>
              <div className="game-shell-zone game-shell-zone-actions shrink-0" aria-hidden />
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
