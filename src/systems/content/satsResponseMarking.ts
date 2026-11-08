import type { SatsMission } from './satsAdventure';
import { calculationSteps } from './calculationEvidence';
export { calculationEvidence } from './calculationEvidence';
/** Bounded arithmetic parser for method evidence. Never executes pupil text. */
export function markExtendedMission(q:SatsMission,values:string[],compare:(a:string,b:string)=>boolean):number|null{
 if(q.marking?.kind==='rectangle'){
  const match=(values[0]||'').match(/^rect:(\d+):(\d+)$/);if(!match)return 0;
  const a=Number(match[1]),b=Number(match[2]);if(a<1||b<1||a>20||b>20)return 0;
  return Number(a*b===q.marking.area)+Number(2*(a+b)===q.marking.perimeter);
 }
 if(q.marking?.kind==='tolerance'){
  const angle=/°|angle/i.test(q.fields[0].label+q.prompt);
  const text=(values[0]||'').trim().replace(/−/g,'-').replace(angle?/\s*°$/:/$^/,'');
  if(!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text))return 0;
  return Math.abs(Number(text)-Number(q.fields[0].answer))<=q.marking.margin?q.marks:0;
 }
 if(q.marking?.kind==='plot'){
  const rule=q.marking,parts=(values[0]||'').split(':');
  if(parts.shift()!==rule.prefix||parts.length!==rule.expected.length||parts.some(s=>!/^\d+$/.test(s)&&s!=='_'))return 0;
  const correct=parts.filter((s,i)=>s!=='_'&&Number(s)===rule.expected[i]).length;
  return Math.floor(correct*q.marks/rule.expected.length);
 }
 if(q.marking?.kind==='pairs'){
  const seen=new Set<string>(),rule=q.marking;
  return q.fields.reduce((marks,_,i)=>{const match=(values[i]||'').trim().match(/^\(?\s*(\d+)\s*,\s*(\d+)\s*\)?$/);if(!match)return marks;const a=+match[1],b=+match[2],key=`${a},${b}`;if(a<rule.min||b<rule.min||(rule.coefficientA??1)*a+(rule.coefficientB??1)*b!==rule.total||rule.ascending&&a>=b||seen.has(key))return marks;seen.add(key);return marks+1;},0);
 }
 if(q.marking?.kind==='method'){
  if(compare(values[0]||'',q.fields[0].answer))return q.marks;
  const authored=calculationSteps(q.fields.find(field=>field.response==='working')?.answer||'');
  const supplied=calculationSteps(values[1]||'');
  const matched=authored.filter(step=>supplied.some(actual=>actual.expression===step.expression));
  if(matched.some(step=>Math.abs(step.value-Number(q.fields[0].answer))<1e-8))return q.marks-1;
  return Math.min(q.marks-1,q.marking.intermediates.filter(v=>matched.some(step=>Math.abs(step.value-v)<1e-8)).length);
 }
 return null;
}
