export const REVISION_SESSION_IDLE_MS=30*60*1000;
export interface RevisionSession {id:string;lastActiveAt:number;}
/** A game or quest segment is a run; a revision session may contain many runs. */
export function revisionSession(previous:RevisionSession|null,now:number,newId:()=>string):RevisionSession {
  const elapsed=previous?now-previous.lastActiveAt:Infinity;
  return {id:previous&&elapsed>=0&&elapsed<REVISION_SESSION_IDLE_MS?previous.id:newId(),lastActiveAt:now};
}
