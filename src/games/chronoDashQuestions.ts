export interface ClockTime { hours: number; minutes: number }
export function buildClockRevision(tier:number,seed:number,round:number) {
 const n=Math.abs(seed),step=tier===3?15:tier===4?5:1;
 const start=tier===5&&round%3===0?23*60+50:(n%24)*60+Math.floor(n/24)%Math.floor(60/step)*step;
 const duration=tier===3?[15,30,45,60][n%4]:tier===4?[25,40,65,85][n%4]:[17,39,76,95,128][n%5];
 const reverse=tier>=5&&round%2===1,target=((start+(reverse?-duration:duration))%1440+1440)%1440;
 const time=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
 return {target:{hours:Math.floor(target/60)%12||12,minutes:target%60},start,duration,family:reverse?'departure':'arrival',prompt:reverse?`A trip ends at ${time(start)} after ${duration} minutes. Set its departure time.`:`A trip starts at ${time(start)} and lasts ${duration} minutes. Set its arrival time.`};
}
export const CLOCK_VARIANTS = [
  { face: 'digits', question: 'digits' },
  { face: 'roman', question: 'digits' },
  { face: 'digits', question: 'roman' },
  { face: 'roman', question: 'roman' },
] as const;

// Only positive clock values are converted: Roman numerals have no zero.
export function clockRoman(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 59) throw new RangeError('Expected a clock value from 1 to 59');
  let remaining = value;
  let result = '';
  for (const [amount, symbol] of [[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']] as const) {
    while (remaining >= amount) { result += symbol; remaining -= amount; }
  }
  return result;
}

export const displayClockTime = (time: ClockTime) => `${String(time.hours).padStart(2,'0')}:${String(time.minutes).padStart(2,'0')}`;
export function clockQuestion(time: ClockTime, format: 'digits' | 'roman'): string {
  if (format === 'digits') return `Set the clock to ${displayClockTime(time)}.`;
  if (time.minutes === 0) return `Set the clock to ${clockRoman(time.hours)} o’clock.`;
  return `Set the clock to ${clockRoman(time.hours)} hours and ${clockRoman(time.minutes)} ${time.minutes === 1 ? 'minute' : 'minutes'}.`;
}

export function clockLabels(format: 'digits' | 'roman'): string[] {
  return Array.from({length: 12}, (_, index) => {
    const value = index === 0 ? 12 : index;
    return format === 'roman' ? clockRoman(value) : String(value);
  });
}
