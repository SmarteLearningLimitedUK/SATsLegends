/** @license SPDX-License-Identifier: Apache-2.0 */
import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { RotateCcw, Plus, Minus } from 'lucide-react';
import missionBackground from '../assets/maps/premium/chrono-dash.webp';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import './game-refinements.css';

interface ChronoDashGameProps extends MiniGameShellContractProps {
  levelId: number; avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void; onBack: () => void;
}
interface Time { hours: number; minutes: number; }
const ROUND_DURATION_SECONDS = 90;
const scoreToStars = (XP: number) => XP >= 1800 ? 3 : XP >= 1100 ? 2 : 1;
const displayTime = (time: Time) => `${String(time.hours).padStart(2,'0')}:${String(time.minutes).padStart(2,'0')}`;
const CLOCK_NUMBERS = ['12','1','2','3','4','5','6','7','8','9','10','11'];

const ChronoDashGame: React.FC<ChronoDashGameProps> = ({ levelId, avatarId: _avatarId, onVictory, onGameOver: _onGameOver, onBack: _onBack, sessionState, sessionEvents }) => {
  const tier = Math.max(1, Math.min(5, levelId));
  const minuteStep = tier === 5 ? 1 : 5;
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent); presentRef.current = isPresent;
  const pausedRef = useRef(Boolean(sessionState?.paused)); pausedRef.current = Boolean(sessionState?.paused);
  const [gameState, setGameState] = useState<'playing'|'complete'>('playing');
  const [targetTime, setTargetTime] = useState<Time>({ hours: 10, minutes: 0 });
  const [currentTime, setCurrentTime] = useState<Time>({ hours: 12, minutes: 0 });
  const [rotationHours, setRotationHours] = useState(360);
  const [rotationMinutes, setRotationMinutes] = useState(0);
  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [feedback, setFeedback] = useState<string|null>(null);
  const [resolving, setResolving] = useState(false);
  const finishedRef = useRef(false);
  const answerLockRef = useRef(false);
  const feedbackTimerRef = useRef<number|null>(null);
  const scoreRef = useRef(XP); scoreRef.current = XP;
  const victoryRef = useRef(onVictory); victoryRef.current = onVictory;
  const correctCountRef = useRef(0);
  const clearFeedbackTimer = () => { if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null; };
  const generateRandomTime = useCallback((): Time => {
    const hours = Math.floor(Math.random()*12)+1;
    const choices = tier === 1 ? [0] : tier === 2 ? [0,30] : tier === 3 ? [0,15,30,45] : null;
    const minutes = choices ? choices[Math.floor(Math.random()*choices.length)] : Math.floor(Math.random()*(tier === 4 ? 12 : 60)) * (tier === 4 ? 5 : 1);
    return {hours,minutes};
  }, [tier]);
  const loadNextQuestion = useCallback(() => {
    if (!presentRef.current || finishedRef.current) return;
    setTargetTime(generateRandomTime()); setCurrentTime({hours:12,minutes:0});
    setRotationHours(360); setRotationMinutes(0); setFeedback(null);
    answerLockRef.current = false; setResolving(false);
  }, [generateRandomTime]);
  const startGame = useCallback(() => {
    if (!presentRef.current) return;
    clearFeedbackTimer(); finishedRef.current = false; answerLockRef.current = false;
    scoreRef.current = 0; correctCountRef.current = 0; setScore(0); setTimeLeft(ROUND_DURATION_SECONDS); setGameState('playing'); loadNextQuestion();
  }, [loadNextQuestion]);
  useEffect(() => { startGame(); }, [startGame]);
  useLayoutEffect(() => {
    if (!isPresent) { finishedRef.current = true; answerLockRef.current = true; clearFeedbackTimer(); }
    return () => clearFeedbackTimer();
  }, [isPresent]);
  useEffect(() => {
    if (!isPresent || gameState !== 'playing' || sessionState?.paused) return undefined;
    const timerId = window.setInterval(() => {
      if (presentRef.current && !finishedRef.current && !pausedRef.current) setTimeLeft((previous) => Math.max(0,previous-1));
    },1000);
    return () => window.clearInterval(timerId);
  }, [gameState,isPresent,sessionState?.paused]);
  useEffect(() => {
    if (!isPresent || sessionState?.paused || gameState !== 'playing' || timeLeft > 0 || finishedRef.current) return;
    finishedRef.current = true; answerLockRef.current = true; clearFeedbackTimer();
    setGameState('complete');
    const stars = scoreToStars(scoreRef.current);
    sessionEvents?.onGameComplete?.({ score: scoreRef.current, stars });
    victoryRef.current(stars,scoreRef.current);
  }, [gameState,isPresent,sessionEvents,sessionState?.paused,timeLeft]);
  const checkTime = () => {
    if (!presentRef.current || pausedRef.current || finishedRef.current || answerLockRef.current || gameState !== 'playing' || timeLeft <= 0) return;
    clearFeedbackTimer();
    const correct = targetTime.hours % 12 === currentTime.hours % 12 && targetTime.minutes === currentTime.minutes;
    if (correct) {
      answerLockRef.current = true; setResolving(true);
      const nextScore = scoreRef.current + 100 + Math.floor(timeLeft/6);
      scoreRef.current = nextScore; setScore(nextScore); setFeedback('Time restored!');
      correctCountRef.current += 1;
      sessionEvents?.onCorrectAnswer?.({ score: nextScore, metadata: { target: displayTime(targetTime), completed: correctCountRef.current } });
      sessionEvents?.onPuzzleComplete?.({ score: nextScore, metadata: { completed: correctCountRef.current } });
      feedbackTimerRef.current = window.setTimeout(loadNextQuestion,260);
    } else {
      setFeedback('Still out of sync. Match both hands.');
      feedbackTimerRef.current = window.setTimeout(() => {
        if (presentRef.current && !finishedRef.current) setFeedback(null);
      },2000);
    }
  };
  const adjustTime = (type: 'hours'|'minutes',amount: number) => {
    if (!presentRef.current || pausedRef.current || finishedRef.current || answerLockRef.current || gameState !== 'playing') return;
    if (type === 'hours') {
      setRotationHours((previous) => previous+amount*30);
      setCurrentTime((previous) => ({...previous,hours:((previous.hours-1+amount+12)%12)+1}));
    } else {
      setRotationMinutes((previous) => previous+amount*6);
      setCurrentTime((previous) => ({...previous,minutes:(previous.minutes+amount+60)%60}));
    }
  };
  const disabled = resolving || gameState !== 'playing' || timeLeft <= 0 || Boolean(sessionState?.paused);
  return (
    <div className="chrono-game relative h-full w-full overflow-hidden bg-[#7b7c68]" data-chrono-game data-chrono-tier={tier} data-chrono-time={timeLeft}>
      <img src={missionBackground} alt="" aria-hidden="true" draggable={false} data-game-scene-image data-background-fit="contain" className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center" />
      <main className="chrono-layout">
        <GameQuestionCard title="Synchronise the clock" subtitle="Match both hands to restore time." style={{ position:'relative',top:0,transform:'none' }}>
          Set the clock to {displayTime(targetTime)}.
        </GameQuestionCard>
        <div className="chrono-playfield" data-clock-playfield>
          <div className="chrono-clock" data-clock-face data-clock-current={displayTime(currentTime)}>
            <svg viewBox="0 0 200 200" role="img" aria-label={`Clock set to ${displayTime(currentTime)}. Short cyan hour hand. Long gold minute hand.`}>
              <circle cx="100" cy="104" r="94" fill="#092632"/>
              <circle cx="100" cy="100" r="94" fill="#c69a48" stroke="#102b37" strokeWidth="5"/>
              <circle cx="100" cy="100" r="85" fill="#edf1de" stroke="#fbe6a5" strokeWidth="3"/>
              {Array.from({length:60},(_,index) => {
                const angle = index*Math.PI/30;
                const outer = 81;
                const inner = index%5 === 0 ? 72 : 77;
                return <line key={index} x1={100+Math.sin(angle)*inner} y1={100-Math.cos(angle)*inner}
                  x2={100+Math.sin(angle)*outer} y2={100-Math.cos(angle)*outer} stroke="#29444b" strokeWidth={index%5 === 0 ? 2.6 : 1}/>
              })}
              {CLOCK_NUMBERS.map((label,index) => {
                const angle=index*Math.PI/6;
                return <text key={label} x={100+Math.sin(angle)*62} y={100-Math.cos(angle)*62} textAnchor="middle" dominantBaseline="central"
                  fill="#183842" fontSize="15" fontWeight="850">{label}</text>;
              })}
              <circle cx="100" cy="100" r="47" fill="none" stroke="#799496" strokeWidth=".7" strokeDasharray="1 3"/>
              <motion.g data-clock-hour-hand animate={{rotate:rotationHours+currentTime.minutes*.5}}
                transition={reducedMotion ? {duration:0} : {duration:.2,ease:'easeOut'}} style={{transformOrigin:'50% 50%',transformBox:'view-box'}}>
                <path d="M100 53L105 65V108H95V65Z" fill="#54a9bd" stroke="#173744" strokeWidth="2"/>
              </motion.g>
              <motion.g data-clock-minute-hand animate={{rotate:rotationMinutes}}
                transition={reducedMotion ? {duration:0} : {duration:.2,ease:'easeOut'}} style={{transformOrigin:'50% 50%',transformBox:'view-box'}}>
                <path d="M100 30L103 40V112H97V40Z" fill="#d79a2b" stroke="#3d382a" strokeWidth="1.5"/>
              </motion.g>
              <circle cx="100" cy="100" r="7" fill="#183944" stroke="#f4d17f" strokeWidth="2"/>
            </svg>
          </div>
        </div>
        <div className="chrono-controls" data-clock-controls>
          <div className="chrono-control-group"><span>Hour hand</span><div className="chrono-control-buttons">
            <ControlButton label="Decrease hour" disabled={disabled} onClick={() => adjustTime('hours',-1)} icon={<Minus size={20}/>} />
            <ControlButton label="Increase hour" disabled={disabled} onClick={() => adjustTime('hours',1)} icon={<Plus size={20}/>} />
          </div></div>
          <div className="chrono-control-group"><span>Minute hand{tier === 5 ? ' · 1 min' : ' · 5 min'}</span><div className="chrono-control-buttons">
            <ControlButton label="Decrease minutes" disabled={disabled} onClick={() => adjustTime('minutes',-minuteStep)} icon={<Minus size={20}/>} />
            <ControlButton label="Increase minutes" disabled={disabled} onClick={() => adjustTime('minutes',minuteStep)} icon={<Plus size={20}/>} />
          </div></div>
        </div>
        <div className="refinement-feedback" role="status" aria-live="polite">{feedback || 'Short hand: hours. Long hand: minutes.'}</div>
        <div className="chrono-actions game-submit-dock">
          <motion.button type="button" className="ui-button-primary" disabled={disabled} onClick={checkTime}
            whileTap={reducedMotion ? undefined : {scale:.98}}>{gameState === 'complete' ? 'TIME RESTORED' : 'RESTORE TIME'}</motion.button>
          <button type="button" className="ui-button-secondary flex items-center justify-center gap-2" disabled={Boolean(sessionState?.paused)} onClick={startGame}>
            <RotateCcw size={15}/> RESET TIMEKEEPER
          </button>
        </div>
      </main>
    </div>
  );
};
function ControlButton({label,onClick,icon,disabled}: {label:string;onClick:()=>void;icon:React.ReactNode;disabled:boolean}) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="ui-icon-button flex items-center justify-center">{icon}</button>;
}
export default ChronoDashGame;
