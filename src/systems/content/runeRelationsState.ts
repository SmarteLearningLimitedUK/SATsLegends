import {checkRuneAnswer,type RuneQuestion,type RuneResponse} from './runeRelationsQuestions';
export interface RuneState {index:number;restored:number;score:number;attempts:number;mistakes:number;phase:'playing'|'correct'|'complete'|'failed';feedback:{correct:boolean;text:string}|null;notice:string;}
export const initialRuneState=():RuneState=>({index:0,restored:0,score:0,attempts:0,mistakes:0,phase:'playing',feedback:null,notice:''});
export function submitRune(state:RuneState,question:RuneQuestion,response:RuneResponse,relaxed:boolean,lives=3):RuneState{
 if(state.phase!=='playing'||state.feedback)return state;
 const result=checkRuneAnswer(question,response);if(!result.valid)return {...state,notice:result.message};
 return {...state,attempts:state.attempts+1,mistakes:state.mistakes+Number(!result.correct),score:state.score+Number(result.correct)*150,restored:state.restored+Number(result.correct),notice:'',feedback:{correct:result.correct,text:result.message},phase:result.correct?'correct':!relaxed&&lives<=1?'failed':'playing'};
}
export function advanceRune(state:RuneState):RuneState{return state.phase!=='correct'?state:{...state,index:state.index+1,phase:state.restored===10?'complete':'playing',feedback:null,notice:''};}
export const runeStars=(mistakes:number)=>mistakes===0?3:mistakes<=2?2:1;
