import PictogramBoard from '../components/game-ui/PictogramBoard';
import RevisionActivityPresentation from '../components/game-ui/RevisionActivityPresentation';
import SatsAnswerFields from '../components/game-ui/SatsAnswerFields';
import SatsRevisionGapConstruction from '../components/game-ui/SatsRevisionGapConstruction';
import { PrimaryActionCTA } from '../layout/ScreenPrimitives';
import { validateAnswerEntry } from '../systems/content/answerEntry';
import { buildPictogramQuestion, type PictogramQuestion } from '../systems/content/pictogramQuestions';
import { markMission } from '../systems/content/satsAdventure';
import { questionMetadata } from '../systems/learning/questionMetadata';
import { shuffle } from '../utils/questionShuffle';
import {isUntimedRevision} from '../systems/learning/sessionPolicy';
import {isRelaxedRevision} from '../systems/learning/sessionPolicy';
import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import graphGrabberBackground from '../assets/graph-grabber/matharia/bg_acropolis_landscape.png';
import dockCrane from '../assets/game-visions/graph-grabber/dock-crane-v1.png';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import SceneEnvironment from '../components/SceneEnvironment';
import './graph-grabber.css';
import { buildShipmentRound } from '../systems/content/shipmentQuestions';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';

interface GraphGrabberGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  isPractice?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface BarDatum {
  label: string;
  value: number;
  color: string;
}

interface RoundOption {
  id: string;
  label: string;
}

interface ChartRound {
  id: string;
  kind: 'bar';
  answerMode: 'single';
  title: string;
  prompt: string;
  support: string;
  chartCaption: string;
  xLabel: string;
  yLabel: string;
  bars: BarDatum[];
  options: RoundOption[];
  correctAnswers: string[];
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 4, 5, 5, 6, 7];
const SHIPMENT_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#e879f9'];

const buildRound = (levelId: number, roundIndex: number): ChartRound => buildShipmentRound(levelId, roundIndex);

type GraphRound = ChartRound | { kind: 'pictogram'; id: string; support: string; question: PictogramQuestion };
type GraphFeedback = { type: 'success' | 'error'; title: string; subtitle: string };

function buildGraphRun(levelId: number, total: number): GraphRound[] {
  // Shuffle a balanced mix so even the shortest level practises both formats.
  const offset = Math.random() < .5 ? 0 : 1;
  const formats = shuffle(Array.from({ length: total }, (_, index): GraphRound['kind'] => (index + offset) % 2 === 0 ? 'bar' : 'pictogram'));
  // Existing preview links still open on their requested format, then use the same mixed run.
  const previewMode = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('mode');
  const first = previewMode === 'bars' ? 'bar' : previewMode === 'pictogram' ? 'pictogram' : null;
  if (first) {
    const index = formats.indexOf(first);
    if (index > 0) [formats[0], formats[index]] = [formats[index], formats[0]];
  }
  const seed = Math.floor(Math.random() * 1_000_000);
  let barIndex = 0;
  let pictogramIndex = 0;
  return formats.map((format, index) => {
    if (format === 'bar') return buildRound(levelId, barIndex++);
    return {
      kind: 'pictogram', id: `pictogram-${levelId}-${index}`,
      support: 'Use the counts and symbol key to interpret the pictogram.',
      question: buildPictogramQuestion(levelId, seed, pictogramIndex++),
    };
  });
}

function PictogramRound({ round, position, total, score, time, hearts, paused, intro, feedback, onSubmit }: {
  key?: string;
  round: Extract<GraphRound, { kind: 'pictogram' }>;
  position: number; total: number; score: number; time: number; hearts: number; paused: boolean;
  intro: React.ReactNode; feedback: GraphFeedback | null; onSubmit: (value: string) => void;
}) {
  const { mission, model, build, initialValue } = round.question;
  const [value, setValue] = useState(build ? initialValue : '');
  const [notice, setNotice] = useState('');
  const [padOpen, setPadOpen] = useState(false);
  const symbols = (build ? value : initialValue).split(':').slice(1).map(part => /^\d+$/.test(part) ? Number(part) : null);
  const change = (next: string) => {
    setValue(next);
    setNotice('');
  };
  const check = () => {
    if (build) {
      if (!/^pictogram:\d+:\d+:\d+$/.test(value)) {
        setNotice('Complete all three rows before checking.');
        return;
      }
      onSubmit(value);
      return;
    }
    const entry = validateAnswerEntry(value, { kind: 'number' });
    if (entry.ok === false) {
      setNotice(entry.message);
      return;
    }
    onSubmit(entry.value);
  };
  const controls = feedback ? (
    <div role="status" aria-live="polite" data-activity-result={feedback.type === 'success' ? 'correct' : 'incorrect'}>
      <p>{feedback.type === 'success' ? `Correct. ${feedback.subtitle}` : feedback.subtitle}</p>
    </div>
  ) : (
    <>
      {build ? <SatsRevisionGapConstruction model={model} value={value} onChange={change} part="controls" compact/>
        : <SatsAnswerFields mission={mission} values={[value]} compactPad onChange={change} onPadOpenChange={setPadOpen}/>}
      <div data-activity-check><PrimaryActionCTA disabled={paused || padOpen || !value} onClick={check}>{build ? 'Check build' : 'Check answer'}</PrimaryActionCTA></div>
      {notice && <p role="alert">{notice}</p>}
    </>
  );
  return <RevisionActivityPresentation id={round.id} title="Pictogram" prompt={mission.prompt} hint={round.support}
    board={<PictogramBoard model={model} showTargets={build} symbols={symbols}/>} controls={controls} intro={intro}
    paused={paused || padOpen} round={position} total={total} score={score} time={time} hearts={hearts}/>;
}

const GraphBoard: React.FC<{ round: ChartRound; difficulty: number }> = ({ round, difficulty }) => {
  const crateId = useId().replaceAll(':', '');
  const [inspected, setInspected] = useState<string | null>(null);
  const [compactChart,setCompactChart]=useState(()=>window.matchMedia('(max-height:650px)').matches);
  useEffect(()=>{const query=window.matchMedia('(max-height:650px)');const sync=()=>setCompactChart(query.matches);query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[]);
  useEffect(()=>setInspected(null),[round.id]);
  const values = round.bars.map((point) => point.value);
  const tickStep = [1, 2, 5, 10, 20][Math.max(0, Math.min(4, difficulty - 1))];
  const axisMax = Math.ceil(Math.max(...values) / tickStep) * tickStep;
  const axisTicks = Array.from({ length: axisMax / tickStep + 1 }, (_, index) => index * tickStep);
  const visibleTicks = compactChart ? axisTicks.filter((_, index) => index % Math.max(1, Math.ceil((axisTicks.length - 1) / 5)) === 0 || index === axisTicks.length - 1) : axisTicks;
  return (
    <div className="flex h-full min-h-0 flex-col rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(9,19,42,0.5),rgba(7,14,32,0.66))] p-1.5 shadow-[0_14px_24px_rgba(2,6,23,0.16)]">
      <div className="graph-grabber-chart-caption"><span>{round.chartCaption}</span></div>
      <div className="graph-grabber-cartesian-chart mt-1.5 h-[clamp(11rem,26vh,15.5rem)] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={round.bars!} margin={compactChart ? { top: 12, right: 8, left: 26, bottom: 8 } : { top: 30, right: 16, left: 40, bottom: 12 }}>
            <defs><linearGradient id={`${crateId}-wood`} x2="1" y2="1"><stop stopColor="#e2ac64"/><stop offset=".48" stopColor="#b97635"/><stop offset="1" stopColor="#96551e"/></linearGradient></defs>
            <CartesianGrid stroke="rgba(255,255,255,0.16)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              type="category"
              height={0}
              tick={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
              tickLine={false}
            />
            <YAxis
              type="number"
              domain={[0, axisMax]}
              ticks={visibleTicks}
              width={compactChart?28:60}
              interval={0}
              tick={{ fill: '#fff8ec', fontSize: 17, fontWeight: 800 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
              tickLine={false}
              label={compactChart?undefined:{ value: round.yLabel, angle: -90, position: 'insideLeft', fill: '#fff8ec', fontSize: 17, fontWeight: 800 } as never}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.08)' }}
              contentStyle={{ background: 'rgba(8,15,32,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: '#fff8ec' }}
            />
            {inspected&&<ReferenceLine y={round.bars.find(bar=>bar.label===inspected)?.value} stroke="#fff3ae" strokeWidth={2} strokeDasharray="6 4" />}
            <Bar dataKey="value" shape={(raw: unknown) => {
              const {x=0,y=0,width=0,height=0,payload,opacity=1}=raw as {x?:number;y?:number;width?:number;height?:number;payload?:BarDatum;opacity?:number};
              // One drawn crate represents one tick interval, so larger deliveries
              // retain the same readable stack instead of hundreds of tiny squares.
              const count=Math.max(1,Math.round((payload?.value??tickStep)/tickStep));
              return <g opacity={opacity} data-crate-bar={payload?.label} data-crate-value={payload?.value}>{Array.from({length:count},(_,i)=>{
                const unitWidth=width,unitHeight=height/count;
                const side=Math.min(unitWidth,unitHeight);
                const w=side,h=side;
                const left=x+(unitWidth-side)/2,top=y+i*unitHeight+(unitHeight-side)/2;
                return <g key={i}><rect x={left+.5} y={top+.5} width={Math.max(0,w-1)} height={Math.max(0,h-1)} rx={1} fill={`url(#${crateId}-wood)`} stroke="#663c1c" strokeWidth={1}/><rect x={left+2} y={top+2} width={Math.max(0,w-4)} height={Math.max(0,h-4)} fill="none" stroke="#ffdb96" strokeWidth={.7}/><path d={`M${left+3} ${top+3}L${left+w-3} ${top+h-3}M${left+w-3} ${top+3}L${left+3} ${top+h-3}`} stroke="#603c20" strokeWidth={Math.max(1,w*.09)}/><path d={`M${left+3} ${top+2}L${left+w-2} ${top+h-3}`} stroke="#f2c583" strokeWidth={Math.max(.5,w*.035)}/></g>;
              })}</g>;
            }} onClick={(_,index)=>{const bar=round.bars?.[index];if(bar)setInspected(inspected===bar.label?null:bar.label);}}>
              {round.bars!.map((bar) => (
                <Cell key={bar.label} fill={bar.color} opacity={!inspected||inspected===bar.label?1:.45} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="graph-shipment-tabs" aria-label="Trace a shipment on the chart">{round.bars.map(bar=><button key={bar.label} type="button" aria-pressed={inspected===bar.label} onClick={()=>setInspected(inspected===bar.label?null:bar.label)}><span className="graph-ship-name">{bar.label}</span></button>)}</div>
    </div>
  );

};

const GraphGrabberGame: React.FC<GraphGrabberGameProps> = ({
  levelId,
  avatarId: _avatarId,
  isPractice,
  practiceBriefing,
  sessionState,
  sessionEvents,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const totalRounds = ROUND_GOAL_BY_LEVEL[levelId] || 5;
  const targetScore = totalRounds * 155 + 12 * totalRounds * (totalRounds - 1);
  const timeoutsRef = useRef<number[]>([]);

  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(84 + (levelId * 8));
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [roundNumber, setRoundNumber] = useState(1);
  const [Combo, setStreak] = useState(0);
  const [rounds, setRounds] = useState(() => buildGraphRun(levelId, totalRounds));
  const [feedback, setFeedback] = useState<GraphFeedback | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [isLocked, setIsLocked] = useState(false);
  const answerLocked = useRef(false);
  const pictogramRevealed = useRef(false);
  const round = rounds[roundNumber - 1];

  const progress = Math.min((XP / targetScore) * 100, 100);

  const clearTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setScore(0);
    setTimeLeft(84 + (levelId * 8));
    setHearts(MAX_HEARTS);
    setRoundNumber(1);
    setStreak(0);
    setRounds(buildGraphRun(levelId, totalRounds));
    setFeedback(null);
    setIsFinished(false);
    setShowPracticeIntro(Boolean(isPractice));
    setIsLocked(false);
    answerLocked.current = false;
    pictogramRevealed.current = false;
  }, [isPractice, levelId, totalRounds]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => {
    if (isPractice || isFinished || isUntimedRevision(sessionState)) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          setIsFinished(true);
          onGameOver(XP);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [XP, isFinished, isPractice, onGameOver, sessionState?.untimed]);

  const finishVictory = (finalScore: number) => {
    if (isFinished) return;
    setIsFinished(true);
    const stars = finalScore >= targetScore * .9 && hearts >= 3
      ? 3
      : finalScore >= targetScore && hearts >= 2
        ? 2
        : 1;
    confetti({
      particleCount: 165,
      spread: 70,
      origin: { y: 0.62 },
      colors: ['#fcd34d', '#ffffff', '#60a5fa', '#34d399'],
    });
    onVictory(stars, finalScore);
  };

  const nextRound = (updatedScore: number) => {
    if (roundNumber >= totalRounds) {
      finishVictory(updatedScore);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      const nextRoundNumber = roundNumber + 1;
      setRoundNumber(nextRoundNumber);
      setFeedback(null);
      setIsLocked(false);
      answerLocked.current = false;
      pictogramRevealed.current = false;
    }, 1150);
    timeoutsRef.current.push(timeoutId);
  };

  const loseHeart = (subtitle: string) => {
    if (feedback || isFinished) return;
    const nextHearts = isPractice||isRelaxedRevision(sessionState) ? hearts : hearts - 1;
    if (!isPractice) setHearts(nextHearts);
    setStreak(0);
    setFeedback({ type: 'error', title: isPractice ? 'Try that again' : 'Not quite', subtitle });
    setIsLocked(true);
    if (nextHearts <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(XP);
      }, 950);
      timeoutsRef.current.push(timeoutId);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
      setIsLocked(false);
      answerLocked.current = false;
    }, 950);
    timeoutsRef.current.push(timeoutId);
  };

  const submitAnswer = (value: string) => {
    if (feedback || isFinished || isLocked || answerLocked.current || sessionState?.paused || showPracticeIntro) return;
    answerLocked.current = true;
    setIsLocked(true);

    const metadata: Record<string, unknown> = { round: roundNumber, chart: round.kind };
    let isCorrect: boolean;
    if (round.kind === 'bar') {
      isCorrect = round.correctAnswers.includes(value);
    } else {
      const { mission, build } = round.question;
      isCorrect = markMission(mission, [value]) === mission.marks;
      Object.assign(metadata, questionMetadata('graph_grabber', 'statistics.pictogram', mission,
        build ? 'construction' : 'numeric', [mission.reference]), {
        familyId: mission.id, answerRevealed: pictogramRevealed.current,
      });
      if (!isCorrect) pictogramRevealed.current = true;
    }

    if (!isCorrect) {
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { metadata });
      loseHeart(round.kind === 'pictogram' ? round.question.mission.explanation : round.support);
      return;
    }

    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { metadata });

    const points = 155 + (Combo * 24);
    const updatedScore = XP + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({ type: 'success', title: 'Graph secured', subtitle: `+${points} XP` });
    confetti({
      particleCount: 42,
      spread: 48,
      origin: { y: 0.72 },
      colors: ['#fcd34d', '#ffffff', '#60a5fa'],
    });
    nextRound(updatedScore);
  };

  const handleOptionClick = (choice: RoundOption) => {
    submitAnswer(choice.id);
  };

  const intro = <PracticeIntroPopup
    open={showPracticeIntro}
    title="Graph Grabber"
    body="The Monster Minds have hijacked the supply records.\nRead each bar chart or pictogram to recover them.\nCheck the axis or symbol key before answering."
    briefing={practiceBriefing}
    onAction={() => setShowPracticeIntro(false)}
  />;

  if (round.kind === 'pictogram') {
    return <PictogramRound key={round.id} round={round} position={roundNumber} total={totalRounds}
      score={XP} time={timeLeft} hearts={hearts} paused={Boolean(sessionState?.paused) || showPracticeIntro || isFinished}
      intro={intro} feedback={feedback} onSubmit={submitAnswer}/>;
  }

  return (
    <div data-graph-round={round.id} data-graph-result={feedback?.type ?? 'idle'} className="graph-grabber-game relative flex h-full w-full flex-col overflow-hidden bg-transparent select-none text-slate-100">
      <SceneEnvironment src={graphGrabberBackground} />
      <div className="graph-dock-crane" aria-hidden="true" data-dock-paused={Boolean(sessionState?.paused) || showPracticeIntro}>
        <img src={dockCrane} alt="" draggable={false} />
        <svg className="graph-dock-cargo" viewBox="0 0 80 80"><rect x="4" y="4" width="72" height="72" rx="4" fill="#b77839" stroke="#5e3b24" strokeWidth="5"/><path d="M9 9L71 71M71 9L9 71" stroke="#69401f" strokeWidth="7"/><path d="M13 10H67V70H13Z" fill="none" stroke="#e9bd77" strokeWidth="3"/></svg>
      </div>
      {intro}

      <div className="graph-grabber-content relative z-10 flex h-full min-h-0 w-full flex-1 flex-col px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+0.65rem)] md:pt-3">
        <div className="graph-grabber-spacer flex flex-1" />

        <div className="graph-grabber-stack mx-auto flex w-full max-w-[56rem] flex-col gap-1.5 md:gap-2">
          <GameQuestionCard
            title={round.title}
            className="w-full !mb-0"
            style={{
              ['--question-card-width' as any]: 'min(100%, 56rem)',
              ['--question-card-padding' as any]: '8px 10px',
              position: 'relative',
              top: 'auto',
              left: 'auto',
              right: 'auto',
              transform: 'none',
              width: '100%',
            }}
          >
            {round.prompt}
          </GameQuestionCard>

          <div className="graph-grabber-board min-h-0">
            <GraphBoard round={round} difficulty={levelId} />
          </div>

          <section className="graph-grabber-answers rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(10,17,37,0.76))] p-2 shadow-[0_14px_24px_rgba(2,6,23,0.16)] md:p-2.5" data-answer-mode={round.answerMode}>
            <div className="graph-grabber-hint mb-1.5 flex items-center justify-start gap-2 text-[12px] font-black uppercase tracking-[0.18em] text-amber-100/70">
              <span>{round.support}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {round.options.map((choice) => {
                const isCorrect = feedback?.type === 'success' && round.correctAnswers.includes(choice.id);
                return (
                  <motion.button
                    key={choice.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleOptionClick(choice)}
                    disabled={feedback !== null || isFinished}
                    className={[
                      'rounded-[0.95rem] px-3 py-2.5 text-center text-base md:text-lg font-black transition disabled:opacity-45',
                      isCorrect
                        ? 'ui-button-success'
                        : 'ui-button-secondary',
                    ].join(' ')}
                  >
                    {choice.label}
                  </motion.button>
                );
              })}
            </div>
          </section>
        </div>

        <AnimatePresence mode="wait">
          {feedback ? (
            <motion.div
              key={`${feedback.type}-${feedback.title}-${feedback.subtitle}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`pointer-events-none flex justify-center text-center ${feedback.type === 'success' ? 'text-emerald-100' : 'text-amber-100'}`}
            >
              <div className="rounded-full border border-white/12 bg-slate-950/40 px-4 py-1.5 text-sm font-black uppercase tracking-[0.14em] shadow-[0_10px_18px_rgba(0,0,0,0.2)]">
                <div>{feedback.title}</div>
                <div className="mt-0.5 text-[13px] font-semibold normal-case tracking-normal text-white/92">
                  {feedback.subtitle}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default GraphGrabberGame;
