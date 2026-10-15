export type NumberLineFamily = 'whole' | 'decimal' | 'negative' | 'fraction';

export interface NumberLineQuestion {
  id: number;
  kind: 'fluency' | 'reasoning';
  family: NumberLineFamily;
  prompt: string;
  labels: string[];
  values: number[];
  focusIndex: number;
  options: string[];
  answer: string;
}

let questionSequence = 0;
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
const decimal = (value: number) => Number(value.toFixed(3)).toString();
const fraction = (numerator: number, denominator: number) => {
  if (numerator === 0) return '0';
  const divisor = gcd(Math.abs(numerator), denominator);
  const top = numerator / divisor;
  const bottom = denominator / divisor;
  if (bottom === 1) return String(top);
  if (top > bottom) return `${Math.floor(top / bottom)} ${top % bottom}/${bottom}`;
  return `${top}/${bottom}`;
};

/** Five equally spaced markers: all arithmetic uses integer units, including decimals. */
export function buildNumberLineQuestion(
  levelId: number,
  roundIndex: number,
  isPractice = false,
  random: () => number = Math.random,
): NumberLineQuestion {
  const tier = Math.max(1, Math.min(5, levelId));
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const integer = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  let family: NumberLineFamily = 'whole';
  let denominator = 1;
  let start: number;
  let step: number;

  if (isPractice) {
    start = integer(0, 18);
    step = pick([1, 2]);
  } else if (tier === 1) {
    start = integer(0, 30);
    step = pick(roundIndex < 3 ? [1, 2, 3] : [2, 3, 4, 6]);
  } else if (tier === 2) {
    start = integer(20, 200);
    step = pick(roundIndex < 3 ? [2, 4, 5, 10] : [3, 4, 6, 8, 12, 15, 25]);
  } else if (tier === 3 || (tier === 5 && roundIndex % 3 === 0)) {
    family = 'decimal';
    denominator = 1000;
    start = tier === 3 ? integer(5, 95) * 10 : integer(115, 2995);
    step = tier === 3 ? pick(roundIndex < 3 ? [100, 200, 500] : [100, 200, 250, 400, 500]) : pick([25, 40, 75, 125, 150, 250]);
  } else if ((tier === 4 && roundIndex % 2 === 1) || (tier === 5 && roundIndex % 3 === 1)) {
    family = 'fraction';
    denominator = tier === 4 ? pick([4, 5, 8, 10]) : pick([6, 8, 10, 12]);
    start = tier === 4 ? integer(0, Math.floor(denominator / 2)) : integer(denominator - 3, denominator + 3);
    step = tier === 4 ? 1 : pick([1, 2, 3]);
  } else {
    family = 'negative';
    step = tier === 4 ? pick([2, 3, 4, 6, 7, 8, 12]) : pick([3, 4, 6, 7, 8, 12, 15]);
    // Every signed scale crosses zero; later scales need not include a tick at zero.
    start = -step * integer(1, 3) + (tier === 5 ? integer(1, step - 1) : 0);
  }

  const extrapolate = !isPractice && tier >= 2 && roundIndex >= 3 && roundIndex % 3 === 2;
  const focusIndex = extrapolate ? pick([0, 4]) : integer(1, 3);
  const visible = new Set(extrapolate ? [1, 3] : [0, 4]);
  if (isPractice) for (let index = 0; index < 5; index += 1) visible.add(index);
  else if (roundIndex < 3) visible.add(focusIndex === 1 ? 2 : focusIndex - 1);

  const units = Array.from({ length: 5 }, (_, index) => start + step * index);
  const format = (value: number) => family === 'fraction' ? fraction(value, denominator) : decimal(value / denominator);
  const answerUnits = units[focusIndex];
  const answer = format(answerUnits);
  const options = [answer];
  // Neighbouring ticks and an off-by-one/small-place-value error, rather than random guesses.
  for (const value of [answerUnits + step, answerUnits - step, answerUnits + (family === 'whole' || family === 'negative' ? 1 : Math.max(1, Math.floor(step / 2))), answerUnits + 2 * step]) {
    const choice = format(value);
    if (!options.includes(choice)) options.push(choice);
    if (options.length === 4) break;
  }
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [options[index], options[swap]] = [options[swap], options[index]];
  }

  return {
    id: ++questionSequence,
    kind: isPractice ? 'fluency' : 'reasoning',
    family,
    prompt: isPractice
      ? 'Find the missing number.\nEach gap has the same value.'
      : `Which ${family === 'fraction' ? 'fraction' : 'number'} belongs at the glowing marker?\n${extrapolate ? 'Use the labelled marks to work out the scale, then extend it.' : 'The gaps are equal. Work out the scale from the labelled marks.'}`,
    labels: units.map((value, index) => index === focusIndex ? '?' : visible.has(index) ? format(value) : ''),
    values: units.map(value => value / denominator),
    focusIndex,
    options,
    answer,
  };
}
