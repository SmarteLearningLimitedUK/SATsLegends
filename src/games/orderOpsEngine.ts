export type OpsToken = number | '+' | '-' | '×' | '(' | ')';

export interface OpsRound {
  tokens: OpsToken[];
  answer: number;
  hint: string;
}

export interface OpsChoice {
  id: string;
  operationIndex: number;
  label: string;
  result: number;
  correct: boolean;
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(values: T[]): T[] => {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const other = randomInt(0, index);
    [next[index], next[other]] = [next[other], next[index]];
  }
  return next;
};

export const createOpsRound = (levelId: number): OpsRound => {
  const tier = Math.max(1, Math.min(5, levelId));
  const factorMax = [3, 5, 7, 10, 12][tier - 1];
  const modes = tier === 1 ? ['mixed'] : tier === 2 ? ['mixed', 'brackets'] : ['mixed', 'brackets', 'doubleMultiply'];
  const mode = modes[randomInt(0, modes.length - 1)];

  if (mode === 'brackets') {
    const a = randomInt(2, 3 + tier * 2);
    const b = randomInt(2, factorMax);
    const c = randomInt(2, Math.min(9, tier + 3));
    return { tokens: ['(', a, '+', b, ')', '×', c], answer: (a + b) * c, hint: 'Work inside brackets first.' };
  }
  if (mode === 'doubleMultiply') {
    const a = randomInt(2, factorMax);
    const b = randomInt(2, Math.max(3, factorMax - 2));
    const c = randomInt(2, factorMax);
    const d = randomInt(2, Math.max(3, factorMax - 3));
    return { tokens: [a, '×', b, '+', c, '×', d], answer: a * b + c * d, hint: 'Either multiplication can be solved first.' };
  }
  const a = randomInt(tier === 1 ? 2 : 5, 12 + tier * 7);
  const b = randomInt(2, factorMax);
  const c = randomInt(2, Math.min(9, tier + 2));
  const d = tier === 1 ? 0 : randomInt(1, Math.min(tier * 2, a + b * c - 1));
  return {
    tokens: d ? [a, '+', b, '×', c, '-', d] : [a, '+', b, '×', c],
    answer: a + b * c - d,
    hint: 'Multiply before adding or subtracting.',
  };
};

const isOperator = (token: OpsToken): token is '+' | '-' | '×' => token === '+' || token === '-' || token === '×';

const calculate = (left: number, operator: '+' | '-' | '×', right: number) =>
  operator === '×' ? left * right : operator === '+' ? left + right : left - right;

const operationIndices = (tokens: OpsToken[]) => tokens.flatMap((token, index) =>
  isOperator(token) && typeof tokens[index - 1] === 'number' && typeof tokens[index + 1] === 'number' ? [index] : []);

/** Brackets first, then multiplication, then addition/subtraction from left to right. */
export const nextValidOperationIndices = (tokens: OpsToken[]): number[] => {
  const indices = operationIndices(tokens);
  const open = tokens.indexOf('(');
  const close = tokens.indexOf(')');
  const eligible = open >= 0 && close > open ? indices.filter((index) => index > open && index < close) : indices;
  const products = eligible.filter((index) => tokens[index] === '×');
  return products.length ? products : eligible.length ? [eligible[0]] : [];
};

export const applyOperation = (tokens: OpsToken[], operationIndex: number): OpsToken[] => {
  const left = tokens[operationIndex - 1];
  const operator = tokens[operationIndex];
  const right = tokens[operationIndex + 1];
  if (typeof left !== 'number' || !isOperator(operator) || typeof right !== 'number') return tokens;
  const next = [
    ...tokens.slice(0, operationIndex - 1),
    calculate(left, operator, right),
    ...tokens.slice(operationIndex + 2),
  ];
  for (let index = 0; index < next.length - 2; index += 1) {
    if (next[index] === '(' && typeof next[index + 1] === 'number' && next[index + 2] === ')') {
      next.splice(index, 3, next[index + 1]);
      index = -1;
    }
  }
  return next;
};

export const getOperationChoices = (tokens: OpsToken[]): OpsChoice[] => {
  const indices = operationIndices(tokens);
  const valid = new Set(nextValidOperationIndices(tokens));
  const correct = indices.filter((index) => valid.has(index));
  const wrongOrder = indices.filter((index) => !valid.has(index));
  const makeChoice = (index: number, result: number, isCorrect: boolean): OpsChoice => {
    const left = tokens[index - 1] as number;
    const right = tokens[index + 1] as number;
    const repeatedPart = indices.filter((other) => tokens[other - 1] === left && tokens[other] === tokens[index] && tokens[other + 1] === right).length > 1;
    const partLabel = repeatedPart ? `Part ${indices.indexOf(index) + 1}: ` : '';
    return {
      id: `${index}-${result}`,
      operationIndex: index,
      label: `${partLabel}${left} ${tokens[index]} ${right} = ${result}`,
      result,
      correct: isCorrect,
    };
  };
  const choices = correct.map((index) => makeChoice(index, calculate(tokens[index - 1] as number, tokens[index] as '+' | '-' | '×', tokens[index + 1] as number), true));
  for (const index of wrongOrder) {
    if (choices.length >= 4) break;
    choices.push(makeChoice(index, calculate(tokens[index - 1] as number, tokens[index] as '+' | '-' | '×', tokens[index + 1] as number), false));
  }
  const offsets = shuffle([1, -1, 2, -2, 3, -3, 5, -5, 10]);
  for (const offset of offsets) {
    if (choices.length >= 4 || correct.length === 0) break;
    const index = correct[0];
    const actual = calculate(tokens[index - 1] as number, tokens[index] as '+' | '-' | '×', tokens[index + 1] as number);
    const candidate = actual + offset;
    if (candidate < 0 || choices.some((choice) => choice.id === `${index}-${candidate}`)) continue;
    choices.push(makeChoice(index, candidate, false));
  }
  return shuffle(choices);
};

export const formatOpsTokens = (tokens: OpsToken[]) => tokens.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
