import HeroPortrait from './HeroPortrait';
import ArtworkFrame from './ArtworkFrame';
import {asset} from './assets';
import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Flame, Hourglass, Timer, XCircle } from 'lucide-react';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../../../src/assets/characters';
import GameActionDock from './GameActionDock';
import { LEVEL_TIMERS_DISABLED } from '../../../src/app/testingFlags';
import {gameplayHudDock as dock} from './gameplayHudDock';
import {useLearningPolicy} from '../../../src/systems/learning/learningSupport';

interface UnifiedMiniGameHudProps {
  avatarId?: string;
  assessment?: boolean;
  answerFeedback?: {tone:'correct'|'incorrect'; label:string} | null;
  timeLeft: number;
  totalTime: number;
  hidden?: boolean;
  hideTimer?: boolean;
  hideTopBar?: boolean;
  lives?: number;
  onBack?: () => void;
  onHelp?: () => void;
  onWork?: () => void;
  title?: string;
  levelLabel?: string;
  streak?: number;
  isPractice?: boolean;
  variant?: 'gameplay' | 'hub';
  showActions?: boolean;
  bottomContent?: React.ReactNode;
}

const UnifiedMiniGameHud: React.FC<UnifiedMiniGameHudProps> = ({
  avatarId, timeLeft, totalTime, hidden = false, hideTimer = false,
  hideTopBar = false, lives = 3, onBack, onHelp, onWork, title = 'SATs Legends',
  levelLabel = 'Adventure', streak = 0, isPractice = false,
  variant = 'gameplay', showActions = true, bottomContent, assessment = false, answerFeedback,
}) => {
  const learningPolicy=useLearningPolicy();
  const avatar = CHARACTER_AVATARS.find((entry) => entry.id === avatarId)
    ?? CHARACTER_AVATARS.find((entry) => entry.id === DEFAULT_AVATAR_ID)
    ?? CHARACTER_AVATARS[0];
  const [mockClock, setMockClock] = useState<{ timeLeft: number; totalTime: number;untimed?:boolean } | null>(null);
  useEffect(() => {
    setMockClock(null);
    if (!assessment) return;
    const update = (event: Event) => setMockClock((event as CustomEvent<{ timeLeft: number; totalTime: number; untimed?:boolean }>).detail);
    window.addEventListener('sats-mock-clock', update);
    return () => window.removeEventListener('sats-mock-clock', update);
  }, [assessment, title]);
  if (assessment && mockClock) { timeLeft = mockClock.timeLeft; totalTime = mockClock.totalTime; }
  const activityClock = title === 'Match Mastery' || title === 'Factor Frenzy' || title === 'Takeout Rush';
  // useGameplaySession intentionally leaves these construction/statistics games
  // untimed. A fixed countdown would misrepresent their completion conditions.
  const untimedActivity = title === 'Mean Machine' || title === 'Potion Panic' || title === 'Polygon Palace' || title === 'Data Detective';
  const showTimer = !activityClock && !untimedActivity && !hideTimer && (assessment ? Boolean(mockClock)&&!mockClock?.untimed : !learningPolicy.noTimeLimit&&!learningPolicy.relaxedPractice&&!LEVEL_TIMERS_DISABLED);
  const progress = Math.max(0, Math.min(1, totalTime > 0 ? timeLeft / totalTime : 0));
  const hudLabel=variant==='hub'?(location.pathname.startsWith('/wellbeing')?'Calm Grove':'Adventure'):isPractice?'Warm-up mission':levelLabel;
  const docked=variant==='gameplay';
  if (hidden) return null;

  return (
    <div data-unified-minigame-hud="true" data-gameplay-docked={docked||undefined} style={docked?dock.root:undefined} className="pointer-events-none absolute inset-0 z-[120]">
      {hideTopBar ? null : (
        <div style={docked?dock.top:undefined} className="concept-hud-top absolute inset-x-0 top-0 flex justify-center">
          <div style={docked?dock.bar:undefined} className="legend-hud-bar" data-testid="shared-top-hud">
            <span style={docked?dock.art:undefined} className="legend-hud-art" aria-hidden="true"><ArtworkFrame name={docked?"frames/concept_hud_wide_v4":assessment&&/Paper 1|Arithmetic Quiz/.test(title)?"frames/paper1_hud_v3":assessment&&/Paper 2|Reasoning Quiz 1/.test(title)?"frames/paper2_panel_v3":"frames/concept_hud_wide_v4"} corner={.45} horizontalCorner={.14}/><img style={docked?dock.jewel:undefined} className="legend-hud-jewel" src={asset('frames','sapphire_crest_v3')} alt=""/></span>
            <div style={docked?dock.avatar:undefined} className="legend-hud-avatar"><HeroPortrait identity={avatar?.id} alt={avatar?.name || 'Your hero'}/></div>
            <div style={docked?dock.mission:undefined} className="legend-hud-mission">
              <div style={docked?dock.srOnly:undefined} className="legend-hud-label">{hudLabel}</div>
              <div style={docked?dock.title:undefined} className="legend-hud-title" aria-label={title === 'SATs Legends' ? 'Matharia' : title}>
                {docked&&answerFeedback?<span className="legend-answer-feedback" data-tone={answerFeedback.tone}>
                  {answerFeedback.tone==='correct'?<CheckCircle2 aria-hidden="true"/>:<XCircle aria-hidden="true"/>}{answerFeedback.label}
                </span>:title === 'SATs Legends' ? 'Matharia' : title}
              </div>
              {docked&&<span style={dock.srOnly} role="status">{answerFeedback?.label}</span>}
              {showTimer ? (
                <div style={docked?dock.progress:undefined} className={`legend-hud-timer ${progress <= .3 ? 'is-low' : ''}`} role="progressbar" aria-label="Time remaining" aria-valuemin={0} aria-valuemax={totalTime} aria-valuenow={timeLeft}>
                  <div style={{ width: `${progress * 100}%`,...(docked?dock.progressFill:{}),background:docked?(progress<=.3?'#ff9182':'#95f0a4'):undefined }} />
                </div>
              ) : null}
            </div>
            <div style={docked?dock.status:undefined} className="flex shrink-0 flex-col items-end gap-1">
              {variant === 'gameplay' ? (
                assessment ? <span style={docked?dock.practice:undefined} className="legend-hud-practice">Quiz</span> : isPractice ? <span style={docked?dock.practice:undefined} className="legend-hud-practice inline-flex items-center gap-1"><BookOpen size={17} aria-hidden="true" />Practice</span> : (
                  <div style={docked?dock.lives:undefined} className="legend-hud-lives" role="img" aria-label={`${lives} of 3 lives remaining`}>
                    {[1, 2, 3].map((heart) => <img style={docked?dock.heart:undefined} key={heart} className={`concept-life ${heart>lives?'is-empty':''}`} src={asset('icons',heart>lives?'concept_heart_empty':'concept_heart_full')} alt="" aria-hidden="true"/>)}
                  </div>
                )
              ) : null}
              <div style={docked?dock.clockStack:undefined} className="concept-clock-stack">
                {!activityClock && showTimer && <span style={docked?dock.timer:undefined} className="legend-hud-streak" role="timer" aria-label="Time remaining" aria-live="off">
                  {showTimer ? <>{assessment&&!/Paper 3/.test(title)?<Hourglass style={docked?dock.clockIcon:undefined} className="concept-clock-icon" aria-hidden="true"/>:<Timer style={docked?dock.clockIcon:undefined} className="concept-clock-icon" aria-hidden="true"/>}<span className="concept-clock-value" style={{font:docked?'inherit':undefined,lineHeight:docked?1:undefined,minWidth:`${assessment?String(Math.floor(totalTime/60)).length+3:String(Math.floor(totalTime)).length+1}ch`}}>{assessment ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}` : `${Math.max(0, Math.floor(timeLeft))}s`}</span></> : null}
                </span>}
                {!assessment && streak > 1 ? <span style={docked?dock.srOnly:undefined} className="concept-answer-streak" aria-live="polite"><Flame size={12} aria-hidden="true"/>{streak} in a row</span> : null}
              </div>
            </div>
          </div>
        </div>
      )}
      {(bottomContent || (showActions && onBack)) ? (
        <>
          <div className="legend-dock-base" aria-hidden="true" />
          <div style={docked?dock.bottom:undefined} data-testid="shared-bottom-hud" className="concept-hud-bottom pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
            <div style={docked?(bottomContent?{...dock.bottomInner,width:'100%'}:dock.bottomInner):undefined} className="pointer-events-auto max-w-[calc(100vw-0.7rem)] overflow-hidden">
              {bottomContent ?? (onBack ? <GameActionDock paper={assessment?Number(title.match(/Paper (\d)/)?.[1]??0):0} onBack={onBack} onHelp={onHelp} onWork={onWork??(assessment?()=>window.dispatchEvent(new Event('matharia-paper-workpad')):undefined)} helpLabel="Tips" compact variant="global" /> : null)}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
export default UnifiedMiniGameHud;
