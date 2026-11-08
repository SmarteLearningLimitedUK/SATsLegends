import {MONTHS,daysInMonth} from '../../systems/content/calendarQuestions';
import './revision-activities.css';
export default function CalendarBoard({year,month,start,selected}:{year:number;month:number;start?:string;selected?:string}){
 const first=(new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7;
 const weeks=Math.ceil((first+daysInMonth(year,month))/7);
 return <div className="revision-calendar" role="group" aria-label={`${MONTHS[month]} ${year}`}>
  <strong>{MONTHS[month]} {year}</strong>
  <div className="revision-calendar-grid" role="table" aria-label="Calendar, Monday to Sunday" style={{gridTemplateRows:`18px repeat(${weeks},minmax(0,1fr))`}}>
   <div role="row">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span role="columnheader" key={day}>{day}</span>)}</div>
   {Array.from({length:weeks},(_,week)=><div role="row" key={week}>{Array.from({length:7},(_,column)=>{
    const day=week*7+column-first+1,date=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return <span role="cell" key={column} aria-label={day>0&&day<=daysInMonth(year,month)?`${day} ${MONTHS[month]} ${year}${date===start?', starting date':''}${date===selected?', your selected date':''}`:undefined} data-calendar-start={date===start||undefined} data-calendar-selected={date===selected||undefined}>{day>0&&day<=daysInMonth(year,month)?day:''}</span>;
   })}</div>)}
  </div>
 </div>;
}
