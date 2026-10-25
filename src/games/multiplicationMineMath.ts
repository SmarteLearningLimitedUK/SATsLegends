export interface MultiplicationStep {
  kind: 'column' | 'placeholder' | 'sum' | 'zero';
  row: number;
  place: number;
  digit?: number;
  multiplier?: number;
  carry: number;
  answer: number;
  lastColumn?: boolean;
  prompt: string;
}

/** Written multiplication proceeds right to left, ones row before tens row. */
export function multiplicationSteps(a: number, b: number): MultiplicationStep[] {
  const digits = String(a).split('').reverse().map(Number);
  const steps: MultiplicationStep[] = [];
  const multipliers = b >= 10 ? [b % 10, Math.floor(b / 10)] : [b];
  for (let row = 0; row < multipliers.length; row++) {
    if (row === 1) steps.push({ kind: 'placeholder', row, place: 0, carry: 0, answer: 0, prompt: 'Tens row: which placeholder goes in the ones column?' });
    if (multipliers[row] === 0) {
      steps.push({ kind: 'zero', row, place: 0, carry: 0, answer: 0, prompt: `Ones row: ${a} × 0 = ?` });
      continue;
    }
    let carry = 0;
    digits.forEach((digit, place) => {
      const answer = digit * multipliers[row] + carry;
      steps.push({ kind: 'column', row, place, digit, multiplier: multipliers[row], carry, answer, lastColumn: place === digits.length - 1, prompt: `${row === 1 ? 'Tens row' : 'Ones row'}: ${digit} × ${multipliers[row]}${carry ? ` + ${carry} carried` : ''} = ?` });
      carry = Math.floor(answer / 10);
    });
  }
  if (b >= 10) steps.push({ kind: 'sum', row: 2, place: 0, carry: 0, answer: a * b, prompt: 'Add the two aligned rows. What is the final product?' });
  return steps;
}

export function multiplicationWorking(a: number, b: number, completed: number) {
  const rows: Record<number, string>[] = [{}, {}, {}];
  const carries: Record<number, number>[] = [{}, {}];
  for (const step of multiplicationSteps(a, b).slice(0, completed)) {
    if (step.kind === 'placeholder') rows[1][0] = '0';
    else if (step.kind === 'zero') rows[step.row][step.row] = '0';
    else if (step.kind === 'sum') String(step.answer).split('').reverse().forEach((digit, place) => { rows[2][place] = digit; });
    else {
      const outputPlace = step.place + step.row;
      rows[step.row][outputPlace] = String(step.answer % 10);
      const nextCarry = Math.floor(step.answer / 10);
      if (step.lastColumn && nextCarry) rows[step.row][outputPlace + 1] = String(nextCarry);
      else if (nextCarry) carries[step.row][step.place + 1] = nextCarry;
    }
  }
  return { rows, carries };
}
