export function fractionShare(part:number,total:number):string {let a=part,b=total;while(b)[a,b]=[b,a%b];return `${part/a}/${total/a}`;}
/** All wrong reports keep the same total; a correct total alone cannot solve a pie case. */
export function proportionalReports(counts:number[],correct:number,seed:number):number[][] {
 const reports:number[][]=[],used=new Set([counts.join(',')]);let salt=Math.abs(seed);
 for(let index=0;index<4;index++){
  if(index===correct){reports.push([...counts]);continue;}
  let candidate:number[];
  do{candidate=[...counts];const from=1+salt%3,to=1+(salt+1)%3,change=1+Math.floor(salt/3)%Math.max(1,counts[from]-1);candidate[from]-=change;candidate[to]+=change;salt++;}while(used.has(candidate.join(',')));
  used.add(candidate.join(','));reports.push(candidate);
 }
 return reports;
}
export function pieEvidence(tier:number,seed:number) {
 const n=Math.abs(seed),parts=tier===3?[4,2,1,1]:tier===4?[[1,2,3,6],[2,3,3,4]][n%2]:[[1,2,4,5],[2,3,5,6]][n%2],unit=2+n%8,counts=parts.map(p=>p*unit),total=counts.reduce((a,b)=>a+b,0);
 return {counts,brief:tier>=5?`Gems: ${counts[0]}. Use the shares to find the matching stash.`:`${total} items in total. Which stash matches every share?`,family:tier>=5?'missing-whole':'known-whole'};
}
