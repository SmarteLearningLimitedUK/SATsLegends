import {checkShatteredAnswer,type ShatteredQuestion,type ShatteredResponse} from './questions';
export const SHATTERED_POINTS_PER_FRAGMENT=150;
export interface ShatteredState {index:number;restored:number;score:number;mistakes:number;attempts:number;phase:'playing'|'correct'|'complete'|'failed';feedback:{correct:boolean;text:string}|null;notice:string;}
export const initialShatteredState=():ShatteredState=>({index:0,restored:0,score:0,mistakes:0,attempts:0,phase:'playing',feedback:null,notice:''});
export function submitShattered(state:ShatteredState,q:ShatteredQuestion,response:ShatteredResponse,relaxed:boolean,lives=3):ShatteredState {
 if(state.phase!=='playing'||state.feedback)return state;
 const result=checkShatteredAnswer(q,response);if(!result.valid)return {...state,notice:result.message};
 const mistakes=state.mistakes+Number(!result.correct);
 return {...state,notice:'',attempts:state.attempts+1,mistakes,phase:result.correct?'correct':!relaxed&&lives<=1?'failed':'playing',restored:state.restored+Number(result.correct),score:state.score+(result.correct?SHATTERED_POINTS_PER_FRAGMENT:0),feedback:{correct:result.correct,text:result.message}};
}
export function advanceShattered(state:ShatteredState):ShatteredState {
 if(state.phase!=='correct')return state;
 return {...state,index:state.index+1,phase:state.restored===10?'complete':'playing',feedback:null,notice:''};
}
export const shatteredStars=(mistakes:number)=>mistakes===0?3:mistakes<=2?2:1;
