import { answersMatch, normaliseAnswer, type SatsMission } from './satsAdventure';

/** Stable answer tiles let a learner revisit a mission without the choices moving. */
export function getMissionFieldChoices(mission: SatsMission, fieldIndex: number): string[] {
  const field = mission.fields[fieldIndex];
  if (!field) return [];
  const answer = field.answer;
  const candidates = field.options ? [...field.options] : [answer];

  if (!field.options) {
    const numeric = answer.match(/^(-?\d+)(?:\.(\d+))?$/);
    const fraction = answer.match(/^(-?\d+)\/(\d+)$/);
    const time = answer.match(/^(\d{1,2}):(\d{2})$/);
    if (numeric) {
      const places = numeric[2]?.length ?? 0;
      const scale = 10 ** places;
      const value = Math.round(Number(answer) * scale);
      const magnitude = Math.max(1, Math.abs(value));
      const step = Math.max(1, 10 ** Math.max(0, Math.floor(Math.log10(magnitude)) - 2));
      for (const offset of [-2, -1, 1, 2, -3, 3]) {
        const next = value + offset * step;
        if (value >= 0 && next < 0) continue;
        candidates.push((next / scale).toFixed(places));
      }
    } else if (fraction) {
      const numerator = Number(fraction[1]);
      const denominator = Number(fraction[2]);
      candidates.push(`${numerator + 1}/${denominator}`, `${Math.max(1, numerator - 1)}/${denominator}`,
        `${numerator}/${denominator + 1}`, `${numerator}/${Math.max(2, denominator - 1)}`);
    } else if (time) {
      const minutes = Number(time[1]) * 60 + Number(time[2]);
      for (const offset of [-15, -5, 5, 15]) {
        const next = (minutes + offset + 1440) % 1440;
        candidates.push(`${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`);
      }
    }
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = normaliseAnswer(candidate);
    if (seen.has(key)) continue;
    if (candidate !== answer && answersMatch(candidate, answer)) continue;
    seen.add(key);
    unique.push(candidate);
    if (unique.length === (field.options?.length ?? 4)) break;
  }
  if (!seen.has(normaliseAnswer(answer))) unique.unshift(answer);
  let state = [...`${mission.id}:${fieldIndex}:${answer}`].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 17);
  for (let index = unique.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [unique[index], unique[swap]] = [unique[swap], unique[index]];
  }
  return unique;
}
