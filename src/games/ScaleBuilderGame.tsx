import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Layers, Ruler, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AVATARS } from '../constants';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import labelGreenLongAsset from '../assets/licensed/slices/label_green_long.png';
import scaleBuilderBackground from '../assets/maps/backgroundsforgames/scalebuilder-construction.png';
import { GameQuestionCard, IconButton, PrimaryButton } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';

interface ScaleBuilderGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface Shape {
  type: 'rect' | 'triangle' | 'l-shape';
  baseWidth: number;
  baseHeight: number;
}

interface Level {
  id: number;
  name: string;
  shape: Shape;
  targetScale: number;
  instructions: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: 'The Foundation',
    shape: { type: 'rect', baseWidth: 56, baseHeight: 36 },
    targetScale: 2.0,
    instructions: 'Original size: 56 units by 36 units\n\nScale factor: x2\n\nWhat is the new size?',
  },
  {
    id: 2,
    name: 'Compact Living',
    shape: { type: 'rect', baseWidth: 72, baseHeight: 48 },
    targetScale: 0.5,
    instructions: 'Original size: 72 units by 48 units\n\nScale factor: x0.5\n\nWhat is the new size?',
  },
  {
    id: 3,
    name: 'The Gable',
    shape: { type: 'rect', baseWidth: 48, baseHeight: 32 },
    targetScale: 3.0,
    instructions: 'Original size: 48 units by 32 units\n\nScale factor: x3\n\nWhat is the new size?',
  },
  {
    id: 4,
    name: 'The Corner Office',
    shape: { type: 'triangle', baseWidth: 72, baseHeight: 54 },
    targetScale: 1.5,
    instructions: 'Original size: 72 units by 54 units\n\nScale factor: x1.5\n\nWhat is the new size?',
  },
  {
    id: 5,
    name: 'The Grand Hall',
    shape: { type: 'l-shape', baseWidth: 72, baseHeight: 72 },
    targetScale: 1.25,
    instructions: 'Original size: 72 units by 72 units\n\nScale factor: x1.25\n\nWhat is the new size?',
  },
];

const GRID_SIZE = 20;
const BLUEPRINT_BOARD_TOP = '58%';
const BLUEPRINT_BOARD_SIZE = 'min(76vw, 29rem, 58vh)';
const SCALE_BUILDER_INTRO = `The Monster Minds have damaged the island structures.\nUse the scale factor to rebuild each blueprint to the correct size.\nMultiply each length correctly.`;

const formatBlueprintValue = (value: number) => {
  const normalized = Math.round(value * 100) / 100;
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(2).replace(/\.?0+$/, '');
};

const BlueprintGrid: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 opacity-22">
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(125,211,252,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(125,211,252,0.45) 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(250,204,21,0.45) 2px, transparent 2px), linear-gradient(to bottom, rgba(250,204,21,0.45) 2px, transparent 2px)',
        backgroundSize: `${GRID_SIZE * 5}px ${GRID_SIZE * 5}px`,
      }}
    />
  </div>
);

const ShapeRenderer: React.FC<{
  shape: Shape;
  scaleX: number;
  scaleY: number;
  strokeClass: string;
  isBase?: boolean;
}> = ({ shape, scaleX, scaleY, strokeClass, isBase = false }) => {
  const width = shape.baseWidth * scaleX;
  const height = shape.baseHeight * scaleY;

  if (shape.type === 'rect') {
    return (
      <div
        className={`absolute border-2 transition-all duration-300 ${strokeClass}`}
        style={{
          width,
          height,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
      </div>
    );
  }

  if (shape.type === 'triangle') {
    return (
      <div
        className="absolute transition-all duration-300"
        style={{
          width,
          height,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path
          d={`M ${width / 2} 0 L ${width} ${height} L 0 ${height} Z`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className={strokeClass.replace('border-', 'text-')}
        />
      </svg>
      </div>
    );
  }

  const thickness = 30 * Math.min(scaleX, scaleY);
  return (
    <div
      className="absolute transition-all duration-300"
      style={{
        width,
        height,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path
          d={`M 0 0 L ${thickness} 0 L ${thickness} ${height - thickness} L ${width} ${height - thickness} L ${width} ${height} L 0 ${height} Z`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className={strokeClass.replace('border-', 'text-')}
        />
      </svg>
    </div>
  );
};

const ScaleBuilderGame: React.FC<ScaleBuilderGameProps> = ({
  levelId,
  avatarId,
  useSharedTopHud = false,
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [currentScale, setCurrentScale] = useState(1.0);
  const [widthScale, setWidthScale] = useState(1.0);
  const [heightScale, setHeightScale] = useState(1.0);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showBase, setShowBase] = useState(true);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const currentLevel = LEVELS[currentLevelIdx];
  const completedLevels = currentLevelIdx + (gameState === 'complete' ? 1 : 0);

  const finalScore = useMemo(() => {
    const base = 900 + (completedLevels * 220);
    const levelBonus = levelId * 60;
    const penalty = mistakeCount * 90;
    return Math.max(300, base + levelBonus - penalty);
  }, [completedLevels, levelId, mistakeCount]);

  const starRating = useMemo(() => {
    if (mistakeCount <= 1) return 3;
    if (mistakeCount <= 4) return 2;
    return 1;
  }, [mistakeCount]);

  const isDimensionMode = currentLevel.id >= 4;
  const activeScaleX = isDimensionMode ? widthScale : currentScale;
  const activeScaleY = isDimensionMode ? heightScale : currentScale;
  const blueprintLength = currentLevel.shape.baseWidth * activeScaleX;
  const blueprintWidth = currentLevel.shape.baseHeight * activeScaleY;

  const verifyScale = () => {
    const widthDiff = Math.abs(widthScale - currentLevel.targetScale);
    const heightDiff = Math.abs(heightScale - currentLevel.targetScale);
    const difference = Math.max(widthDiff, heightDiff);
    if (difference < 0.01) {
      setFeedback({ type: 'success', message: '🏗️ “Structure restored!”\n\nThe tower is rebuilt to 15 metres.' });
      setGameState('success');
      return;
    }

    setFeedback({ type: 'error', message: '⚠️ “Structure unstable!”' });
    setMistakeCount((previous) => previous + 1);
  };

  const proceed = () => {
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx((previous) => previous + 1);
      setCurrentScale(1.0);
      setFeedback(null);
      setGameState('playing');
      return;
    }

    setGameState('complete');
  };

  const adjustScale = (delta: number) => {
    setCurrentScale((previous) => Math.max(0.1, Math.min(4.0, parseFloat((previous + delta).toFixed(2)))));
    setWidthScale((previous) => Math.max(0.1, Math.min(4.0, parseFloat((previous + delta).toFixed(2)))));
    setHeightScale((previous) => Math.max(0.1, Math.min(4.0, parseFloat((previous + delta).toFixed(2)))));
    setFeedback(null);
  };

  const adjustDimension = (dimension: 'width' | 'height', delta: number) => {
    if (!isDimensionMode) {
      adjustScale(delta);
      return;
    }
    if (dimension === 'width') {
      setWidthScale((previous) => Math.max(0.1, Math.min(4.0, parseFloat((previous + delta).toFixed(2)))));
    } else {
      setHeightScale((previous) => Math.max(0.1, Math.min(4.0, parseFloat((previous + delta).toFixed(2)))));
    }
    setFeedback(null);
  };

  const resetLevel = () => {
    setCurrentScale(1.0);
    setWidthScale(1.0);
    setHeightScale(1.0);
    setFeedback(null);
  };

  const restartProject = () => {
    setCurrentLevelIdx(0);
    setCurrentScale(1.0);
    setWidthScale(1.0);
    setHeightScale(1.0);
    setFeedback(null);
    setGameState('playing');
    setMistakeCount(0);
  };

  useEffect(() => {
    setCurrentLevelIdx(0);
    setCurrentScale(1.0);
    setWidthScale(1.0);
    setHeightScale(1.0);
    setFeedback(null);
    setGameState('playing');
  }, []);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const finishAndContinue = () => {
    onVictory(starRating, finalScore);
  };

  const instructionsText = currentLevel.instructions;

  return (
    <GameScreenShell
      className="overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.25rem)]"
      backgroundImage={scaleBuilderBackground}
      backgroundPosition="center calc(50% + 10pt)"
      backgroundOpacity={1}
    >
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Scale Builder"
        body={SCALE_BUILDER_INTRO}
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,47,73,0.18)_0%,rgba(7,89,133,0.14)_38%,rgba(8,47,73,0.28)_100%)]" />
        <div
          className="absolute inset-0 opacity-72"
          style={{
            backgroundImage: [
              'linear-gradient(to right, rgba(186,230,253,0.22) 1px, transparent 1px)',
              'linear-gradient(to bottom, rgba(186,230,253,0.22) 1px, transparent 1px)',
              'linear-gradient(to right, rgba(96,165,250,0.22) 2px, transparent 2px)',
              'linear-gradient(to bottom, rgba(96,165,250,0.22) 2px, transparent 2px)',
            ].join(', '),
            backgroundSize: '22px 22px, 22px 22px, 110px 110px, 110px 110px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(191,219,254,0.28),transparent_52%),radial-gradient(circle_at_20%_20%,rgba(147,197,253,0.22),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(56,189,248,0.18),transparent_24%)]" />
      </div>
      <div className="pointer-events-none absolute left-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-20">
        <div className="pointer-events-auto">
          <IconButton
            icon={<ChevronRight className="h-5 w-5 rotate-180" />}
            label="Back"
            onClick={onBack}
          />
        </div>
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col gap-2 px-2 pb-1 pt-[calc(env(safe-area-inset-top)+0.95rem)] md:gap-3 md:px-3">
        <div className="relative mx-auto flex h-full w-full max-w-[780px] min-h-0 flex-1 flex-col overflow-visible">
          <div className="relative z-10 grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-0 md:gap-4 md:p-0">
            <GameQuestionCard title="Scale Builder" bodyClassName="text-[10px] font-black leading-snug md:text-[11px]">
              {instructionsText}
            </GameQuestionCard>

            <div className="relative min-h-0 flex-1 overflow-visible">
              <div className="relative z-10 h-full w-full">
                <div
                  className="absolute left-1/2 flex aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[0.9rem]"
                  style={{
                    top: BLUEPRINT_BOARD_TOP,
                    width: BLUEPRINT_BOARD_SIZE,
                    height: BLUEPRINT_BOARD_SIZE,
                  }}
                >
                  <BlueprintGrid />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.16),rgba(59,130,246,0.04)_65%,transparent_100%)]" />
                  <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-cyan-100/35 bg-slate-950/65 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_0_18px_rgba(2,6,23,0.25)] backdrop-blur-sm md:text-[11px]">
                    L {formatBlueprintValue(blueprintLength)}
                  </div>
                  <div className="pointer-events-none absolute right-3 bottom-3 z-20 rounded-full border border-cyan-100/35 bg-slate-950/65 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_0_18px_rgba(2,6,23,0.25)] backdrop-blur-sm md:text-[11px]">
                    W {formatBlueprintValue(blueprintWidth)}
                  </div>
                  {showBase ? (
                    <div className="absolute opacity-40">
                      <ShapeRenderer
                        shape={currentLevel.shape}
                        scaleX={1.0}
                        scaleY={1.0}
                        strokeClass="border-slate-300 border-dashed"
                        isBase
                      />
                    </div>
                  ) : null}
                  <ShapeRenderer
                    shape={currentLevel.shape}
                    scaleX={isDimensionMode ? widthScale : currentScale}
                    scaleY={isDimensionMode ? heightScale : currentScale}
                    strokeClass={
                      gameState === 'success'
                        ? 'border-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.36)]'
                        : 'border-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.3)]'
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.99),rgba(7,15,29,0.99))] p-2 shadow-[0_0_0_1px_rgba(15,23,42,0.6),0_18px_30px_rgba(2,6,23,0.46)]">
              <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/82">
                <span>Rebuild the blueprint</span>
                <button
                  onClick={() => setShowBase((previous) => !previous)}
                  className="ui-button-secondary rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]"
                >
                  {showBase ? 'Hide guide' : 'Show guide'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => adjustDimension('width', -0.25)}
                  disabled={gameState !== 'playing'}
                  className="ui-button-secondary rounded-lg px-2 py-2 text-xs font-black uppercase tracking-[0.12em] disabled:opacity-45"
                >
                  {isDimensionMode
                    ? 'L-0.25'
                    : '-0.25'}
                </button>
                <button
                  onClick={resetLevel}
                  disabled={gameState !== 'playing'}
                  className="ui-button-secondary rounded-lg px-2 py-2 text-xs font-black uppercase tracking-[0.12em] disabled:opacity-45"
                >
                  Reset
                </button>
                <button
                  onClick={() => adjustDimension('height', 0.25)}
                  disabled={gameState !== 'playing'}
                  className="ui-button-secondary rounded-lg px-2 py-2 text-xs font-black uppercase tracking-[0.12em] disabled:opacity-45"
                >
                  {isDimensionMode
                    ? 'W+0.25'
                    : '+0.25'}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {gameState === 'success' ? (
                  <button
                    onClick={proceed}
                    className="ui-button-success col-span-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em]"
                  >
                    Next project <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <PrimaryButton
                    onClick={verifyScale}
                    disabled={gameState !== 'playing'}
                    className="col-span-2"
                  >
                    <Ruler className="h-4 w-4" />
                    Check Scale
                  </PrimaryButton>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`absolute bottom-[calc(env(safe-area-inset-bottom)+4.6rem)] left-1/2 z-20 -translate-x-1/2 rounded-full border px-5 py-2 shadow-2xl ${
                  feedback.type === 'success'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                    : 'border-rose-500/50 bg-rose-500/10 text-amber-100'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-[0.12em] md:text-xs">{feedback.message}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {gameState === 'complete' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/86 p-6 text-center backdrop-blur-sm"
              >
                <div className="w-full max-w-md rounded-[1.6rem] border border-white/20 bg-[linear-gradient(180deg,rgba(30,64,175,0.92),rgba(15,23,42,0.94))] p-6 shadow-[0_20px_40px_rgba(2,6,23,0.5)]">
                  <Trophy className="mx-auto mb-5 h-14 w-14 text-yellow-300" />
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white">Island Restored</h2>
                  <p className="mt-3 text-sm font-bold text-cyan-100/88">All damaged structures have been rebuilt.</p>

                  <div className="relative mx-auto mt-5 h-14 w-full max-w-[15rem] overflow-hidden rounded-[0.95rem]">
                    <img src={labelGreenLongAsset} alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />
                    <div className="absolute inset-0 flex items-center justify-center text-lg font-black tracking-wide text-emerald-950">
                      XP {Math.round(finalScore)}
                    </div>
                  </div>

                  <div className="mt-3 text-sm font-black text-yellow-200">Stars {starRating}</div>

                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      onClick={finishAndContinue}
                      className="ui-button-success inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2 text-sm font-black uppercase tracking-[0.14em]"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
                        restartProject();
                      }}
                      className="ui-button-secondary inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2 text-sm font-black uppercase tracking-[0.14em]"
                    >
                      New Project
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

      </div>
    </GameScreenShell>
  );
};

export default ScaleBuilderGame;



