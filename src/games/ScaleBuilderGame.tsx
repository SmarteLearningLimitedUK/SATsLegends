import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import scaleBuilderBackground from '../assets/maps/premium/scale-builder.webp';
import { GameQuestionCard, GameUiShell, PrimaryButton } from '../components/game-ui/GameUiKit';
import ScaleBlueprintBoard from './ScaleBlueprintBoard';
import ScaleNumberPad from './ScaleNumberPad';
import {checkScaledDimensions,parseDimension} from './scaleBuilderMath';
import './scale-builder.css';
import {useDialogFocus} from '../components/game-ui/useDialogFocus';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';

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

const levelsForTier = (tier: number): Level[] => {
  const template = LEVELS[Math.max(0, Math.min(4, tier - 1))];
  const widths = [20, 32, 40, 56, 64];
  const heights = [12, 24, 28, 40, 48];
  return Array.from({ length: LEVELS.length }, (_, index) => {
    const baseWidth = widths[tier - 1] + index * 2;
    const baseHeight = heights[tier - 1] + index * 2;
    return {
      ...template,
      id: index + 1,
      shape: { ...template.shape, baseWidth, baseHeight },
      instructions: `Original size: ${baseWidth} units by ${baseHeight} units\n\nScale factor: x${template.targetScale}\n\nWhat is the new size?`,
    };
  });
};

const SCALE_BUILDER_INTRO = 'Multiply each original length by the scale factor. Enter the two new lengths using the number pad, or drag the gold handles to set them. Check both lengths to restore the blueprint.';
const formatBlueprintValue = (value: number) => String(Math.round(value * 100) / 100);

const ScaleBuilderGame: React.FC<ScaleBuilderGameProps> = ({
  levelId, isPractice, practiceBriefing, sessionEvents, sessionState, onVictory,
}) => {
  const tierLevels = useMemo(() => levelsForTier(Math.max(1, Math.min(5, levelId))), [levelId]);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [values, setValues] = useState<[string,string]>(['','']);
  const [active, setActive] = useState<0|1>(0);
  const [gameState, setGameState] = useState<'playing'|'success'|'complete'>('playing');
  const [feedback, setFeedback] = useState<FeedbackState|null>(null);
  const [showBase, setShowBase] = useState(true);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const checkedRef = useRef<string|null>(null);
  const endedRef = useRef(false);
  const [checkedSignature,setCheckedSignature] = useState<string|null>(null);
  const currentLevel = tierLevels[currentLevelIdx];
  const {baseWidth:baseLength,baseHeight:baseWidth} = currentLevel.shape;
  const result = checkScaledDimensions(values[0],values[1],baseLength,baseWidth,currentLevel.targetScale);
  const signature = values.map(value => parseDimension(value) ?? value).join(':');
  const playing = gameState==='playing' && !sessionState?.paused;
  const length = parseDimension(values[0]) ?? baseLength;
  const width = parseDimension(values[1]) ?? baseWidth;
  const unit = 220 / (Math.max(baseLength,baseWidth) * Math.max(1,currentLevel.targetScale) * 1.5);
  const completedLevels = currentLevelIdx + (gameState==='complete'?1:0);
  const finalScore = Math.max(300,900+completedLevels*220+levelId*60-mistakeCount*90);
  const starRating = mistakeCount<=1?3:mistakeCount<=4?2:1;

  const resetAnswer = () => {
    setValues(['','']);setActive(0);setFeedback(null);checkedRef.current=null;setCheckedSignature(null);
  };
  useEffect(() => {
    setCurrentLevelIdx(0);resetAnswer();setGameState('playing');setMistakeCount(0);endedRef.current=false;
  },[levelId]);
  useEffect(()=>setShowPracticeIntro(Boolean(isPractice)),[isPractice]);

  const changeAnswer = (axis:0|1,value:string) => {
    if(!playing)return;
    setValues(previous => axis===0?[value,previous[1]]:[previous[0],value]);setFeedback(null);
  };
  const verifyScale = () => {
    if(!playing||checkedRef.current===signature)return;
    if(!result.complete){setFeedback({type:'error',message:'Enter a positive number for both new lengths.'});return;}
    checkedRef.current=signature;setCheckedSignature(signature);
    if(result.lengthCorrect&&result.widthCorrect){
      setFeedback({type:'success',message:`Blueprint restored: ${values[0]} × ${values[1]} units.`});
      emitMiniGameSessionEvent(sessionEvents,'correct_answer',{metadata:{project:currentLevel.id,answer:values.join(' × ')}});
      setGameState('success');return;
    }
    const factor=formatBlueprintValue(currentLevel.targetScale);
    const message=result.lengthCorrect?`Length is correct. Recheck width: ${baseWidth} × ${factor}.`:result.widthCorrect?`Width is correct. Recheck length: ${baseLength} × ${factor}.`:`Multiply each original length by ${factor}. Both lengths need another look.`;
    setFeedback({type:'error',message});setMistakeCount(n=>n+1);
    emitMiniGameSessionEvent(sessionEvents,'incorrect_answer',{metadata:{project:currentLevel.id,answer:values.join(' × ')}});
  };
  useEffect(() => {
    if (gameState !== 'success' || sessionState?.paused) return;
    const timer = window.setTimeout(() => {
      if (currentLevelIdx === tierLevels.length - 1) {
        setGameState('complete');
        return;
      }
      setCurrentLevelIdx(index => index + 1);
      setValues(['', '']);
      setActive(0);
      setFeedback(null);
      checkedRef.current = null;
      setCheckedSignature(null);
      setGameState('playing');
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [gameState, currentLevelIdx, tierLevels.length, sessionState?.paused]);
  const finish=()=>{if(endedRef.current)return;endedRef.current=true;onVictory(starRating,finalScore);};
  const completionRef=useDialogFocus(gameState==='complete',()=>{});

  return <GameUiShell className="scale-numeric-game" backgroundImage={scaleBuilderBackground} backgroundOpacity={1} backgroundFit="cover" overlayDisabled>
    <PracticeIntroPopup open={showPracticeIntro} title="Scale Builder" body={SCALE_BUILDER_INTRO} briefing={practiceBriefing} onAction={()=>setShowPracticeIntro(false)}/>
    <div className="scale-builder-board-layout scale-numeric-layout" data-scale-project={currentLevelIdx+1} data-scale-factor={currentLevel.targetScale} data-scale-base-length={baseLength} data-scale-base-width={baseWidth}>
      <GameQuestionCard context="" title={`Scale Builder · Project ${currentLevelIdx+1} of 5`} className="scale-numeric-question" style={{position:'relative',top:0,transform:'none',width:'100%'}}>
        <span>Original: <strong>{baseLength} × {baseWidth} units</strong></span>
        <span>Scale factor: <strong>×{formatBlueprintValue(currentLevel.targetScale)}</strong></span>
        <span>Enlarge the blueprint. What are the new lengths?</span>
      </GameQuestionCard>
      <div className="scale-numeric-board-area">
        <ScaleBlueprintBoard shape={currentLevel.shape.type} baseLength={baseLength} baseWidth={baseWidth} length={length} width={width} unit={unit} showBase={showBase} locked={!playing} onResize={(axis,value)=>{setActive(axis);changeAnswer(axis,formatBlueprintValue(value));}}/>
        <div className="scale-board-caption">Drag the gold handles. Dashed outline = original.</div>
        <button type="button" className="scale-guide-button" disabled={gameState==='complete'} onClick={()=>setShowBase(n=>!n)} aria-pressed={showBase}>{showBase?'Hide original':'Show original'}</button>
      </div>
      <div data-scale-controls className="scale-numeric-controls">
        <p className="scale-pad-hint">Choose a length, then use the number pad.</p>
        <ScaleNumberPad values={values} active={active} locked={!playing} onActive={setActive} onChange={changeAnswer} onSubmit={verifyScale}/>
        <div className="scale-numeric-feedback" data-tone={feedback?.type} role="status" aria-live="polite">{feedback?.message ?? 'Enter both answers, then check your blueprint.'}</div>
        <div className="scale-numeric-actions">
          <button type="button" className="ui-button-secondary" disabled={!playing||!values.some(Boolean)} onClick={resetAnswer}>Clear</button>
          <PrimaryButton onClick={verifyScale} disabled={!playing||!result.complete||checkedSignature===signature}>{gameState==='success' ? 'Correct!' : 'Check lengths'}</PrimaryButton>
        </div>
      </div>
    </div>
    {gameState==='complete'&&<div ref={completionRef} tabIndex={-1} className="scale-project-complete" role="dialog" aria-modal="true" aria-label="Blueprints restored">
      <Trophy size={48} aria-hidden="true"/>
      <h2>Blueprints restored!</h2><p>All five projects completed.</p>
      <p>{starRating} stars · {finalScore} XP</p>
      <PrimaryButton onClick={finish}>Continue</PrimaryButton>
    </div>}
  </GameUiShell>;
};
export default ScaleBuilderGame;
