import {adventureTask} from '../../../../src/systems/content/adventureStory';
import IndependentAnswer,{answerAsNumber,matchingAnswerIndex,canonicalAnswer} from '../../../../src/components/game-ui/IndependentAnswer';
import {roundFeedback} from '../roundFeedback';
import React, {useContext, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useReducedMotion} from 'motion/react';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import {VisionSceneContext} from '../VisionScene';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
import {useSceneContact} from '../useSceneContact';

interface Props {
 question: {prompt: string; sublabel: string; options: string[]};
 points: readonly {x: number; y: number}[];
 step: number; total: number; tier: number; score: number; wrongs: number;
 selected: number | null; feedback: 'correct' | 'incorrect' | null;
 locked: boolean; finished: boolean; paused: boolean;
 intro: React.ReactNode; onAnswer: (i: number) => void;
}

// A scene camera follows the existing crossing index. It never advances gameplay.
const FLOOR = 67, HERO_X = 38, STRIDE_X = 27, STRIDE_Y = 3.5, FLIGHT_MS = 420;
const cameraTransform = (step: number) => `translate3d(${-step * STRIDE_X}%,${step * STRIDE_Y}%,0)`;

function LavaAtmosphere() {
 return <div className="lava-atmosphere" aria-hidden="true">
  <svg className="lava-currents" viewBox="0 0 1000 400" preserveAspectRatio="none">
   <path d="M-40 273 Q100 246 210 274 T460 277 T720 271 T1040 280"/>
   <path d="M-40 317 Q130 285 270 319 T580 318 T1040 312"/>
   <path d="M-40 348 Q160 325 310 350 T630 347 T1040 358"/>
  </svg>
  {Array.from({length: 16}, (_, i) => <i key={i} className="lava-ember" style={{
   left: `${4 + (i * 37) % 93}%`, top: `${55 + (i * 13) % 34}%`,
   '--ember-drift': `${(i % 2 ? 1 : -1) * (12 + i % 5 * 6)}px`,
   animationDelay: `${-i * .71}s`, animationDuration: `${3.6 + i % 5 * .45}s`,
  } as React.CSSProperties}/>) }
 </div>;
}

export default function LavaScene(p: Props) {
 const scene = useContext(VisionSceneContext), reduced = useReducedMotion();
 const [hidden, setHidden] = useState(() => document.hidden);
 const paused = p.paused || scene.paused || hidden;
 useSceneContact(p.step,roundFeedback(p.feedback)==='correct','stone',FLIGHT_MS,paused);
 const hero = useRef<HTMLDivElement>(null), camera = useRef<HTMLDivElement>(null);
 const animations = useRef<Animation[]>([]), previous = useRef(p.step), pausedRef = useRef(paused);
 pausedRef.current = paused;
 usePresentationHint(p.question.sublabel);

 useEffect(() => {
  const update = () => setHidden(document.hidden);
  document.addEventListener('visibilitychange', update);
  return () => document.removeEventListener('visibilitychange', update);
 }, []);

 useLayoutEffect(() => {
  const from = previous.current, distance = p.step - from;
  animations.current.forEach(a => a.cancel());
  animations.current = [];
  previous.current = p.step;
  if (reduced || distance <= 0) return;
  // The camera catches up during flight; both feet meet the next stone at 420 ms.
  const offsets = [0, .25, .5, .75, 1];
  animations.current = [
   camera.current!.animate(offsets.map(t => ({offset: t, transform: cameraTransform(from + distance * t * t)})),
    {duration: FLIGHT_MS, easing: 'linear', fill: 'both'}),
   hero.current!.animate(offsets.map(t => ({offset: t,
    left: `${HERO_X + STRIDE_X * distance * (t - t * t)}%`,
    top: `${FLOOR - STRIDE_Y * distance * (t - t * t) - Math.sin(Math.PI * t) * 4}%`,
   })), {duration: FLIGHT_MS, easing: 'linear', fill: 'both'}),
  ];
  if (pausedRef.current) animations.current.forEach(a => a.pause());
 }, [p.step, reduced]);

 useLayoutEffect(() => {
  for (const animation of animations.current) {
   if (animation.playState !== 'finished') paused ? animation.pause() : animation.play();
  }
 }, [paused, p.step]);
 useEffect(() => () => animations.current.forEach(a => a.cancel()), []);

 const feedback = roundFeedback(p.feedback) === 'correct' ? 'Stone secured. Keep going!'
  : roundFeedback(p.feedback) === 'incorrect' ? 'Check the conversion. Try the next stone again.' : p.question.sublabel;

 return <section className="lava-scene" data-lava-game data-lava-tier={p.tier} data-lava-step={p.step}
  data-lava-total={p.total} data-lava-score={p.score} data-lava-wrongs={p.wrongs}
  data-lava-reaction={roundFeedback(p.feedback) ?? 'idle'} data-lava-question={p.question.prompt} data-lava-paused={paused}>
  {p.intro}
  <LavaAtmosphere/>
  <ScalableQuestionPanel story={adventureTask('unit_mixer',p.step)}>{p.question.prompt}</ScalableQuestionPanel>
  <div className="lava-safe-counter" aria-live="polite">
   <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
   <span>{p.step}/{p.total} safe crossings</span>
   <div className="lava-crossing-progress" aria-hidden="true">{Array.from({length: p.total}, (_, i) =>
    <i key={i} data-complete={i < p.step}/>)}</div>
  </div>
  <div className="lava-independent-crossing" aria-hidden="true">
   <div ref={camera} className="lava-crossing-camera" data-lava-camera style={{transform: cameraTransform(p.step)}}>
    {p.points.map((_, index) => <div key={index} className="lava-independent-stone" data-lava-stone={index}
     data-stone-safe={index <= p.step} data-stone-current={index === p.step} data-stone-next={index === p.step + 1}
     data-stone-wobble={index === p.step + 1 && roundFeedback(p.feedback) === 'incorrect'}
     style={{left: `${HERO_X + index * STRIDE_X}%`, top: `${FLOOR - index * STRIDE_Y}%`}}>
     <img src={asset('props', 'lava_platform_v3')} alt="" draggable={false}/>
     {index < p.step && <svg className="lava-safe-mark" viewBox="0 0 24 24"><path d="M5 12l4 4L19 6"/></svg>}
     {index === p.step + 1 && <svg className="lava-target-mark" viewBox="0 0 28 24"><path d="M5 5l9 7 9-7M5 13l9 7 9-7"/></svg>}
    </div>)}
   </div>
  </div>
  <div ref={hero} className="lava-flight-wrapper" data-lava-hero style={{left: `${HERO_X}%`, top: `${FLOOR}%`}}>
   <div className="lava-standing-hero" data-reaction={roundFeedback(p.feedback)}>
    <Character identity={scene.heroIdentity ?? 'barratt'} activity={roundFeedback(p.feedback) === 'correct' ? 'run' : 'idle'} decorative/>
   </div>
  </div>
  {roundFeedback(p.feedback) === 'correct' && <div key={p.step} className="lava-landing" aria-hidden="true" style={{left: `${HERO_X}%`, top: `${FLOOR}%`}}>
   <span className="lava-landing-ring"/>
   {Array.from({length: 8}, (_, i) => <i key={i} style={{'--spark-x': `${(i - 3.5) * 10}px`, '--spark-y': `${-12 - (i % 3) * 7}px`} as React.CSSProperties}/>)}
  </div>}
  <div className="lava-live-answers" role="group" aria-label="Choose the converted total">
   <IndependentAnswer expectedUnit={p.question.options[0]?.match(/[a-z]+$/i)?.[0]} questionId={p.question.prompt} fingerprint={p.question.prompt} gameKey="unit_mixer" skillId="measurement.convert" curriculumRefs={["6M5"]} label={'Answer in '+(p.question.options[0]?.match(/[a-z]+$/i)?.[0]??'the requested unit')} disabled={p.locked||p.finished||paused} onSubmit={value=>{const unit=p.question.options[0]?.match(/[a-z]+$/i)?.[0]??'';p.onAnswer(matchingAnswerIndex(/[a-z]/i.test(value)?value:value+' '+unit,p.question.options))}}>{open=><div className="lava-answer-pedestal"><button type="button" data-button-skin="none" disabled={p.locked||p.finished||paused} onClick={open}><ArtworkFrame name="buttons/angle_answer_v4" corner={.13} fit="height"/><span>Enter answer</span></button></div>}</IndependentAnswer>
  </div>
  <div className="lava-live-helper" role={roundFeedback(p.feedback) ? 'status' : undefined} aria-live="polite" data-tone={roundFeedback(p.feedback)}>
   <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><span>{feedback}</span>
  </div>
 </section>;
}
