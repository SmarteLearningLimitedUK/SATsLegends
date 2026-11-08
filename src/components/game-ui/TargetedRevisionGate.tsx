import React,{useContext,useState} from 'react';
import PracticeIntroPopup from './PracticeIntroPopup';
import {LearnerGuideContext} from './LearnerGuideContext';
import {REVISION_GAMES} from '../../systems/learning/revisionSkills';
import {skillLabel} from '../../systems/learning/skillCatalog';

/** Reuse the existing workshop dialog; ordinary game identity and routes stay intact. */
export default function TargetedRevisionGate({game,practice,children}:{game:string;practice:boolean;children:React.ReactNode}) {
 const [closed,setClosed]=useState(false);
 const guide=useContext(LearnerGuideContext);
 const skill=typeof location==='undefined'?null:new URLSearchParams(location.search).get('revisionSkill');
 if(!practice||closed||!skill||REVISION_GAMES[skill]!==game||game==='rune_relations'||(game==='shattered_whole'&&skill.startsWith('fractions.visual-')))return <>{children}</>;
 // The app owns the first briefing. Do not stack a second modal over it or
 // mount the timed game while the independent revision workshop is active.
 if(guide?.introManaged&&!guide.introDismissed)return null;
 return <PracticeIntroPopup open kind="help" title={skillLabel(skill)} body="Try a few questions on this skill, then return to your game." briefing={{title:skillLabel(skill),summary:'Practise this specific idea. There is no countdown.',bullets:[],revisionKey:game}} targetSkill={skill} actionLabel="Return to the game" onAction={()=>setClosed(true)}/>;
}
