import shipmentBoat from '../assets/boats/1.png';
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
import graphGrabberBackground from '../assets/maps/premium/graph-grabber.webp';
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

const normalize = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

const matchesAnswer = (selected: string[], expected: string[]) => {
  const left = normalize(selected);
  const right = normalize(expected);
  return left.length === right.length && left.every((value, index) => value === right[index]);
};

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
      <div className="graph-grabber-chart-caption flex items-center justify-center px-1 text-[12px] font-black uppercase tracking-[0.18em] text-amber-100/75">
        {round.chartCaption}
      </div>
      <div className="graph-grabber-cartesian-chart mt-1.5 h-[clamp(11rem,26vh,15.5rem)] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={round.bars!} margin={compactChart ? { top: 4, right: 8, left: -8, bottom: 0 } : { top: 18, right: 16, left: 10, bottom: 12 }}>
            <defs><linearGradient id={`${crateId}-wood`} x2="1" y2="1"><stop stopColor="#e2ac64"/><stop offset=".48" stopColor="#b97635"/><stop offset="1" stopColor="#96551e"/></linearGradient></defs>
            <CartesianGrid stroke="rgba(255,255,255,0.16)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              type="category"
              interval={0}
              height={compactChart ? 24 : 30}
              tick={{ fill: '#fff8ec', fontSize: 17, fontWeight: 800 }}
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
      <div className="graph-shipment-tabs" aria-label="Trace a shipment on the chart">{round.bars.map(bar=><button key={bar.label} type="button" aria-pressed={inspected===bar.label} onClick={()=>setInspected(inspected===bar.label?null:bar.label)}><img src={shipmentBoat} alt="" draggable={false} />{bar.label}</button>)}</div>
    </div>
  );

};

const GraphGrabberGame: React.FC<GraphGrabberGameProps> = ({
  levelId,
  avatarId: _avatarId,
  isPractice,
  practiceBriefing,
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
  const [round, setRound] = useState<ChartRound>(() => buildRound(levelId, 0));
  const [feedback, setFeedback] = useState<null | { type: 'success' | 'error'; title: string; subtitle: string }>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [isLocked, setIsLocked] = useState(false);

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
    setRound(buildRound(levelId, 0));
    setFeedback(null);
    setIsFinished(false);
    setShowPracticeIntro(Boolean(isPractice));
    setIsLocked(false);
  }, [isPractice, levelId]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => {
    if (isPractice || isFinished) return undefined;
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
  }, [XP, isFinished, isPractice, onGameOver]);

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
      setRound(buildRound(levelId, nextRoundNumber - 1));
      setFeedback(null);
      setIsLocked(false);
    }, 1150);
    timeoutsRef.current.push(timeoutId);
  };

  const loseHeart = (subtitle: string) => {
    if (feedback || isFinished) return;
    const nextHearts = isPractice ? hearts : hearts - 1;
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
    }, 950);
    timeoutsRef.current.push(timeoutId);
  };

  const submitAnswer = (selection: string[]) => {
    if (feedback || isFinished || isLocked) return;
    setIsLocked(true);

    const normalizedSelected = normalize(selection);
    const normalizedExpected = normalize(round.correctAnswers);
    const isCorrect = matchesAnswer(normalizedSelected, normalizedExpected);

    if (!isCorrect) {
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { metadata: { round: roundNumber, chart: round.kind } });
      loseHeart(round.support);
      return;
    }

    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { metadata: { round: roundNumber, chart: round.kind } });

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
    if (isLocked || feedback || isFinished) return;
    submitAnswer([choice.id]);
  };

  return (
    <div data-graph-round={round.id} className="graph-grabber-game relative flex h-full w-full flex-col overflow-hidden bg-transparent select-none text-slate-100">
      <SceneEnvironment src={graphGrabberBackground} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,32,0.14),rgba(8,15,32,0.24))]" aria-hidden="true" />
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Graph Grabber"
        body="The Monster Minds have hijacked the supply graph.\nRead the graph and grab the correct answer.\nCheck the axes and labels carefully."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

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
