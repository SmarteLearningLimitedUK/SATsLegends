import type { RevisionGapModel } from './satsRevisionGapMissions';
/** Models carry the givens; construction answers are kept separately in fields. */
export type DepthModel =
  | RevisionGapModel
  | { kind:'ruler'; start:number; end:number }
  | { kind:'capacity'; max:number; intervals:number; position:number }
  | { kind:'protractor'; angle:number; reversed:boolean }
  | { kind:'angle-draw'; target:number }
  | { kind:'rectangle-build'; area:number; perimeter:number }
  | { kind:'angle-picture'; angle:number }
  | { kind:'line-build'; labels:string[]; readings:number[]; max:number; step:number }
  | { kind:'pie-build'; labels:string[]; counts:number[] }
  | { kind:'pictogram'; labels:string[]; icons:number[]; key:number }
  | { kind:'estimate-line'; min:number; max:number; marker:number }
  | { kind:'irregular-area'; full:number; halves:number }
  | { kind:'line-types'; turn:number }
  | { kind:'circle-name'; part:'radius'|'diameter'|'circumference' }
  | { kind:'nets'; candidates:[number,number][][] }
  | { kind:'symmetry-axes'; square:boolean; turn:number };
export const depthConstruction = (model:DepthModel) => ['line-build','pie-build','pictogram-build','angle-draw','symmetry-axes','rectangle-build'].includes(model.kind) || model.kind === 'fraction-grid' && model.construct;
