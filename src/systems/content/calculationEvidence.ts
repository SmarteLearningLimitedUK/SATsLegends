type Step = { value: number; expression: string };
/** Bounded, completely tokenised arithmetic; never executes pupil text. */
export function calculationSteps(text: string): Step[] {
  const results: Step[] = [];
  for (const line of text.slice(0, 2000).replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').split(/[\n;=]/)) {
    const clean = line.replace(/\s/g, '');
    const tokens = line.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-]/g) ?? [];
    if (!clean || tokens.join('') !== clean || tokens.length > 160) continue;
    let i = 0;
    const computed: Step[] = [];
    const combine = (a: Step, op: string, b: Step): Step => {
      const value = op === '+' ? a.value + b.value : op === '-' ? a.value - b.value : op === '*' ? a.value * b.value : a.value / b.value;
      if (!Number.isFinite(value)) throw Error('division');
      const operands = op === '+' || op === '*' ? [a.expression, b.expression].sort() : [a.expression, b.expression];
      const result = { value, expression: `(${operands[0]}${op}${operands[1]})` };
      computed.push(result); return result;
    };
    const atom = (): Step => {
      if (tokens[i] === '+' || tokens[i] === '-') { const sign = tokens[i++]; const n = atom(); return sign === '-' ? { value: -n.value, expression: String(-n.value) } : n; }
      if (tokens[i] === '(') { i++; const n = expression(); if (tokens[i++] !== ')') throw Error('bracket'); return n; }
      const token = tokens[i++];
      if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw Error('number');
      return { value: Number(token), expression: String(Number(token)) };
    };
    const product = (): Step => { let n = atom(); while (tokens[i] === '*' || tokens[i] === '/') n = combine(n, tokens[i++], atom()); return n; };
    const expression = (): Step => { let n = product(); while (tokens[i] === '+' || tokens[i] === '-') n = combine(n, tokens[i++], product()); return n; };
    try { expression(); if (i === tokens.length) results.push(...computed); } catch { /* Invalid/incomplete working has no automatic method credit. */ }
  }
  return results;
}
export const calculationEvidence = (text: string): number[] => calculationSteps(text).map(step => step.value);
