import type {SatsDomain} from './satsAdventure';

export interface AssessmentConditions {
  mode:'standard'|'supported'; untimed:boolean; extraTimePercent:0|25|50;
  reducedMovement:boolean; reducedEffects:boolean; calmAudio:boolean;
  readAloud:boolean; repeatInstructions:boolean; workingMemorySupport:boolean;
}
export const STANDARD_ASSESSMENT:AssessmentConditions={mode:'standard',untimed:false,extraTimePercent:0,reducedMovement:false,reducedEffects:false,calmAudio:false,readAloud:false,repeatInstructions:false,workingMemorySupport:false};
export type AssessmentResponse =
  | {kind:'number'|'fraction'|'mixed'|'parts'}
  | {kind:'select-one';options:string[]}
  | {kind:'select-many';options:string[]}
  | {kind:'matching';left:string[];right:string[]}
  | {kind:'ordering';values:string[]}
  | {kind:'table';headings:string[];rows:string[][];cells:[number,number][]}
  | {kind:'blanks';lines:string[]}
  | {kind:'construction'}
  | {kind:'proof-prime'};
export type AssessmentRubric =
  | {kind:'all'}
  | {kind:'parts';marks:number[]}
  | {kind:'threshold';full:number;partial:number}
  | {kind:'selection';correct:string[];partialCorrect:number;allowOneExtra:boolean}
  | {kind:'method';expressions:string[];partialExpressions?:string[]}
  | {kind:'formal';operation:'multiply'|'divide';a:number;b:number}
  | {kind:'construction';partialCorrect?:number}
  | {kind:'prime-proof'};
export interface AssessmentMetadata {
  quiz?:true;
  version:2; archetypeId:string; instanceId:string; benchmarkIds:string[];
  response:AssessmentResponse; rubric:AssessmentRubric;
  /** Each part belongs to one primary domain. Secondary references do not add marks. */
  parts:{id:string;marks:number;reference:string;skillId:string;domain:SatsDomain}[];
  cognitive:{depth:number;computation:number;spatial:number;response:number;status:'author-reviewed; teacher moderation pending'};
  provenance:'Original Matharia SATs-style practice';
}
