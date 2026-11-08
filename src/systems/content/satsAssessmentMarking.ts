import type {SatsMission} from './satsAdventure';
import {markExtendedMission} from './satsResponseMarking';

const array=(text:string):string[]|null=>{try{const q=JSON.parse(text);return Array.isArray(q)&&q.length<=30&&q.every(v=>typeof v==='string')?q:null;}catch{return null;}};
/** One point for a complete correct quiz answer. Working never contributes. */
export function markAssessment(q:SatsMission,values:string[],_working:string,compare:(a:string,b:string)=>boolean):number|null{
 const a=q.assessment;if(!a?.quiz)return null;
 const equal=(i:number)=>{
  const f=q.fields[i],answer=values[i]??'';
  if(f.response==='working')return true;
  if(f.response==='ordered'||f.response==='sequence'||f.response==='set'){
   const separator=f.response==='sequence'?';':',',actual=answer.split(separator).map(v=>v.trim()),expected=f.answer.split(separator).map(v=>v.trim());
   return actual.length===expected.length&&actual.every(Boolean)&&(f.response==='set'?new Set(actual).size===actual.length&&actual.every(v=>expected.some(e=>compare(v,e))):actual.every((v,j)=>compare(v,expected[j])));
  }
  if(/simplest|simplify|lowest terms/i.test(q.prompt+' '+f.label)&&f.answer.includes('/')){
   const fraction=answer.trim().match(/^(?:\d+\s+)?(\d+)\s*\/\s*(\d+)$/);if(!fraction)return false;
   let n=Number(fraction[1]),d=Number(fraction[2]);if(d===0)return false;while(d){[n,d]=[d,n%d];}if(n!==1)return false;
  }
  const symbol=/percentage|percent|%/i.test(f.label)?'%':/°/.test(f.label)?'°':'';
  return compare(answer,f.answer)||Boolean(symbol&&answer.trim().endsWith(symbol)&&compare(answer.trim().slice(0,-1),f.answer));
 };
 if(a.response.kind==='ordering'){
  const actual=array(values[0]??''),expected=array(q.fields[0].answer);
  return Number(Boolean(actual&&expected&&actual.length===expected.length&&actual.every((v,i)=>compare(v,expected[i]))));
 }
 if(a.response.kind==='select-many'){
  const actual=array(values[0]??''),expected=array(q.fields[0].answer);
  return Number(Boolean(actual&&expected&&new Set(actual).size===actual.length&&actual.length===expected.length&&actual.every(v=>expected.includes(v))));
 }
 if(q.marking?.kind==='plot'){
  const rule=q.marking,parts=(values[0]??'').split(':');
  return Number(parts.shift()===rule.prefix&&parts.length===rule.expected.length&&parts.every((v,i)=>/^\d+$/.test(v)&&Number(v)===rule.expected[i]));
 }
 if(q.marking?.kind==='rectangle')return Number(markExtendedMission(q,values,compare)===2);
 if(q.marking?.kind==='pairs')return Number(markExtendedMission(q,values,compare)===q.fields.length);
 if(q.marking?.kind==='tolerance')return Number(markExtendedMission(q,values,compare)===1);
 if(q.visual.type==='symmetry'){
  const actual=(values[0]??'').split(';').map(v=>v.trim()).sort(),expected=q.fields[0].answer.split(';').sort();
  return Number(actual.length===expected.length&&actual.every((v,i)=>v===expected[i]));
 }
 return Number(q.fields.every((_,i)=>equal(i)));
}
