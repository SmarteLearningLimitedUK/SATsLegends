import {arithmeticMissions,reasoningMissions,type SatsMission,type MissionVisual} from '../content/satsAdventure';
import {SKILL_CATALOG} from './skillCatalog';
import {REVISION_FAMILIES,missionSkill} from './revisionSkills';
import {mathematicalFingerprint} from './fingerprint';
import {buildCalendarQuestion} from '../content/calendarQuestions';
import {runeRevisionMission} from '../content/runeRelationsRevision';
import {shatteredRevisionMission} from '../content/shatteredWhole/revision';

function generatedTarget(skill:string,seed:number,game:string):SatsMission|null {
 const rune=runeRevisionMission(skill,seed);if(rune)return rune;
 const shattered=shatteredRevisionMission(skill,seed);if(shattered)return shattered;
 if(skill.startsWith('time.calendar-')){
  const tier=skill==='time.calendar-facts'?1:skill==='time.calendar-conversion'?2:skill==='time.calendar-duration'?3:5;
  return buildCalendarQuestion(tier,seed,seed%3).mission;
 }
 const n=Math.abs(Math.trunc(seed)),a=2+n%11,b=2+Math.floor(n/11)%10;
 let prompt='',answer='',reference=SKILL_CATALOG[skill]?.references[0]??'',explanation='';
 let visual:MissionVisual={type:'equation',lines:[]};
 switch(skill){
 case 'geometry.count-properties':{
  const property=n%3,label=['Faces','Edges','Vertices'][property],answer=[6,12,8][property];
  return {id:'target-solid-property',skillId:skill,reference:'6G2b',domain:'G',game,difficulty:2,prompt:`How many ${label.toLowerCase()} does this cuboid have?`,visual:{type:'shape',shape:'cuboid',labels:[]},fields:[{label,answer:String(answer)}],explanation:'Count each property once: 6 faces, 12 edges and 8 vertices.',marks:1};
 }
 case 'statistics.evidence-match':{
  const counts=[a,b,a+b],names=['Red','Blue','Gold'];visual={type:'table',headings:['Item','Count'],rows:names.map((name,i)=>[name,String(counts[i])])};
  return {id:'target-evidence-match',skillId:skill,reference:'4S2',domain:'S',game,difficulty:2,prompt:'Which report matches every row of the evidence table?',visual,fields:[{label:'Report',answer:counts.join(', '),options:[counts.join(', '),[a+1,b,a+b].join(', '),[a,b+1,a+b].join(', ')]}],explanation:'Compare every category, not just the total.',marks:1};
 }
 case 'calculation.multi-step':{
  const boxes=a+2,each=b*3,daily=3;prompt=n%2?`${boxes} boxes hold ${each} cards each. ${daily} cards are used each day. How many days will the cards last?`:`A school sells ${boxes} books for £${each} each and spends £${b} on each of 2 classes. How much money remains?`;
  answer=String(n%2?boxes*each/daily:boxes*each-2*b);explanation=n%2?'Find the total cards, then divide by the daily use.':'Find the income and total spending, then subtract.';break;
 }
 case 'calculation.mental':case 'calculation.add':prompt=`${a*3} + ${b} = ?`;answer=String(a*3+b);explanation=`Add ${b} to ${a*3}.`;break;
 case 'calculation.subtract':prompt=`${a*3+b} − ${b} = ?`;answer=String(a*3);explanation=`Subtract ${b} from ${a*3+b}.`;break;
 case 'calculation.multiply':prompt=`${a} × ${b} = ?`;answer=String(a*b);explanation=`${a} groups of ${b} total ${a*b}.`;break;
 case 'calculation.divide':prompt=`${a*b} ÷ ${b} = ?`;answer=String(a);explanation=`${a} × ${b} = ${a*b}, so the quotient is ${a}.`;break;
 case 'factors.missing':prompt=`${a} × □ = ${a*b}`;answer=String(b);explanation=`${a*b} ÷ ${a} = ${b}.`;break;
 case 'angle.straight-line':{const known=15+n%150;prompt=`Two angles make a straight line. One is ${known}°. Find the other.`;answer=String(180-known);explanation=`180° − ${known}° = ${answer}°.`;break;}
 case 'algebra.missing-sum':prompt=`A pyramid stone is ${a+b}. One of the two stones directly beneath it is ${a}. What is the other?`;answer=String(b);explanation=`Undo the sum: ${a+b} − ${a} = ${b}.`;break;
 case 'statistics.missing':prompt=`Three readings have a mean of ${a}. Two are ${a-1} and ${a+2}. Find the third.`;answer=String(a-1);explanation=`Total = 3 × ${a} = ${a*3}; subtract ${a-1} and ${a+2} to get ${answer}.`;break;
 case 'statistics.median':{const values=[a+b,a,a+2*b];prompt=`Find the median of ${values.join(', ')}.`;answer=String(a+b);explanation=`In order: ${a}, ${a+b}, ${a+2*b}. The middle value is ${answer}.`;break;}
 case 'statistics.mode':prompt=`Find the mode of ${a}, ${b+a}, ${a}, ${a+b+1}, ${a}.`;answer=String(a);explanation=`${a} appears three times, more often than any other value.`;break;
 case 'number-line.decimal':case 'number-line.fraction':{const denominator=skill.endsWith('decimal')?10:8,start=n%denominator,marker=start+2;visual={type:'numberline',min:start/denominator,max:(start+4)/denominator,marker:marker/denominator};prompt='Find the value at the marker. The line is divided into four equal gaps.';answer=skill.endsWith('decimal')?String(marker/denominator):`${marker}/${denominator}`;explanation=`Each gap is 1/${denominator}; the marker is two gaps after the start.`;break;}
 case 'measurement.mass-composition':prompt=`A load must weigh ${a} kg. It already contains ${a*1000-b*50} g. How many more grams are needed?`;answer=String(b*50);explanation=`${a} kg = ${a*1000} g. Subtract the mass already loaded.`;break;
 case 'fractions.constrained-composition':prompt=`A tray needs exactly three portions: two portions of 1/${a*2} and one portion of 1/${a}. What fraction of a whole meal is this?`;answer=`2/${a}`;explanation=`2/${a*2} + 1/${a} = 1/${a} + 1/${a} = 2/${a}.`;break;
 case 'fractions.operation-construction':prompt=`Find 1/${a} + 1/${a*2}.`;answer=`3/${a*2}`;explanation=`1/${a} = 2/${a*2}; add the numerators to get 3/${a*2}.`;break;
 default:return null;
 }
 if(visual.type==='equation')visual={type:'equation',lines:[prompt]};
 const difficulty=skill==='calculation.multi-step'?4:skill.startsWith('calculation.')||skill==='factors.missing'?1:['angle.straight-line','algebra.missing-sum','statistics.median','statistics.mode'].includes(skill)?2:3;
 return {id:`target-${skill}`,skillId:skill,reference,domain:(reference.match(/[NCFRAMGPS]/)?.[0]??'S') as SatsMission['domain'],game,difficulty,prompt,visual,fields:[{label:skill==='angle.straight-line'?'Angle (°)':'Answer',answer}],explanation,marks:1};
}

/** Same-skill transfer is explicitly reviewed by family, never inferred from a game or curriculum tag. */
export function revisionMissionsForSkill(skill:string,seed:number,game:string,limit=3):SatsMission[] {
 const pool=[0,97,193,389,587,811].flatMap(offset=>{
  const current=seed+offset,generated=generatedTarget(skill,current,game);
  if(generated)return [generated];
  const allowed=REVISION_FAMILIES[skill];
  return [...arithmeticMissions(current),...reasoningMissions(current+1)].filter(q=>allowed?allowed.includes(q.id):/^[3-6][NCFRAMGPS]\d/.test(skill)&&q.reference===skill).map(q=>({...q,skillId:allowed?skill:missionSkill(q)}));
 });
 const seen=new Set<string>();
 return pool.filter(q=>{const fingerprint=mathematicalFingerprint([q.visual,q.fields]);if(seen.has(fingerprint))return false;seen.add(fingerprint);return true;}).slice(0,limit);
}
