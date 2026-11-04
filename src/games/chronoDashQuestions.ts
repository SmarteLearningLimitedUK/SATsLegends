export interface ClockTime { hours: number; minutes: number }
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
