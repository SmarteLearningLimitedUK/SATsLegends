import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FeedbackStrip,
  GameQuestionCard,
  GameUiShell,
} from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import areaBackdrop from '../assets/maps/premium/area-architect.webp';
import { playGameSound } from '../audio/gameAudio';
import './area-architect.css';
import { reshuffleAvoidingRepeat } from '../utils/questionShuffle';

interface AreaArchitectGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type Cell = { x: number; y: number };

interface AreaQuestion {
  id: string;
  prompt: string;
  gridSize: number;
  cells: Cell[];
  correct: number;
}


const ROUNDS_TO_WIN = 5;
const BASE_XP = 160;

const rectCells = (xStart: number, yStart: number, width: number, height: number): Cell[] => {
  const cells: Cell[] = [];
  for (let y = yStart; y < yStart + height; y += 1) {
    for (let x = xStart; x < xStart + width; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
};

const buildQuestion = (id: string, gridSize: number, cells: Cell[], prompt: string): AreaQuestion => {
  const uniqueCells = [...new Map(cells.map((cell) => [`${cell.x}-${cell.y}`, cell])).values()];
  return { id, prompt, gridSize, cells: uniqueCells, correct: uniqueCells.length };
};

const areaQuestionsForTier = (level: number): AreaQuestion[] => {
  const tier = Math.max(1, Math.min(5, level));
  return Array.from({ length: 8 }, (_, variant) => {
    if (tier <= 2) {
      const gridSize = tier === 1 ? 6 : 7;
      const width = tier === 1 ? 2 + (variant % 3) : 3 + (variant % 3);
      const height = tier === 1 ? 2 + (Math.floor(variant / 3) % 2) : 2 + (Math.floor(variant / 3) % 3);
      const x = 1 + (variant % (gridSize - width + 1));
      const y = 1 + (Math.floor(variant / 2) % (gridSize - height + 1));
      return buildQuestion(`${tier}-rectangle-${variant}`, gridSize, rectCells(x, y, width, height), 'What is the floor area?');
    }
    if (tier <= 4) {
      const gridSize = tier === 3 ? 6 : 7;
      const topWidth = 3 + (variant % 3);
      const topHeight = 1 + (variant % 2);
      const lowerWidth = 1 + (Math.floor(variant / 2) % 2);
      const lowerHeight = 2 + (Math.floor(variant / 3) % 3);
      const x = 1 + (variant % 2);
      const y = 1;
      return buildQuestion(`${tier}-corner-${variant}`, gridSize, [
        ...rectCells(x, y, topWidth, topHeight),
        ...rectCells(x, y + topHeight, lowerWidth, lowerHeight),
      ], 'What is the floor area?');
    }
    const width = 5 + (variant % 2);
    const height = 4 + (Math.floor(variant / 2) % 2);
    const gapX = 1 + (variant % 3);
    const gapY = 1 + (Math.floor(variant / 3) % 2);
    const gapWidth = 1 + (variant % 2);
    return buildQuestion(`${tier}-cutout-${variant}`, 7, rectCells(1, 1, width, height).filter((cell) =>
      !(cell.x > gapX && cell.x <= gapX + gapWidth && cell.y > gapY && cell.y <= gapY + 1)),
    'What is the floor area?');
  });
};

const buildQuestionDeck = (level: number, previousLast: AreaQuestion | null) => (
  reshuffleAvoidingRepeat(areaQuestionsForTier(level), previousLast, (question) => question.id)
);

const starsForAccuracy = (correct: number, attempts: number) => {
  if (attempts === 0) return 0;
  const accuracy = correct / attempts;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const AreaArchitectGame: React.FC<AreaArchitectGameProps> = ({levelId,isPractice,practiceBriefing,sessionState,sessionEvents,onVictory}) => {
  const [deck] = useState(() => buildQuestionDeck(levelId,null));
  const [roundIndex,setRoundIndex] = useState(0);
  const [attempts,setAttempts] = useState(0);
  const [correctCount,setCorrectCount] = useState(0);
  const [selected,setSelected] = useState<number|null>(null);
  const [feedback,setFeedback] = useState('');
  const [solved,setSolved] = useState(false);
  const [wrong,setWrong] = useState<number[]>([]);
  const [showIntro,setShowIntro] = useState(Boolean(isPractice));
  const locked = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timeout.current)clearTimeout(timeout.current);},[]);
  const question=deck[roundIndex%deck.length];
  const minX=Math.min(...question.cells.map(c=>c.x)),minY=Math.min(...question.cells.map(c=>c.y));
  const width=Math.max(...question.cells.map(c=>c.x))-minX+1,height=Math.max(...question.cells.map(c=>c.y))-minY+1;
  const rectangle=question.correct===width*height;
  const options=useMemo(()=>{
    const values=new Set([question.correct]);
    for(const candidate of [2*(width+height),width*height,question.correct+width,question.correct-1,question.correct+1]){
      if(candidate>0)values.add(candidate);if(values.size===4)break;
    }
    return [...values].sort((a,b)=>((a*13+roundIndex*7)%23)-((b*13+roundIndex*7)%23));
  },[question.correct,width,height,roundIndex]);
  const choose=(answer:number)=>{
    if(locked.current||sessionState?.paused||showIntro||wrong.includes(answer))return;
    setSelected(answer);setAttempts(n=>n+1);
    const correct=answer===question.correct;
    emitMiniGameSessionEvent(sessionEvents,correct?'correct_answer':'incorrect_answer',{metadata:{questionId:question.id,answer,target:question.correct,roundIndex}});
    if(!correct){setWrong(previous=>[...previous,answer]);setFeedback(rectangle?'Not quite. Area is length × width, not the distance around the edge.':'Not quite. Count only blue squares, or split the room into rectangles. Empty spaces are outside the room.');return;}
    locked.current=true;setSolved(true);setCorrectCount(n=>n+1);playGameSound('impact');
    setFeedback(rectangle?`Correct! ${width} × ${height} = ${question.correct} m².`:`Correct! ${question.correct} blue squares × 1 m² = ${question.correct} m².`);
  };
  const next=()=>{
    if(!solved||sessionState?.paused||timeout.current)return;
    if(roundIndex+1===ROUNDS_TO_WIN){timeout.current=setTimeout(()=>onVictory(starsForAccuracy(correctCount,attempts),BASE_XP*ROUNDS_TO_WIN+levelId*50),0);return;}
    setRoundIndex(n=>n+1);setSelected(null);setFeedback('');setSolved(false);setWrong([]);locked.current=false;
  };
  return <GameUiShell backgroundImage={areaBackdrop} overlayDisabled>
    <PracticeIntroPopup open={showIntro} title="Area Architect" body="Find the area of each room plan. For a rectangle, multiply length by width. Each blue square is 1 square metre. Choose an area below; you do not need to place tiles." briefing={practiceBriefing} onAction={()=>setShowIntro(false)}/>
    <main className="area-room-game" data-area-game>
      <GameQuestionCard title="Area Architect" className="area-room-question" subtitle="Choose the area in square metres (m²)." style={{position:'relative',top:'auto',left:'auto',right:'auto',transform:'none',width:'100%'}}>
        What is the floor area of this room?
      </GameQuestionCard>
      <div className="area-room-progress">Room {roundIndex+1} of {ROUNDS_TO_WIN}</div>
      <figure className="area-room-plan" data-area-board data-area-target={question.correct}>
        <svg viewBox={`0 0 ${(width+2)*24} ${(height+2)*24}`} role="img" aria-label={rectangle?`Rectangular room, ${width} metres long and ${height} metres wide`:'Room plan made of blue unit squares. Each square is one square metre.'}>
          <defs><linearGradient id="area-room-blue" x2="1" y2="1"><stop stopColor="#79e3ec"/><stop offset="1" stopColor="#2f83b1"/></linearGradient></defs>
          {question.cells.map(cell=><rect key={`${cell.x}-${cell.y}`} x={(cell.x-minX+1)*24} y={(cell.y-minY+1)*24} width="24" height="24" fill="url(#area-room-blue)" stroke="#e2faff" strokeWidth="1.5"/>)}
          {rectangle&&<><text x={(width+2)*12} y="15" textAnchor="middle">{width} m</text><text x="5" y={(height+2)*12} textAnchor="middle" transform={`rotate(-90 5 ${(height+2)*12})`}>{height} m</text></>}
        </svg>
        <figcaption>{rectangle&&<strong className="area-room-dimensions">Length {width} m · Width {height} m</strong>}Each blue square = 1 m²</figcaption>
      </figure>
      <div className="area-room-answers answer-choice-surface" role="group" aria-label="Choose the floor area">
        {options.map(answer=><button key={answer} type="button" data-area-answer={answer} className={solved&&selected===answer?'ui-button-success':wrong.includes(answer)?'ui-button-secondary area-room-wrong':'ui-button-secondary'} disabled={solved||showIntro||sessionState?.paused||wrong.includes(answer)} onClick={()=>choose(answer)}>{answer} m²</button>)}
      </div>
      <div className="area-room-feedback" data-tone={solved?'success':feedback?'error':'neutral'} role="status">{feedback||'Read the plan, then choose an area.'}</div>
      {solved&&<button className="ui-button-primary area-room-next" disabled={sessionState?.paused} onClick={next}>{roundIndex+1===ROUNDS_TO_WIN?'Finish rooms':'Next room'}</button>}
    </main>
  </GameUiShell>;
};
export default AreaArchitectGame;
