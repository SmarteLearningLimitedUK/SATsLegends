import {useEffect} from 'react';
import {useLearningPolicy} from '../../../../src/systems/learning/learningSupport';
import {speakQuestion,stopQuestionSpeech,currentQuestionReading} from '../../../../src/systems/learning/mathematicalSpeech';
import {stopGameSoundEffects} from '../../../../src/audio/gameAudio';
export default function LearningSupportRuntime(){const policy=useLearningPolicy();
 useEffect(()=>{if(policy.calmAudio)stopGameSoundEffects();},[policy.calmAudio]);
 useEffect(()=>{
  document.documentElement.dataset.learningReducedEffects=String(policy.reducedEffects);
  document.documentElement.dataset.learningReducedMovement=String(policy.reducedMovement);
  return()=>{delete document.documentElement.dataset.learningReducedEffects;delete document.documentElement.dataset.learningReducedMovement;};
 },[policy.reducedEffects,policy.reducedMovement]);
 useEffect(()=>{
  if(!policy.readAloud){stopQuestionSpeech();return;}
  let last='',timer=0;
  const read=()=>{window.clearTimeout(timer);timer=window.setTimeout(()=>{const question=currentQuestionReading();if(question&&question!==last&&!document.hidden&&!document.querySelector('[role="dialog"]')){last=question;speakQuestion(question);}else if(!question){last='';stopQuestionSpeech();}},200);};
  const observer=new MutationObserver(read);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  const visibility=()=>{if(document.hidden)stopQuestionSpeech();else read();};document.addEventListener('visibilitychange',visibility);read();
  return()=>{observer.disconnect();window.clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);stopQuestionSpeech();};
 },[policy.readAloud]);
 return <style>{`
 html[data-learning-reduced-effects="true"] [aria-hidden="true"][class*="particle"],
 html[data-learning-reduced-effects="true"] [aria-hidden="true"][class*="flash"],
 html[data-learning-reduced-effects="true"] .forge-impact,
 html[data-learning-reduced-effects="true"] .mine-contact,
 html[data-learning-reduced-effects="true"] .factor-pulse-effect,
 html[data-learning-reduced-effects="true"] .adventure-reward-sparks{visibility:hidden!important}
 html[data-learning-reduced-movement="true"] [aria-hidden="true"],
 html[data-learning-reduced-movement="true"] [aria-hidden="true"] *,
 html[data-learning-reduced-movement="true"] [class*="ambient"],
 html[data-learning-reduced-movement="true"] [class*="scenery"]{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:0s!important}
 `}</style>;
}
