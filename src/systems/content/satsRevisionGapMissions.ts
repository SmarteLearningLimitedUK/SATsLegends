import type { SatsMission, MissionField, MissionVisual } from './satsAdventure';

export type RevisionGapModel =
  | { kind: 'choice-pairs'; groups: { label: string; choices: string[] }[]; pairing: string }
  | { kind: 'fraction-grid'; numerator: number; denominator: number; targetDenominator: number; construct: boolean }
  | { kind: 'similar-rectangles'; width: number; height: number; enlargedWidth: number }
  | { kind: 'pictogram-build'; labels: string[]; counts: number[]; key: number };

/** Short SATs revision tasks, reused by the existing island practice and Core papers. */
export function revisionGapMissions(seed: number): SatsMission[] {
  const n = Math.abs(Math.trunc(seed));
  const cycle = Math.floor(n / 12);
  const out: SatsMission[] = [];
  const field = (label: string, answer: number | string, options?: string[]): MissionField => ({ label, answer: String(answer), options });
  const equation = (...lines: string[]): MissionVisual => ({ type: 'equation', lines });
  const add = (id: string, reference: string, game: string, difficulty: number, prompt: string,
    visual: MissionVisual, fields: MissionField[], explanation: string) => {
    const mission: SatsMission = { id: `revision-${id}`, reference, domain: reference.match(/[NCFRAMGPS]/)![0] as SatsMission['domain'],
      game, difficulty, prompt, visual, fields, explanation, marks: fields.length };
    out.push(mission);
    return mission;
  };
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const leap = cycle % 2 === 1;
  const days = [31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
  const month = n % 12;
  add('month-days','3M4e','time_keeper_cove',1,
    `How many days are there in ${months[month]}${month === 1 ? ` in ${leap ? 'a leap' : 'an ordinary'} year` : ''}?`,
    equation(months[month]), [field('Days', days[month])], `${months[month]} has ${days[month]} days${month === 1 ? ` in ${leap ? 'a leap' : 'an ordinary'} year` : ''}.`);
  add('year-days','3M4e','time_keeper_cove',1, `How many days are there in ${n % 2 ? 'a leap' : 'an ordinary'} year?`,
    equation(n % 2 ? 'Leap year' : 'Ordinary year'), [field('Days', n % 2 ? 366 : 365)], n % 2 ? 'A leap year has 366 days.' : 'An ordinary year has 365 days.');
  const years = 1 + n % 8, extraMonths = 1 + cycle % 11, totalMonths = years * 12 + extraMonths;
  add('years-months','4M4c','time_keeper_cove',2,
    n % 2 ? `Write ${totalMonths} months as whole years and extra months.` : `How many months are there in ${years} years and ${extraMonths} months?`,
    equation(n % 2 ? `${totalMonths} months` : `${years} years ${extraMonths} months`),
    n % 2 ? [field('Whole years', years), field('Extra months', extraMonths)] : [field('Months', totalMonths)],
    `${years} × 12 + ${extraMonths} = ${totalMonths} months.`);

  const denominator = [2,4,5,10][n % 4], numerator = 1 + cycle % (denominator - 1);
  const targetDenominator = n % 3 === 0 ? 100 : denominator * (n % 3 === 1 ? 2 : 3);
  add('fraction-equivalent','5F2b','match3_equivalence',2,
    `The diagram shows a shaded fraction. Complete the equivalent fraction: □/${targetDenominator}.`,
    { type: 'depth', model: { kind: 'fraction-grid', numerator, denominator, targetDenominator, construct: false } },
    [field('Missing numerator', numerator * targetDenominator / denominator)],
    `${numerator}/${denominator} = ${numerator * targetDenominator / denominator}/${targetDenominator}.`);
  add('fraction-shade','5F2b','match3_equivalence',3,
    'Shade the same fraction of the second diagram. Both diagrams represent one whole.',
    { type: 'depth', model: { kind: 'fraction-grid', numerator, denominator, targetDenominator: 100, construct: true } },
    [field('Shaded grid', `shade:${numerator * 100 / denominator}`)],
    `Shade ${numerator * 100 / denominator} of the 100 squares to match ${numerator}/${denominator}.`);

  // Keep the operands in integer units so rounding does not depend on float ties.
  const dividend = 5 + n % 23, divisor = [3,6,7,9][cycle % 4];
  const centimetres = Math.floor((dividend * 100 + divisor / 2) / divisor);
  add('context-round','6F10','unit_mixer',4,
    `A ribbon is ${dividend} m long. It is cut into ${divisor} equal pieces. How long is each piece? Give your answer in centimetres, rounded to the nearest centimetre.`,
    equation(`${dividend} m shared into ${divisor} equal pieces`), [field('Length of each piece (cm)', centimetres)],
    `${dividend} m = ${dividend * 100} cm. Divide by ${divisor} and round to the nearest centimetre: ${centimetres} cm.`);
  const width = 2 + n % 7, height = width + 1 + cycle % 4, factor = [2,3,4,5][cycle % 4];
  add('unknown-scale','6R3','scale_builder',3,
    'These rectangles are similar. Find the enlargement scale factor from A to B, then find the missing height.',
    { type: 'depth', model: { kind: 'similar-rectangles', width, height, enlargedWidth: width * factor } },
    [field('Scale factor', factor), field('Height of B (cm)', height * factor)],
    `${width * factor} ÷ ${width} = ${factor}. The height is ${height} × ${factor} = ${height * factor} cm.`);

  const key = [2,4,6,10][n % 4], halves = [2 + cycle % 5,3 + n % 5,1 + Math.floor(n / 7) % 7];
  const counts = halves.map(value => value * key / 2);
  const pic = add('pictogram-build','3S1','graph_grabber',3,
    'Complete the pictogram to match the table. Use the key. You may use half a symbol.',
    { type: 'depth', model: { kind: 'pictogram-build', labels: ['Books','Maps','Pens'], counts, key } },
    [field('Completed pictogram', `pictogram:${halves.join(':')}`)],
    `Each whole symbol represents ${key} items and each half represents ${key / 2}.`);
  pic.marks = 2;
  pic.marking = { kind: 'plot', prefix: 'pictogram', expected: halves };

  const first = 2 + n % 5, second = 2 + cycle % 5;
  const choices = [
    { prompt: `A café offers ${first} types of sandwich and ${second} types of drink. Each meal has one sandwich and one drink. How many different meals are possible?`, result: 'meals',
      labels: ['Sandwiches', 'Drinks'], lists: [['Cheese', 'Egg', 'Tuna', 'Ham', 'Chicken', 'Salad'], ['Water', 'Milk', 'Apple juice', 'Orange juice', 'Lemonade', 'Grape juice']], pairing: 'One meal = one sandwich + one drink' },
    { prompt: `A shop offers ${first} colours of shirt and ${second} colours of trousers. Each outfit has one shirt and one pair of trousers. How many different outfits are possible?`, result: 'outfits',
      labels: ['Shirt colours', 'Trouser colours'], lists: [['Red', 'Blue', 'Green', 'White', 'Yellow', 'Purple'], ['Black', 'Grey', 'Brown', 'Navy', 'White', 'Blue']], pairing: 'One outfit = one shirt + one pair of trousers' },
    { prompt: `A flag has two stripes. There are ${first} colour choices for the top stripe and ${second} for the bottom stripe, as shown. How many different flags are possible?`, result: 'flags',
      labels: ['Top stripe colours', 'Bottom stripe colours'], lists: [['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'], ['White', 'Black', 'Grey', 'Pink', 'Brown', 'Gold']], pairing: 'One flag = one top stripe + one bottom stripe' },
  ][n % 3];
  add('combinations','4C8','multiplication_mine',3, choices.prompt,
    { type: 'depth', model: { kind: 'choice-pairs', groups: choices.labels.map((label, i) => ({ label, choices: choices.lists[i].slice(0, i === 0 ? first : second) })), pairing: choices.pairing } },
    [field(`Number of different ${choices.result}`, first * second)], `${first} × ${second} = ${first * second}.`);
  const estimates = [
    ['the mass of an apple','200 g',['2 g','200 g','20 kg','200 kg']],
    ['the length of a pencil','18 cm',['18 mm','18 cm','18 m','18 km']],
    ['the capacity of a bucket','10 litres',['10 ml','100 ml','10 litres','1000 litres']],
    ['the mass of an adult','70 kg',['70 g','700 g','70 kg','7000 kg']],
    ['the capacity of a teaspoon','5 ml',['5 ml','500 ml','5 litres','50 litres']],
    ['the price of a loaf of bread','£1.50',['£0.02','£1.50','£150','£1500']],
  ] as const;
  const estimate = estimates[n % estimates.length];
  add('measure-estimate','4M2','conversion_canyon',2, `Which is the best estimate for ${estimate[0]}?`,
    equation(`Estimate ${estimate[0]}`), [field('Best estimate', estimate[1], [...estimate[2]])], `${estimate[1]} is the sensible estimate for ${estimate[0]}.`);
  return out;
}
