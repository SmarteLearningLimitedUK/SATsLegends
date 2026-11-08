import type {SatsMission} from './satsAdventure';

const DAY=86400000;
export const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
export const isLeapYear=(year:number)=>year%4===0&&(year%100!==0||year%400===0);
export const daysInMonth=(year:number,month:number)=>new Date(Date.UTC(year,month+1,0)).getUTCDate();
export const dateText=(date:string)=>new Date(date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
export const addDays=(date:string,days:number)=>new Date(Date.parse(date+'T00:00:00Z')+days*DAY).toISOString().slice(0,10);
export const dayDifference=(start:string,end:string)=>(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/DAY;
export interface CalendarQuestion {
 mission:SatsMission; year:number; month:number; start?:string; response:'number'|'date';
 answer:string; reminder:string;
}
/** Pure UTC calendar arithmetic prevents daylight-saving changes altering a day count. */
export function buildCalendarQuestion(tier:number,seed:number,round=0):CalendarQuestion {
 const n=Math.abs(Math.trunc(seed))+round*37,level=Math.max(1,Math.min(5,tier));
 const year=[2024,2025,2026,2028,2030,2032][n%6],month=Math.floor(n/6)%12;
 const start=`${year}-${String(month+1).padStart(2,'0')}-${String(18+n%9).padStart(2,'0')}`;
 let prompt:string,answer:string,skillId:string,reference:string,response:'number'|'date'='number',reminder:string;
 if(level===1){
  const yearFact=round%3===2;
  prompt=yearFact?`How many days are in ${year}?`:`How many days are in ${MONTHS[month]} ${year}?`;
  answer=String(yearFact?(isLeapYear(year)?366:365):daysInMonth(year,month));skillId='time.calendar-facts';reference='3M4e';
  reminder=yearFact?`${year} is ${isLeapYear(year)?'a leap year with 366 days':'an ordinary year with 365 days'}.`:`${MONTHS[month]} ${year} has ${answer} days.`;
 }else if(level===2){
  const years=1+n%8,months=1+Math.floor(n/8)%11,weeks=2+n%7,days=1+Math.floor(n/7)%6;
  const useMonths=round%2===1;
  prompt=useMonths?`How many months are in ${years} years and ${months} months?`:`How many days are in ${weeks} weeks and ${days} days?`;
  answer=String(useMonths?years*12+months:weeks*7+days);skillId='time.calendar-conversion';reference='4M4c';
  reminder=useMonths?`${years} × 12 + ${months} = ${answer} months.`:`${weeks} × 7 + ${days} = ${answer} days.`;
 }else if(level===3){
  const days=8+n%19,end=addDays(start,days);
  prompt=`A journey starts on ${dateText(start)} and ends on ${dateText(end)}. How many days elapse? Do not count the starting day.`;
  answer=String(days);skillId='time.calendar-duration';reference='3M4f';
  reminder=`Count forward from ${dateText(start)} to ${dateText(end)}: ${days} days.`;
 }else if(level===4){
  const weeks=1+n%3,days=1+Math.floor(n/3)%6;
  prompt=`An expedition starts on ${dateText(start)} and lasts ${weeks} weeks and ${days} days. Select its finishing date.`;
  answer=addDays(start,weeks*7+days);response='date';skillId='time.calendar-schedule';reference='4M4c';
  reminder=`${weeks} × 7 + ${days} = ${weeks*7+days} days after ${dateText(start)} is ${dateText(answer)}.`;
 }else{
  const days=8+n%15,weekday=n%7,earliest=addDays(start,days),earliestDay=new Date(earliest+'T00:00:00Z').getUTCDay();
  answer=addDays(earliest,(weekday-earliestDay+7)%7);response='date';skillId='time.calendar-schedule';reference='3M4f';
  const dayName=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][weekday];
  prompt=`Training starts ${dateText(start)} and takes at least ${days} days. What is the first ${dayName} you can leave?`;
  reminder=`Training finishes no earlier than ${dateText(earliest)}. The first ${dayName} on or after that is ${dateText(answer)}.`;
 }
 const mission:SatsMission={id:`calendar-${level}`,skillId,reference,domain:'M',game:'calendar_quest',difficulty:level,prompt,visual:{type:'equation',lines:[prompt]},fields:[{label:response==='date'?'Your date':'Answer',answer}],explanation:reminder,marks:1};
 return {mission,year,month,start:level>=3?start:undefined,response,answer,reminder};
}
