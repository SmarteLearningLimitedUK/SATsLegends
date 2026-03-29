import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Layers,
  Maximize2,
  RotateCcw,
  Ruler,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GameplayHUD from '../components/GameplayHUD';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import MiniGameTopBar from '../components/MiniGameTopBar';
import GameActionDock from '../components/GameActionDock';
import { AVATARS } from '../constants';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';
import labelGreenLongAsset from '../assets/licensed/slices/label_green_long.png';
import buttonYellowPlankAsset from '../assets/licensed/slices/button_yellow_plank.png';

interface ScaleBuilderGameProps {
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
    shape: { type: 'rect', baseWidth: 60, baseHeight: 40 },
    targetScale: 2.0,
    instructions: 'Scale the foundation to exactly 2.0x its original size.',
  },
  {
    id: 2,
    name: 'Compact Living',
    shape: { type: 'rect', baseWidth: 100, baseHeight: 80 },
    targetScale: 0.5,
    instructions: 'Shrink the living area to exactly 0.5x for a compact design.',
  },
  {
    id: 3,
    name: 'The Gable',
    shape: { type: 'triangle', baseWidth: 80, baseHeight: 60 },
    targetScale: 1.5,
    instructions: 'Expand the roof gable to a 1.5x scale factor.',
  },
  {
    id: 4,
    name: 'The Corner Office',
    shape: { type: 'l-shape', baseWidth: 80, baseHeight: 80 },
    targetScale: 1.25,
    instructions: 'Scale the corner office by 1.25x for more desk space.',
  },
  {
    id: 5,
    name: 'The Grand Hall',
    shape: { type: 'rect', baseWidth: 40, baseHeight: 120 },
    targetScale: 2.25,
    instructions: 'Final challenge: scale the grand hall to exactly 2.25x.',
  },
];

const GRID_SIZE = 20;

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
  scale: number;
  strokeClass: string;
  isBase?: boolean;
}> = ({ shape, scale, strokeClass, isBase = false }) => {
  const width = shape.baseWidth * scale;
  const height = shape.baseHeight * scale;

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
        {!isBase ? (
          <>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black tracking-wide text-yellow-100 drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]">
              {width.toFixed(1)} units
            </div>
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[10px] font-black tracking-wide text-yellow-100 drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]">
              {height.toFixed(1)} units
            </div>
          </>
        ) : null}
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
            className={strokeClass.replace('border-', 'text-')}
          />
        </svg>
        {!isBase ? (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black tracking-wide text-yellow-100 drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]">
            {width.toFixed(1)} units
          </div>
        ) : null}
      </div>
    );
  }

  const thickness = 30 * scale;
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
          className={strokeClass.replace('border-', 'text-')}
        />
      </svg>
      {!isBase ? (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black tracking-wide text-yellow-100 drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]">
          {width.toFixed(1)} units
        </div>
      ) : null}
    </div>
  );
};

const ScaleBuilderGame: React.FC<ScaleBuilderGameProps> = ({
  levelId,
  avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [currentScale, setCurrentScale] = useState(1.0);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showBase, setShowBase] = useState(true);
  const [mistakeCount, setMistakeCount] = useState(0);

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

  const progressPct = useMemo(() => ((currentLevelIdx + (gameState === 'complete' ? 1 : 0)) / LEVELS.length) * 100, [currentLevelIdx, gameState]);

  const verifyScale = () => {
    const difference = Math.abs(currentScale - currentLevel.targetScale);
    if (difference < 0.01) {
      setFeedback({ type: 'success', message: 'Perfect scale. Structure integrity verified.' });
      setGameState('success');
      return;
    }

    const direction = currentScale < currentLevel.targetScale ? 'larger' : 'smaller';
    setFeedback({ type: 'error', message: `Inaccurate scale. Try making it slightly ${direction}.` });
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
    setFeedback(null);
  };

  const resetLevel = () => {
    setCurrentScale(1.0);
    setFeedback(null);
  };

  const restartProject = () => {
    setCurrentLevelIdx(0);
    setCurrentScale(1.0);
    setFeedback(null);
    setGameState('playing');
    setMistakeCount(0);
  };

  useEffect(() => {
    setCurrentLevelIdx(0);
    setCurrentScale(1.0);
    setFeedback(null);
    setGameState('playing');
  }, []);

  const finishAndContinue = () => {
    onVictory(starRating, finalScore);
  };

  return (
    <GameScreenShell className="overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
      <GameplaySceneBackdrop gameType="scale_safari" />

      {!useSharedTopHud ? (
        <MiniGameTopBar
          onBack={onBack}
          XP={Math.round(finalScore)}
          scoreLabel="Build"
          metaLabel="Level"
          metaValue={`${currentLevelIdx + 1}/${LEVELS.length}`}
        />
      ) : null}

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col gap-2 px-2 pb-1 pt-[max(3.6rem,calc(env(safe-area-inset-top)+2.9rem))] md:gap-3 md:px-3">
        <div className="mx-auto w-full max-w-6xl">
          <GameplayHUD
            title="Scale Builder"
            avatar={avatar}
            XP={Math.round(finalScore)}
            targetScore={900 + (LEVELS.length * 220) + (levelId * 60)}
            timeLeft={LEVELS.length - currentLevelIdx}
            progress={progressPct}
            compact
            accentText="text-sky-950"
            accentSoftBg="bg-sky-100/84"
            accentBorder="border-sky-200/88"
            progressBar="bg-gradient-to-r from-sky-300 via-cyan-300 to-yellow-300"
            statLabel="Mistakes"
            statValue={mistakeCount}
          />
        </div>

        <PuzzleStage className="mx-auto w-full max-w-6xl rounded-[2.1rem] md:rounded-[2.5rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_24%,rgba(15,23,42,0.24)_100%)]" />

          <div className="relative z-10 flex h-full min-h-0 w-full flex-col gap-2 p-2 md:gap-3 md:p-3">
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2">
              <div className="mb-1 grid grid-cols-1 gap-2 rounded-[1rem] border border-white/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.84))] p-2 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/80">Current phase</div>
                  <div className="truncate text-sm font-black text-white md:text-base">{currentLevel.name}</div>
                </div>
                <div className="rounded-xl border border-yellow-200/28 bg-yellow-500/10 px-2 py-1 text-center">
                  <div className="text-[9px] font-black uppercase tracking-[0.12em] text-yellow-100/80">Target</div>
                  <div className="text-lg font-black text-yellow-200">{currentLevel.targetScale.toFixed(2)}x</div>
                </div>
                <div className="rounded-xl border border-sky-200/26 bg-sky-500/10 px-2 py-1 text-center">
                  <div className="text-[9px] font-black uppercase tracking-[0.12em] text-sky-100/80">Current</div>
                  <div className={`text-lg font-black ${gameState === 'success' ? 'text-emerald-300' : 'text-sky-200'}`}>
                    {currentScale.toFixed(2)}x
                  </div>
                </div>
              </div>

              <div className="relative min-h-[20rem] overflow-hidden rounded-[1.4rem] border border-white/14 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.22),rgba(15,23,42,0.84)_68%)] p-2 md:min-h-[25rem] md:p-3">
                <BlueprintGrid />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.14),rgba(15,23,42,0.12)_62%)]" />
                <div className="relative z-10 flex h-full w-full items-center justify-center">
                  <div className="relative flex h-[min(64vh,30rem)] w-[min(90vw,30rem)] items-center justify-center rounded-full border border-sky-100/18 bg-[radial-gradient(circle,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_54%,transparent_100%)]">
                    <AnimatePresence>
                      {showBase ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.35 }}
                          exit={{ opacity: 0 }}
                          className="absolute"
                        >
                          <ShapeRenderer
                            shape={currentLevel.shape}
                            scale={1.0}
                            strokeClass="border-slate-300 border-dashed"
                            isBase
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <ShapeRenderer
                      shape={currentLevel.shape}
                      scale={currentScale}
                      strokeClass={
                        gameState === 'success'
                          ? 'border-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.36)]'
                          : 'border-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.3)]'
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-white/16 bg-[linear-gradient(180deg,rgba(2,132,199,0.24),rgba(15,23,42,0.86))] p-2 md:p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/82">
                  <Maximize2 className="h-4 w-4" />
                  Precision nudges
                </div>
                <button
                  onClick={() => setShowBase((previous) => !previous)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
                    showBase
                      ? 'border-cyan-200/45 bg-cyan-500/14 text-cyan-100'
                      : 'border-white/18 bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  {showBase ? 'Hide reference' : 'Show reference'}
                </button>
                <button
                  onClick={resetLevel}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-[linear-gradient(180deg,#1e3a8a,#1e293b)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white hover:bg-[linear-gradient(180deg,#2563eb,#334155)]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <div className="flex-1">
                  <input
                    type="range"
                    min="0.1"
                    max="4.0"
                    step="0.01"
                    value={currentScale}
                    onChange={(event) => {
                      setCurrentScale(parseFloat(event.target.value));
                      setFeedback(null);
                    }}
                    disabled={gameState !== 'playing'}
                    className="h-3 w-full cursor-pointer appearance-none rounded-full border border-sky-200/35 bg-sky-950 accent-yellow-300 disabled:cursor-not-allowed disabled:opacity-55"
                  />
                  <div className="mt-1 flex justify-between text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/78">
                    <span>0.10x</span>
                    <span>2.00x</span>
                    <span>4.00x</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 md:w-[15rem]">
                  {[
                    { label: '-0.10', delta: -0.1 },
                    { label: '+0.10', delta: 0.1 },
                    { label: '-0.01', delta: -0.01 },
                    { label: '+0.01', delta: 0.01 },
                  ].map((control) => (
                    <button
                      key={control.label}
                      onClick={() => adjustScale(control.delta)}
                      disabled={gameState !== 'playing'}
                      className="rounded-lg border border-white/20 bg-[linear-gradient(180deg,#1e3a8a,#1e293b)] px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-[linear-gradient(180deg,#2563eb,#334155)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {control.label}
                    </button>
                  ))}
                </div>

                {gameState === 'success' ? (
                  <button
                    onClick={proceed}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-100/40 bg-[linear-gradient(180deg,#34d399,#10b981)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-950 shadow-[0_10px_18px_rgba(5,150,105,0.36)]"
                  >
                    Next project <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={verifyScale}
                    disabled={gameState !== 'playing'}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-yellow-100/40 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_10px_18px_rgba(180,83,9,0.32)] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      backgroundImage: `url(${buttonYellowPlankAsset})`,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    <Ruler className="h-4 w-4" />
                    Verify scale
                  </button>
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
                className={`absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full border px-5 py-2 shadow-2xl md:bottom-24 ${
                  feedback.type === 'success'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                    : 'border-rose-500/50 bg-rose-500/10 text-rose-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] md:text-xs">{feedback.message}</span>
                </div>
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
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white">Architect Certified</h2>
                  <p className="mt-3 text-sm font-bold text-cyan-100/88">All structures scaled with precision.</p>

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
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-100/40 bg-[linear-gradient(180deg,#34d399,#10b981)] px-5 py-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-950"
                    >
                      Continue
                    </button>
                    <button
                      onClick={restartProject}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/22 bg-[linear-gradient(180deg,#1e3a8a,#1e293b)] px-5 py-2 text-sm font-black uppercase tracking-[0.14em] text-white"
                    >
                      New Project
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </PuzzleStage>

        <div className="mx-auto w-full max-w-6xl">
          <GameActionDock onBack={onBack} compact />
        </div>
      </div>
    </GameScreenShell>
  );
};

export default ScaleBuilderGame;
