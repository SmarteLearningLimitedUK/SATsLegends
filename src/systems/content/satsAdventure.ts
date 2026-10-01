/** Original game missions. Reference: STA KS2 mathematics framework, sections 4 and 6. */
export type SatsDomain = 'N' | 'C' | 'F' | 'R' | 'A' | 'M' | 'G' | 'P' | 'S';
export type MissionVisual =
  | { type: 'equation'; lines: string[] }
  | { type: 'fractions'; values: string[] }
  | { type: 'bars' | 'line'; labels: string[]; values: number[]; unit: string }
  | { type: 'grid'; points: [number, number][] }
  | { type: 'shape'; shape: 'rectangle' | 'triangle' | 'cuboid' | 'circle' | 'net'; labels: string[] }
  | { type: 'clock'; hours: number; minutes: number }
  | { type: 'numberline'; min: number; max: number; marker: number }
  | { type: 'pie'; labels: string[]; angles: number[] }
  | { type: 'table'; headings: string[]; rows: string[][] }
  | { type: 'ratio'; labels: string[]; parts: number[] }
  | { type: 'sequence'; values: string[] };
export interface MissionField { label: string; answer: string; options?: string[]; manual?: boolean; }
export interface SatsMission {
  id: string; domain: SatsDomain; reference: string; game: string; difficulty: number;
  prompt: string; visual: MissionVisual; fields: MissionField[]; explanation: string;
  marks: number; formalWorking?: boolean;
}
export interface SatsPaper { number: number; title: string; seconds: number; marks: number; missions: SatsMission[]; }
const field = (label: string, answer: string, options?: string[]): MissionField => ({ label, answer, options });
const equation = (...lines: string[]): MissionVisual => ({ type: 'equation', lines });
const mission = (id: string, reference: string, game: string, difficulty: number, prompt: string, visual: MissionVisual, fields: MissionField[], explanation: string): SatsMission => ({ id, domain: reference[1] as SatsDomain, reference, game, difficulty, prompt, visual, fields, explanation, marks: fields.length });
const fraction = (a: number, b: number) => `${a}/${b}`;
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
const reduced = (a: number, b: number) => { const d = gcd(a, b); return b / d === 1 ? String(a / d) : fraction(a / d, b / d); };

export function arithmeticMissions(seed = 1): SatsMission[] {
  const k = 1 + Math.abs(seed % 5);
  const q = (id: string, ref: string, game: string, difficulty: number, sum: string, answer: string, explanation: string) => mission(`ar-${id}`, ref, game, difficulty, 'Complete the calculation.', equation(sum), [field('Answer', answer)], explanation);
  const questions = [
    q('add', '3C2', 'calculation_clash', 1, `${320 + k} + 140 = □`, String(460 + k), 'Add hundreds, tens and ones in their matching columns.'),
    q('subtract', '3C2', 'calculation_clash', 1, `${700 + k} − 250 = □`, String(450 + k), 'Subtract in columns, exchanging a hundred for ten tens when needed.'),
    q('multiply', '4C6', 'multiplication_mine', 1, `${k + 4} × 8 = □`, String((k + 4) * 8), 'Use the 8 times table, or double the 4 times table.'),
    q('divide', '4C6', 'remainder_run', 1, `${(k + 7) * 6} ÷ 6 = □`, String(k + 7), 'Find which number multiplied by 6 gives the dividend.'),
    q('missing', '4C3', 'calculation_clash', 1, `□ + ${24 + k} = 100`, String(76 - k), `Undo addition: 100 − ${24 + k} = ${76 - k}.`),
    q('thousands', '5C2', 'calculation_clash', 2, `${4200 + k} + 3,867 = □`, String(8067 + k), 'Line up place values and carry into the next column when a column totals 10 or more.'),
    q('exchange', '5C2', 'calculation_clash', 2, `${5000 + k} − 2,786 = □`, String(2214 + k), 'Exchange across the zeros carefully, then subtract each column.'),
    q('ten', '5F9', 'calculation_clash', 2, `${4 + k / 10} × 10 = □`, String(40 + k), 'Multiplying by 10 makes every digit worth ten times as much.'),
    q('hundred', '5F9', 'calculation_clash', 2, `${345 + k * 10} ÷ 100 = □`, String((345 + k * 10) / 100), 'Dividing by 100 makes every digit worth one hundredth as much.'),
    q('decimal-add', '5F10', 'calculation_clash', 2, `${k}.75 + 2.6 = □`, (k + 3.35).toFixed(2), 'Line up decimal points: 2.6 is 2.60. Then add.'),
    q('decimal-sub', '5F10', 'calculation_clash', 2, `${k + 7}.2 − 3.85 = □`, (k + 3.35).toFixed(2), 'Write the first amount with two decimal places and subtract in columns.'),
    q('square', '5C5', 'prime_pop', 2, `${k + 5}² = □`, String((k + 5) ** 2), 'Squaring means multiplying the number by itself.'),
    q('cube', '5C5', 'prime_pop', 2, '4³ = □', '64', '4 cubed means 4 × 4 × 4 = 64.'),
    q('short-mult', '5C7', 'multiplication_mine', 2, `${234 + k} × 6 = □`, String((234 + k) * 6), 'Multiply each column by 6 and carry into the next column.'),
    q('short-div', '5C7', 'remainder_run', 2, `${(124 + k) * 7} ÷ 7 = □`, String(124 + k), 'Divide each place-value column in turn, carrying any remainder to the next column.'),
    q('fraction-part', '4F4', 'take_out_rush', 2, `3/4 of ${40 + k * 4} = □`, String((10 + k) * 3), 'Divide by the denominator 4, then multiply by the numerator 3.'),
    q('percentage-ten', '5F12', 'percent_power', 2, `10% of ${250 + k * 10} = □`, String(25 + k), '10% means one tenth, so divide by 10.'),
    q('fraction-add', '5F4', 'fraction_forge', 3, '2/7 + 3/7 = □', '5/7', 'The parts are the same size. Add numerators and keep the denominator 7.'),
    q('fraction-sub', '5F4', 'fraction_forge', 3, '7/9 − 2/9 = □', '5/9', 'Subtract numerators while keeping the denominator 9.'),
    q('decimal-mult', '6F9', 'multiplication_mine', 3, `${k}.25 × 4 = □`, String(4 * k + 1), 'Multiply as whole numbers, then place the decimal point so the value is sensible.'),
    q('decimal-div', '6F9', 'remainder_run', 3, `${k + 2}.4 ÷ 4 = □`, ((k + 2.4) / 4).toFixed(2), 'Divide each column, continuing past the decimal point as needed.'),
    q('brackets', '6C9', 'order_ops_arena', 3, `(7 + ${k}) × 6 = □`, String((7 + k) * 6), 'Do the calculation in brackets before multiplying.'),
    q('order', '6C9', 'order_ops_arena', 3, `20 − 3 × ${k} = □`, String(20 - 3 * k), 'Multiply first, then subtract that result from 20.'),
    q('percent-quarter', '6F12', 'percent_power', 3, `25% of ${240 + k * 4} = □`, String(60 + k), '25% is a quarter. Divide the whole by 4.'),
    q('unlike-add', '6F4', 'fraction_forge', 4, '2/3 + 1/4 = □', '11/12', 'Use twelfths: 8/12 + 3/12 = 11/12.'),
    q('unlike-sub', '6F4', 'fraction_forge', 4, '5/6 − 1/3 = □', '1/2', '1/3 = 2/6, so 5/6 − 2/6 = 3/6 = 1/2.'),
    q('mixed', '6F4', 'fraction_forge', 4, '1 1/2 + 2 3/4 = □', '17/4', 'Convert to quarters: 6/4 + 11/4 = 17/4 = 4 1/4.'),
    q('fraction-times', '6F5', 'take_out_rush', 4, '2/3 × 3/5 = □', '2/5', 'Multiply numerators and denominators: 6/15, then simplify to 2/5.'),
    q('fraction-div', '6F5', 'simplify_sprint', 4, '3/4 ÷ 3 = □', '1/4', 'Share three quarters into three equal groups: each group is one quarter.'),
    q('percent-fifteen', '6F12', 'percent_power', 4, `15% of ${200 + k * 20} = □`, String(30 + k * 3), 'Find 10%, halve it for 5%, then add the two amounts.'),
    q('decimal-large', '6F9', 'multiplication_mine', 4, `0.48 × ${k + 6} = □`, (0.48 * (k + 6)).toFixed(2), 'Multiply 48 by the whole number, then divide the product by 100.'),
    q('decimal-quotient', '6C7', 'remainder_run', 4, '7 ÷ 8 = □', '0.875', 'Continue division with decimal zeros: 7.000 ÷ 8 = 0.875.'),
    q('long-mult-a', '6C7', 'multiplication_mine', 5, `${1234 + k} × 23 = □`, String((1234 + k) * 23), `Multiply by 3, then by 20, then add: ${(1234 + k) * 3} + ${(1234 + k) * 20} = ${(1234 + k) * 23}. Show both rows in your written method.`),
    q('long-div-a', '6C7', 'remainder_run', 5, `${(318 + k) * 24} ÷ 24 = □`, String(318 + k), 'Use long division. For each step, divide, multiply, subtract and bring down the next digit.'),
    q('long-mult-b', '6C7', 'multiplication_mine', 5, `${2341 + k} × 36 = □`, String((2341 + k) * 36), `Multiply by 6 and by 30, then add the two rows: ${(2341 + k) * 6} + ${(2341 + k) * 30}.`),
    q('long-div-b', '6C7', 'remainder_run', 5, `${(246 + k) * 32} ÷ 32 = □`, String(246 + k), 'Use long division and check the quotient by multiplying it by 32.'),
  ];
  for (const q of questions.slice(-4)) { q.marks = 2; q.formalWorking = true; }
  return questions;
}

/** Pool deliberately spans all nine tested strands. Each replay varies quantities. */
export function reasoningMissions(seed = 1): SatsMission[] {
  const k = 1 + Math.abs(seed % 5);
  const q = mission;
  return [
    q('roman', '5N3', 'place_value_panic', 1, 'Decode the Roman numeral on the gate.', equation('MCDXL = □'), [field('Number', '1440')], 'M = 1,000; CD = 400; XL = 40. Total: 1,440.'),
    q('place', '6N3', 'place_value_panic', 1, 'What is the value of the 7?', equation('4,735,206'), [field('Value of 7', '700000')], 'The 7 is in the hundred-thousands place, so it means 700,000.'),
    q('round', '6N4', 'rounding_rocket', 1, 'Round the fuel reading to the nearest thousand.', equation(`${52400 + k * 100}`), [field('Rounded reading', String(Math.round((52400 + k * 100) / 1000) * 1000))], 'Look at the hundreds digit. A 5 or more rounds the thousands up.'),
    q('negative', '6N5', 'number_line_ninja', 1, `The canyon is −${k + 3}°C. It warms by 9°C. Find the new temperature.`, { type: 'numberline', min: -10, max: 10, marker: -(k + 3) }, [field('Temperature (°C)', String(6 - k))], `Move 9 steps right from −${k + 3} to reach ${6 - k}.`),
    q('decimal-order', '5F8', 'fraction_forge', 1, 'Choose the smallest decimal.', equation('0.6     0.56     0.605     0.065'), [field('Smallest', '0.065', ['0.6', '0.56', '0.605', '0.065'])], 'Compare matching places: 0.065 has zero tenths, so it is smallest.'),
    q('equivalent', '6F2', 'match3_equivalence', 1, 'Complete the equivalent fraction.', { type: 'fractions', values: ['3/5', '?/20'] }, [field('Missing numerator', '12')], '5 × 4 = 20. Multiply the numerator by 4 too: 3 × 4 = 12.'),
    q('decimal-fraction', '6F6', 'match3_equivalence', 1, 'Express the charge as a fraction in simplest form.', equation('0.35'), [field('Fraction', '7/20')], '0.35 = 35/100. Divide top and bottom by 5 to get 7/20.'),
    q('percent-equivalence', '6F11', 'percent_power', 1, 'Choose the percentage equal to 3/8.', { type: 'fractions', values: ['3/8'] }, [field('Percentage', '37.5', ['30', '37.5', '38', '60'])], '3 ÷ 8 = 0.375. Multiply by 100 to get 37.5%.'),
    q('prime', '6C5', 'prime_pop', 1, 'Choose the prime number.', equation('21     29     33     39'), [field('Prime', '29', ['21', '29', '33', '39'])], '21, 33 and 39 divide by 3. Only 29 has exactly two factors.'),
    q('factor', '5C5', 'factor_frenzy', 1, 'Find the greatest common factor of both locks.', equation('24 and 36'), [field('Common factor', '12')], '12 divides both 24 and 36, and no larger number does.'),
    q('sequence', '6A3', 'formula_forge', 2, 'Complete the number sequence.', { type: 'sequence', values: [String(k), String(k + 7), String(k + 14), '?', String(k + 28)] }, [field('Missing term', String(k + 21))], 'The same step, +7, connects each neighbouring pair.'),
    q('inverse', '6A1', 'calculation_clash', 2, 'Find the missing number.', equation(`□ × 8 = ${(k + 6) * 8}`), [field('Missing number', String(k + 6))], 'Undo multiplication by dividing the product by 8.'),
    q('estimate', '5C3', 'calculation_clash', 2, 'Estimate the product by rounding each number to the nearest hundred.', equation('398 × 202 ≈ □'), [field('Estimate', '80000')], '398 rounds to 400 and 202 rounds to 200. 400 × 200 = 80,000.'),
    q('ratio-fraction', '6R4', 'ratio_fractions', 2, 'Red:blue racers are in a 2:3 ratio. What fraction of all racers is red?', { type: 'ratio', labels: ['Red', 'Blue'], parts: [2, 3] }, [field('Fraction red', '2/5')], 'There are 5 parts altogether; 2 are red. The fraction is 2/5.'),
    q('fraction-whole', '6F10', 'take_out_rush', 2, `3/4 of the café batch is ${3 * (k + 5)} cakes. How many cakes are in the whole batch?`, { type: 'fractions', values: ['3/4'] }, [field('Whole batch', String(4 * (k + 5)))], `Divide ${3 * (k + 5)} by 3 to find one quarter (${k + 5}), then multiply by 4.`),
    q('percent-back', '6F12', 'percent_power', 3, `25% of the reactor power is ${k * 6} units. Find the full power.`, equation(`25% → ${k * 6}`), [field('Full power', String(k * 24))], '25% is one quarter, so multiply the known quarter by 4.'),
    q('order', '6C9', 'order_ops_arena', 3, 'Choose the correct value.', equation('30 − 12 ÷ 3 × 2'), [field('Value', '22', ['12', '22', '26', '36'])], 'Division and multiplication have equal priority: 12 ÷ 3 × 2 = 8. Then 30 − 8 = 22.'),
    q('fraction-compare', '6F3', 'fraction_forge', 3, 'Which fraction is larger?', { type: 'fractions', values: ['5/8', '2/3'] }, [field('Larger fraction', '2/3', ['5/8', '2/3'])], 'Use twenty-fourths: 5/8 = 15/24 and 2/3 = 16/24.'),
    q('café', '6C8', 'problem_pyramid', 3, `${k + 3} meals cost £6 each. A voucher takes £5 off the total.`, equation(`${k + 3} × £6, then subtract £5`), [field('Cost before voucher (£)', String((k + 3) * 6)), field('Amount to pay (£)', String((k + 3) * 6 - 5))], 'Multiply to find the total meal cost, then subtract the voucher once.'),
    q('share', '6R4', 'share_splitter', 3, `Share ${5 * (k + 4)} crystals in a 2:3 ratio.`, { type: 'ratio', labels: ['Team A', 'Team B'], parts: [2, 3] }, [field('Team A', String(2 * (k + 4))), field('Team B', String(3 * (k + 4)))], `There are 5 parts; each is ${k + 4}. Team A gets 2 parts and Team B gets 3.`),
    q('sale', '6F12', 'percent_power', 3, `A £${80 + k * 20} item is reduced by 15%.`, equation(`Price £${80 + k * 20} · reduction 15%`), [field('Discount (£)', String(12 + 3 * k)), field('Sale price (£)', String(68 + 17 * k))], 'Find 10% and 5%, add them for the discount, then subtract it from the original price.'),
    q('recipe', '6R1', 'potion_panic', 3, `A recipe for 4 potions uses ${80 + k * 20} ml. Make 10 potions.`, { type: 'ratio', labels: ['Potions', 'Liquid (ml)'], parts: [4, 80 + k * 20] }, [field('ml for 1 potion', String(20 + k * 5)), field('ml for 10 potions', String(200 + k * 50))], 'Divide by 4 for one potion, then multiply by 10.'),
    q('formula', '6A2', 'formula_forge', 3, `The rule is y = 3x + 4. Use x = ${k + 2}, then reverse the rule for y = 25.`, equation('y = 3x + 4'), [field(`y when x = ${k + 2}`, String(3 * k + 10)), field('x when y = 25', '7')], 'Substitute the first x. For the reverse rule, subtract 4 from 25 and divide by 3.'),
    q('two-unknowns', '6A4', 'formula_forge', 4, 'Two whole numbers sum to 18. Their difference is 4.', equation('a + b = 18', 'a − b = 4'), [field('Larger number', '11'), field('Smaller number', '7')], 'Half of 18 is 9. Move 2 from one number to the other: 11 and 7.'),
    q('possibilities', '6A5', 'formula_forge', 4, 'a and b are positive whole numbers. a + b = 7 and a < b. Find all pairs.', equation('a + b = 7 · a < b'), [field('Number of possible pairs', '3'), field('Pairs', '1,6;2,5;3,4', undefined)], 'The pairs are (1,6), (2,5), (3,4). (4,3) fails a < b. Zero is not positive.'),
    q('fraction-two', '6F4', 'fraction_forge', 4, 'Combine and simplify the fractions.', { type: 'fractions', values: ['5/6', '+', '3/4'] }, [field('Lowest common denominator', '12'), field('Sum', '19/12')], '5/6 = 10/12 and 3/4 = 9/12, so the sum is 19/12 = 1 7/12.'),
    q('buses', '6C8', 'remainder_run', 4, `${91 + k * 7} explorers travel in vehicles holding 12.`, equation(`${91 + k * 7} ÷ 12`), [field('Full vehicles', String(Math.floor((91 + k * 7) / 12))), field('Vehicles needed in total', String(Math.ceil((91 + k * 7) / 12)))], 'Count full groups, then add one vehicle if any explorers remain. A remainder needs space too.'),
    q('scale', '6R3', 'scale_builder', 4, `A 6 cm by 4 cm model is enlarged by a factor of ${k + 1}.`, { type: 'shape', shape: 'rectangle', labels: ['6 cm', '4 cm'] }, [field('New length (cm)', String(6 * (k + 1))), field('New width (cm)', String(4 * (k + 1)))], 'Multiply both lengths by the same scale factor; do not add the factor.'),
    q('claim', '6F3', 'fraction_forge', 4, 'A robot says: “1/8 is bigger than 1/6 because 8 is bigger than 6.” Is it right? Explain.', { type: 'fractions', values: ['1/8', '1/6'] }, [field('Is the robot right?', 'No', ['Yes', 'No']), { label: 'Explain why', answer: 'For the same whole, eighths are smaller parts than sixths, so 1/8 is smaller than 1/6.', manual: true }], 'The denominator counts equal parts of the same whole. More equal parts makes each part smaller.'),
    q('percent-claim', '6R2', 'percent_power', 5, 'Team A wins 18 of 24 races. Team B wins 16 of 20. Compare their win rates.', equation('Team A: 18/24', 'Team B: 16/20'), [field('Team A win rate (%)', '75'), field('Team B win rate (%)', '80')], '18/24 = 3/4 = 75%. 16/20 = 4/5 = 80%. Team B has the higher rate despite fewer wins.'),
    q('convert', '6M5', 'unit_mixer', 1, 'Convert the distance to metres.', equation(`${k + 1}.25 km → metres`), [field('Distance (m)', String((k + 1) * 1000 + 250))], '1 km = 1,000 m, so multiply by 1,000.'),
    q('imperial', '5M6', 'unit_mixer', 2, 'Use 1 mile ≈ 1.6 km. Convert 5 miles.', equation('1 mile ≈ 1.6 km'), [field('Distance (km)', '8')], '5 × 1.6 = 8 km. The conversion is approximate.'),
    q('circle', '6G5', 'polygon_palace', 1, 'A circle has a radius of 7 cm. Find its diameter.', { type: 'shape', shape: 'circle', labels: ['Radius 7 cm'] }, [field('Diameter (cm)', '14')], 'The diameter crosses the centre and is twice the radius: 7 × 2 = 14 cm.'),
    q('solid', '6G2', 'polygon_palace', 1, 'How many edges does this cuboid have?', { type: 'shape', shape: 'cuboid', labels: [] }, [field('Edges', '12')], 'A cuboid has 4 edges on top, 4 below and 4 joining them: 12.'),
    q('coordinate', '6P3', 'coordinates_quest', 2, 'Read the coordinates of the marked point.', { type: 'grid', points: [[-k, 3]] }, [field('x', String(-k)), field('y', '3')], 'Across first: the point is left of zero. Then read its height, 3.'),
    q('clock', '4M4', 'time_keeper_cove', 2, 'Read the clock, then find the time 35 minutes later.', { type: 'clock', hours: 9, minutes: 45 }, [field('Clock time (HH:MM)', '09:45'), field('35 minutes later (HH:MM)', '10:20')], 'The long hand shows 45 minutes. Add 15 minutes to 10:00, then 20 more to 10:20.'),
    q('perimeter', '5M7', 'perimeter_path', 2, 'Find the perimeter, then the area.', { type: 'shape', shape: 'rectangle', labels: [`${k + 6} cm`, '4 cm'] }, [field('Perimeter (cm)', String(2 * (k + 10))), field('Area (cm²)', String(4 * (k + 6)))], 'Perimeter adds all four edges. Area multiplies length by width.'),
    q('volume', '6M8', 'area_architect', 3, 'Find the base area, then the volume of the crate.', { type: 'shape', shape: 'cuboid', labels: [`${k + 4} cm`, '3 cm', '4 cm'] }, [field('Base area (cm²)', String(3 * (k + 4))), field('Volume (cm³)', String(12 * (k + 4)))], 'Base area = length × width. Volume = base area × height. Use cubic units.'),
    q('triangle', '6M7', 'area_architect', 3, 'Find the rectangle area, then half of it for this triangle.', { type: 'shape', shape: 'triangle', labels: [`Base ${k * 2 + 4} cm`, 'Perpendicular height 5 cm'] }, [field('Base × height (cm²)', String((k * 2 + 4) * 5)), field('Triangle area (cm²)', String((k + 2) * 5))], 'Triangle area is half of base × perpendicular height.'),
    q('angle', '6G4', 'angle_arena', 2, 'Two angles of a triangle are 47° and 68°. Find the missing angle.', { type: 'shape', shape: 'triangle', labels: ['47°', '68°', '?°'] }, [field('Missing angle (°)', '65')], 'Triangle angles total 180°. 180 − 47 − 68 = 65°.'),
    q('reflect', '6P3', 'rotation_relay', 3, 'Reflect the marked point in the y-axis.', { type: 'grid', points: [[k, -2]] }, [field('Reflected x', String(-k)), field('Reflected y', '-2')], 'The y-axis is the vertical mirror. Change the sign of x; y stays the same.'),
    q('translate', '6P3', 'coordinates_quest', 3, 'Move the marked point 3 left and 2 up.', { type: 'grid', points: [[2, -3]] }, [field('New x', '-1'), field('New y', '-1')], 'Subtract 3 from x and add 2 to y: (2 − 3, −3 + 2) = (−1, −1).'),
    q('bars', '4S2', 'graph_grabber', 2, 'How many more crystals did B collect than A?', { type: 'bars', labels: ['A', 'B', 'C'], values: [k * 4, k * 4 + 12, k * 4 + 4], unit: 'Crystals' }, [field('Difference', '12')], 'Read both bar values using the numbered scale, then subtract A from B.'),
    q('mean', '6S3', 'mean_machine', 3, 'Find the total power, then its mean.', { type: 'sequence', values: [String(k + 2), String(k + 4), String(k + 6), String(k + 8)] }, [field('Total', String(4 * k + 20)), field('Mean', String(k + 5))], 'Add all four values and divide by 4. The mean is not the total.'),
    q('line', '6S1', 'line_graph_lab', 3, 'Read the distance at 10:00, then at 10:30 between the plotted points.', { type: 'line', labels: ['09:00', '10:00', '11:00', '12:00'], values: [0, 10 + k * 2, 30 + k * 2, 40 + k * 2], unit: 'Distance (km)' }, [field('Distance at 10:00 (km)', String(10 + k * 2)), field('Distance at 10:30 (km)', String(20 + k * 2))], 'Read the 10:00 point. 10:30 is halfway to 11:00, so use the halfway distance on the joining line.'),
    q('timetable', '5S2', 'data_detective', 3, 'Use the timetable to find the journey duration and time left before 11:00.', { type: 'table', headings: ['Train', 'Leaves', 'Arrives'], rows: [['Glacier Express', '09:35', '10:20'], ['Canyon Flyer', '10:10', '10:55']] }, [field('Glacier journey (minutes)', '45'), field('Minutes from arrival to 11:00', '40')], '09:35 to 10:00 is 25 minutes, plus 20 = 45. 10:20 to 11:00 is 40.'),
    q('pie', '6S1', 'data_detective', 3, 'A survey has 60 votes. The sector angles are shown. Find the votes for Café and Racing.', { type: 'pie', labels: ['Café', 'Racing', 'Forge'], angles: [120, 180, 60] }, [field('Café votes', '20'), field('Racing votes', '30')], '120/360 is one third, so 20 votes. 180/360 is one half, so 30 votes.'),
    q('money', '3M3', 'change_counter', 3, 'A customer buys 3 snacks at £1.35 and pays £10.', equation('3 × £1.35 · paid £10'), [field('Total cost (£)', '4.05'), field('Change (£)', '5.95')], '3 × 1.35 = £4.05. Subtract from £10 to get £5.95.'),
    q('scale-reading', '5M2', 'conversion_canyon', 2, 'Between 1 kg and 2 kg a scale has 4 equal gaps. The pointer is 3 gaps above 1 kg.', { type: 'sequence', values: ['1 kg', '│', '│', '▲', '2 kg'] }, [field('Weight (kg)', '1.75')], 'Each gap is 1 ÷ 4 = 0.25 kg. 1 + 3 × 0.25 = 1.75 kg.'),
    q('net', '6G3', 'polygon_palace', 3, 'This net folds into a cube. Give the number of faces and vertices.', { type: 'shape', shape: 'net', labels: [] }, [field('Faces', '6'), field('Vertices', '8')], 'Six square faces fold around the cube. Its corners meet at eight vertices.'),
    q('capacity', '5M9', 'conversion_canyon', 3, 'A tank holds 2.5 litres. Fill it using full 250 ml bottles.', equation('Tank: 2.5 litres · bottle: 250 ml'), [field('Tank capacity (ml)', '2500'), field('Bottles needed', '10')], 'Convert 2.5 litres to 2,500 ml, then divide by 250.'),
    q('counting', '4N1', 'number_line_ninja', 1, 'Count forwards in equal steps. Find the next number.', { type: 'sequence', values: ['−12', '−6', '0', '6', '?'] }, [field('Next number', '12')], 'Each step adds 6, including when crossing zero.'),
    q('reading-number', '6N2', 'place_value_panic', 2, 'Write four million, seventy thousand and six in digits.', equation('Four million · seventy thousand · six'), [field('Number', '4070006')], 'Use zeros to hold the unused places: 4,070,006.'),
    q('number-problem', '6N6', 'number_line_ninja', 3, 'A lift is on floor −3. It rises 8 floors, then falls 2 floors. Where is it?', equation('−3 → +8 → −2'), [field('Final floor', '3')], '−3 + 8 = 5. Then 5 − 2 = 3.'),
    q('mental', '4C1', 'maths_vs_zombies', 1, 'Find the quickest mental total.', equation('198 + 37'), [field('Total', '235')], 'Add 200, then subtract 2: 198 + 37 = 200 + 37 − 2 = 235.'),
    q('tickets', '4C4', 'problem_pyramid', 2, 'There are 240 tickets. 86 are sold in the morning and 79 in the afternoon. How many remain?', equation('240 − (86 + 79)'), [field('Tickets remaining', '75')], 'Add sales: 86 + 79 = 165. Then subtract from 240: 75.'),
    q('fraction-name', '3F1', 'take_out_rush', 1, 'A tray has 8 equal spaces. 3 are filled. What fraction is filled?', { type: 'ratio', labels: ['Filled', 'Empty'], parts: [3, 5] }, [field('Fraction filled', '3/8')], 'Count all 8 equal spaces for the denominator; 3 filled spaces make the numerator.'),
    q('fraction-whole-mult', '5F5', 'take_out_rush', 3, 'Find the total of three portions, each worth 2/5.', { type: 'fractions', values: ['2/5', '2/5', '2/5'] }, [field('Total', '6/5')], '3 × 2/5 = 6/5 = 1 1/5. The total can be more than one whole.'),
    q('decimal-round', '5F7', 'rounding_rocket', 2, 'Round the reading to one decimal place.', equation('6.47'), [field('Rounded reading', '6.5')], 'The hundredths digit is 7. Round the tenths digit up from 4 to 5.'),
    q('simplify', '6F2', 'simplify_sprint', 2, 'Unlock the fraction in its simplest form.', { type: 'fractions', values: ['18/24'] }, [field('Simplest form', '3/4')], 'Divide the numerator and denominator by their common factor 6.'),
    q('measure-compare', '4M1', 'unit_mixer', 2, 'Which length is greater?', equation('1.2 m     115 cm'), [field('Greater length', '1.2 m', ['1.2 m', '115 cm'])], '1.2 m = 120 cm, so it is greater than 115 cm.'),
    q('time-seconds', '5M4', 'time_keeper_cove', 2, 'Convert a running time of 3 minutes 25 seconds to seconds.', equation('3 min 25 s → seconds'), [field('Seconds', '205')], '3 × 60 = 180 seconds. Add 25 to get 205.'),
    q('parallelogram', '6M7', 'area_architect', 3, 'Find the area of a parallelogram with base 8 cm and perpendicular height 5 cm.', equation('Base 8 cm · perpendicular height 5 cm'), [field('Area (cm²)', '40')], 'For a parallelogram, area = base × perpendicular height = 8 × 5 = 40 cm².'),
    q('compound-area', '5M7', 'area_architect', 4, 'An L-shaped floor is a 9 m by 7 m rectangle with a 3 m by 2 m corner removed.', equation('Whole: 9 × 7 m²', 'Removed corner: 3 × 2 m²'), [field('Whole rectangle area (m²)', '63'), field('L-shaped floor area (m²)', '57')], 'Find the whole rectangle area, then subtract the removed corner: 63 − 6 = 57 m².'),
    q('mass-money', '6M9', 'conversion_canyon', 4, 'Slime costs £4 per kg. You buy 750 g. Find the mass in kg and the cost.', equation('750 g · £4 per kg'), [field('Mass (kg)', '0.75'), field('Cost (£)', '3')], '750 g = 0.75 kg. Multiply 0.75 by £4 to get £3.'),
    q('shape-classify', '4G2', 'polygon_palace', 2, 'Which quadrilateral has two pairs of parallel sides and four right angles?', equation('Shape properties'), [field('Shape', 'Rectangle', ['Kite', 'Rectangle', 'Trapezium', 'Triangle'])], 'A rectangle has opposite sides parallel and all four angles are right angles.'),
    q('symmetry', '4G3', 'polygon_palace', 2, 'How many lines of symmetry does a non-square rectangle have?', { type: 'shape', shape: 'rectangle', labels: [] }, [field('Lines of symmetry', '2')], 'It matches across a horizontal centre line and a vertical centre line. The diagonals are not symmetry lines.'),
    q('angles-point', '6G4', 'angle_arena', 3, 'Three angles meet around a point: 85°, 140° and a missing angle.', equation('85° + 140° + □ = 360°'), [field('Missing angle (°)', '135')], 'Angles around a point total 360°. Subtract 85 and 140 to get 135°.'),
    q('quadrilateral-angle', '6G4', 'angle_arena', 3, 'Three angles in a quadrilateral are 90°, 105° and 80°. Find the fourth.', equation('90° + 105° + 80° + □ = 360°'), [field('Fourth angle (°)', '85')], 'Quadrilateral angles total 360°. The known angles total 275°, leaving 85°.'),
    q('rotation', '4P2', 'rotation_relay', 2, 'A compass arrow points north. Turn it 90° clockwise. Which way does it point?', equation('N ↑ · 90° clockwise'), [field('Direction', 'East', ['North', 'East', 'South', 'West'])], 'A clockwise quarter turn takes north to east.'),
    q('table-total', '4S1', 'data_detective', 2, 'Complete the total from the tally evidence.', { type: 'table', headings: ['Item', 'Count'], rows: [['Red crystals', '18'], ['Blue crystals', '27'], ['Green crystals', '15']] }, [field('Total crystals', '60')], 'Add every row once: 18 + 27 + 15 = 60.'),
    q('factor-multiple', '5C5', 'factor_frenzy', 3, 'Find the smallest number in both the 6 and 8 times tables.', equation('Common multiple of 6 and 8'), [field('Smallest common multiple', '24')], 'Multiples of 6: 6, 12, 18, 24. Multiples of 8: 8, 16, 24. First common value: 24.'),
    q('shape-name', '3G1', 'polygon_palace', 1, 'Name this flat shape.', { type: 'shape', shape: 'triangle', labels: [] }, [field('Shape', 'Triangle', ['Triangle', 'Cuboid', 'Circle', 'Pentagon'])], 'A triangle is a flat shape with three straight sides.'),
    q('movement-pattern', '3P1', 'rotation_relay', 2, 'The arrows turn by the same amount each time. Choose the next direction.', { type: 'sequence', values: ['↑', '→', '↓', '?'] }, [field('Next direction', 'Left', ['Up', 'Right', 'Down', 'Left'])], 'Each arrow turns 90° clockwise. After down comes left.'),
    q('draw-rectangle', '6G3', 'polygon_palace', 3, 'On paper, use a ruler to draw a rectangle 6 cm long and 4 cm wide. Mark its four right angles.', equation('Rectangle: 6 cm × 4 cm'), [{ label: 'Write “drawn” when ready for an adult to check your drawing', answer: 'Four straight sides, opposite lengths 6 cm and 4 cm, and four right angles.', manual: true }], 'Use the ruler from zero to measure each side. Opposite sides are equal and parallel; all four corners are 90°. An adult checks the paper drawing.'),
    q('draw-angle', '5G4', 'angle_arena', 3, 'On paper, use a protractor to draw a 65° angle. Label its size.', equation('Draw 65°'), [{ label: 'Write “drawn” when ready for an adult to check your angle', answer: 'Two rays meeting at one vertex with a measured angle of 65°.', manual: true }], 'Draw a baseline. Put the protractor centre on the vertex and its zero line on the baseline. Mark 65° using the scale starting at zero on your baseline, then draw the second ray. An adult checks it.'),
    q('construct-graph', '6S1', 'graph_grabber', 3, 'On paper, draw a bar chart for Red = 10, Blue = 15, Green = 5. Label the axes and use a scale in steps of 5.', { type: 'table', headings: ['Crystal', 'Count'], rows: [['Red', '10'], ['Blue', '15'], ['Green', '5']] }, [{ label: 'Write “drawn” when ready for an adult to check your chart', answer: 'Equal-width bars at 10, 15 and 5; labelled categories and count axis with equal intervals of 5.', manual: true }], 'Draw labelled axes with evenly spaced numbers 0, 5, 10, 15. Use equal-width bars, separate them with gaps, and draw each to its value. An adult checks your chart.'),
  ];
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  let state = seed >>> 0;
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1); [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}
export function buildSatsPaper(gameType: string, seed = Date.now()): SatsPaper {
  const number = gameType === 'crystal_core' ? 1 : gameType === 'mirror_gate' ? 2 : 3;
  if (number === 1) return { number, title: 'Arithmetic Reactor', seconds: 1800, marks: 40, missions: arithmeticMissions(seed) };
  const pool = reasoningMissions(seed + number);
  const numberDomains = new Set<SatsDomain>(['N', 'C', 'F', 'R', 'A']);
  const pick = (numeric: boolean, marks: number, count: number) => seededShuffle(pool.filter(q => numberDomains.has(q.domain) === numeric && q.marks === marks), seed + number * 73 + marks + (numeric ? 100 : 0)).slice(0, count);
  // 18 number/ratio/algebra missions = 24 marks; 7 M/G/P/S missions = 11 marks.
  const selected = [...pick(true, 1, 12), ...pick(true, 2, 6), ...pick(false, 1, 3), ...pick(false, 2, 4)];
  // Ensure every full three-paper set includes all nine strands without narrowing Paper 2 to geometry.
  for (const domain of ['N', 'C', 'F', 'R', 'A', 'M', 'G', 'P', 'S'] as SatsDomain[]) {
    if (selected.some(q => q.domain === domain)) continue;
    const replacement = pool.find(q => q.domain === domain);
    if (!replacement) continue;
    const index = selected.findIndex(q => q.marks === replacement.marks && numberDomains.has(q.domain) === numberDomains.has(domain) && selected.filter(other => other.domain === q.domain).length > 1);
    if (index >= 0) selected[index] = replacement;
  }
  return { number, title: number === 2 ? 'Mirror Gate Expedition' : 'Matrix Crystal Quest', seconds: 2400, marks: 35, missions: selected.sort((a, b) => a.difficulty - b.difficulty) };
}

/** Safe answer parsing: no eval; equivalent fractions, decimals, mixed numbers and times. */
export function normaliseAnswer(value: string): string {
  if (value.includes(';')) {
    const pairs = value.trim().split(';').map(part => part.match(/^\s*\(?\s*(-?\d+)\s*,\s*(-?\d+)\s*\)?\s*$/));
    return pairs.every(Boolean) ? pairs.map(pair => `${Number(pair![1])},${Number(pair![2])}`).sort().join(';') : `invalid-pairs:${value}`;
  }
  const clean = value.trim().replace(/−/g, '-').replace(/[£%°]/g, '').replace(/,/g, '').toLowerCase();
  const time = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (time && +time[2] < 60) return `${+time[1]}:${time[2]}`;
  const mixed = clean.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  const frac = clean.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  let numeric: number | undefined;
  if (mixed && +mixed[3] !== 0) numeric = +mixed[1] + Math.sign(+mixed[1] || 1) * (+mixed[2] / +mixed[3]);
  else if (frac && +frac[2] !== 0) numeric = +frac[1] / +frac[2];
  else if (/^-?\d+(\.\d+)?$/.test(clean)) numeric = Number(clean);
  if (numeric !== undefined && Number.isFinite(numeric)) return numeric.toFixed(8);
  return clean.replace(/\s/g, '').replace(/[()]/g, '').split(';').sort().join(';');
}
export const answersMatch = (value: string, expected: string) => normaliseAnswer(value) === normaliseAnswer(expected);
export function markMission(q: SatsMission, values: string[], methodApproved = false): number {
  const automatic = q.fields.reduce((sum, f, i) => sum + (!f.manual && answersMatch(values[i] ?? '', f.answer) ? 1 : 0), 0);
  if (q.formalWorking) return automatic ? q.marks : methodApproved ? 1 : 0;
  return automatic + (methodApproved && q.fields.some((f, i) => f.manual && values[i]?.trim()) ? 1 : 0);
}
export const getRevisionMissions = (game: string) => [...arithmeticMissions(2), ...reasoningMissions(2)].filter(q => q.game === game);
