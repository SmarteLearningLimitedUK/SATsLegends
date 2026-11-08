import React,{lazy,Suspense,useContext,useId,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import {X,ArrowRight,Compass} from 'lucide-react';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
import type {SatsMission} from '../../../../src/systems/content/satsAdventure';
import {VisionSceneContext} from '../../../../src/games/visionScene';
import PresenceLayer from '../PresenceLayer';
import PresentationHint from '../PresentationHint';
import {AdventureBackdrop,AdventureHero,AdventurePanelFrame,AdventureControlFrame} from './AdventureArtwork';
import {useLearningPolicy} from '../../../../src/systems/learning/learningSupport';
import {speakQuestion,stopQuestionSpeech,currentQuestionReading} from '../../../../src/systems/learning/mathematicalSpeech';
import {adventureBriefing,getAdventureStory} from '../../../../src/systems/content/adventureStory';
const RevisionWorkshop=lazy(()=>import('../../../../src/components/game-ui/RevisionWorkshop'));

interface Props {
  dialogRef: React.RefObject<HTMLDivElement|null>; title: string; body: React.ReactNode;
  briefing?: MiniGamePracticeBriefing|null; actionLabel: string; kind: 'practice'|'help'|'mock'|'quiz';
  onAction: ()=>void; avatarId?: string; targetSkill?:string; targetMissions?:SatsMission[];
}

export default function BriefingScene({dialogRef,title,body,briefing,actionLabel,kind,onAction,avatarId,targetSkill,targetMissions}:Props) {
  const scene=useContext(VisionSceneContext), reduced=useReducedMotion(), id=useId();
  const support=useLearningPolicy();
  const [mathHelpOpen,setMathHelpOpen]=useState(false);
  const instructionSupport=kind==='help'&&!targetSkill&&(support.repeatInstructions||support.workingMemorySupport);
  const standardAssessment=kind==='help'&&Boolean(document.querySelector('[data-sats-paper][data-sats-untimed="false"]'));
  const mathematicalHelp=<>
    {kind==='help'&&!targetSkill&&!standardAssessment&&<PresentationHint/>}
    {briefing?.bullets.length?<ol className="legend-briefing-steps">{briefing.bullets.map((bullet,index)=><li key={index}><span className="legend-step-number">{index+1}</span><span>{bullet}</span></li>)}</ol>:null}
    {briefing?.example?<div className="legend-worked-example"><strong>Worked example</strong><p>{briefing.example}</p></div>:null}
    {kind==='help'&&!standardAssessment&&briefing?.revisionKey?<Suspense fallback={<p>Opening your practice mission…</p>}><RevisionWorkshop key={`${briefing.revisionKey}:${targetSkill??''}`} game={briefing.revisionKey} independent={Boolean(targetSkill)} missionList={targetMissions}/></Suspense>:null}
  </>;

  const gameKey=briefing?.revisionKey||scene.key||document.querySelector<HTMLElement>('[data-active-game]')?.dataset.activeGame||'place_value_panic';
  const summary=kind==='practice'&&getAdventureStory(gameKey)?adventureBriefing(gameKey,''):briefing?.summary||body;
  return <PresenceLayer className="matharia-briefing-layer" initial={reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:.18}}>
    <AdventureBackdrop gameKey={gameKey}/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className="adventure-briefing-stage" data-adventure-briefing={kind} data-adventure-game={gameKey}>
      <div className="adventure-briefing-hero" aria-hidden="true"><AdventureHero gameKey={gameKey} avatarId={avatarId??scene.heroIdentity}/></div>
      <section className="adventure-briefing-card">
        <AdventurePanelFrame/>
        <button type="button" className="adventure-close" onClick={onAction} data-ui-sound="handled" aria-label={kind==='help'?'Close help':'Close practice briefing'}><AdventureControlFrame/><X size={21}/></button>
        <div className="adventure-briefing-reading" style={{touchAction:'pan-y'}}>
          <div className="adventure-eyebrow"><Compass size={18}/>{kind==='help'?'How to play':kind==='quiz'?'SATs-style quiz':kind==='mock'?'Final adventure':'Your warm-up mission'}</div>
          <h2 id={id}>{title}</h2>
          <div className="legend-briefing-copy">{summary}</div>
          {support.readAloud&&<><button type="button" className="ui-button-secondary" onClick={()=>speakQuestion(`${title}. ${typeof summary==='string'?summary:'Read each question and enter your answer.'}. ${instructionSupport?'':(briefing?.bullets||[]).join('. ')}`)}>Read instructions again</button>{kind==='help'&&currentQuestionReading()&&<button type="button" className="ui-button-secondary" onClick={()=>speakQuestion(currentQuestionReading())}>Read current question</button>}<button type="button" className="ui-button-secondary" onClick={stopQuestionSpeech}>Stop reading</button></>}
          {instructionSupport&&currentQuestionReading()&&<div className="legend-worked-example"><strong>Your current question</strong><p>{currentQuestionReading()}</p></div>}
          {instructionSupport&&!standardAssessment?<details onToggle={event=>{setMathHelpOpen(event.currentTarget.open);if(event.currentTarget.open)window.dispatchEvent(new Event('matharia-mathematical-help'));}}><summary>Mathematical reminder and practice</summary>{mathHelpOpen&&mathematicalHelp}</details>:mathematicalHelp}

        </div>
        <footer className="adventure-briefing-actions">
          <button type="button" className="adventure-button adventure-button--primary" data-dialog-primary data-ui-sound="handled" onClick={onAction}><AdventureControlFrame primary/><span>{actionLabel}</span><ArrowRight size={21}/></button>
          {kind==='practice'&&<p>Try things out. Mistakes are part of learning.</p>}
        </footer>
      </section>
    </div>
  </PresenceLayer>;
}
