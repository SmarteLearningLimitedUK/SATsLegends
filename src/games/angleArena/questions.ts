// Auto-generated Angle Arena question bank for SATs Legends
export type AngleQuestion = {
  id: number;
  kind: 'fluency' | 'reasoning';
  prompt: string;
  options: number[];
  correctAnswer: number;
  targetX: number;
  targetY: number;
  launchSpeed: number;
  explanation: string;
  difficulty: 'Easy' | 'Mild' | 'Medium' | 'Hard' | 'Expert';
  topic: string;
  diagramDescription: string;
  wrongAnswerRationale: Record<string, string>;
  accessibilityText: string;
};

type BuildConfig = {
  launcherX: number;
  groundY: number;
  gravity: number;
};

type BankEntry = {
  id: string;
  kind?: 'fluency' | 'reasoning';
  difficulty: AngleQuestion['difficulty'];
  topic: string;
  question_text: string;
  diagram_description: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  wrong_answer_rationale: Record<string, string>;
  accessibility_text: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const buildStoryLead = (entry: BankEntry) => {
  switch (entry.topic) {
    case 'right_angles':
      return 'The Monster Minds have locked the catapult arm into a perfect corner brace.';
    case 'straight_line':
      return 'A shattered bridge beam stretches straight across the arena floor.';
    case 'around_point':
      return 'The arena\'s central beacon is surrounded by a ring of incoming sparks.';
    case 'triangle_angles':
      return 'A rune triangle is cracking as the Monster Minds close in.';
    case 'isosceles':
      return 'Two mirrored towers are holding the arena gate together.';
    case 'quadrilateral':
      return 'The arena wall is built from a four-sided shield panel.';
    case 'turns':
      return 'The launch wheel is spinning toward the target.';
    case 'vertically_opposite':
      return 'Two crossing beams have pinned the aim marker in place.';
    case 'parallel_lines':
      return 'Two parallel rails are guiding the next strike across the battleground.';
    case 'multi_step':
      return 'The catapult crew has to piece together several angle clues before the shot can be taken.';
    case 'word_problem':
      return 'A scout report from the arena hides the angle inside a battlefield story.';
    default:
      return 'The Monster Minds have turned the Angle Arena into a battle course.';
  }
};

const buildStoryPrompt = (entry: BankEntry) => `${buildStoryLead(entry)} ${entry.question_text}`;

const parseAngle = (value: string) => Number(value.replace('°', '').trim());
const resolveKind = (entry: BankEntry): 'fluency' | 'reasoning' => {
  if (entry.kind) return entry.kind;
  const topic = entry.topic.toLowerCase();
  if (topic.includes('multi_step') || topic.includes('word_problem') || topic.includes('ratio')) {
    return 'reasoning';
  }
  if (entry.question_text.toLowerCase().includes('ratio')) return 'reasoning';
  return 'fluency';
};

const buildTarget = (launcherX: number, angleDeg: number, speed: number, gravity: number) => {
  const radians = (angleDeg * Math.PI) / 180;
  const range = (speed * speed * Math.sin(2 * radians)) / gravity;
  const targetX = clamp(launcherX + range * 0.9, launcherX + 320, launcherX + 1400);
  return targetX;
};

const toAngleQuestion = (
  entry: BankEntry,
  index: number,
  speed: number,
  launcherX: number,
  groundY: number,
  gravity: number,
  targetHeight = 54,
): AngleQuestion => {
  const correct = parseAngle(entry.correct_answer);
  const options = entry.options.map(parseAngle);
  const targetX = buildTarget(launcherX, correct, speed, gravity);
  const targetY = groundY - targetHeight;
  return {
    id: index + 1,
    kind: resolveKind(entry),
    prompt: buildStoryPrompt(entry),
    options,
    correctAnswer: correct,
    targetX,
    targetY,
    launchSpeed: speed,
    explanation: entry.explanation,
    difficulty: entry.difficulty,
    topic: entry.topic,
    diagramDescription: entry.diagram_description,
    wrongAnswerRationale: entry.wrong_answer_rationale,
    accessibilityText: entry.accessibility_text,
  };
};

const questionBank: BankEntry[] = [
  {
    id: 'Q1',
    difficulty: 'Easy',
    topic: 'right_angles',
    question_text: 'Angle check: how many degrees in a right angle?',
    diagram_description: 'A square corner labelled as a right angle.',
    options: ['45°', '60°', '90°', '120°'],
    correct_answer: '90°',
    explanation: 'A right angle measures 90 degrees.',
    wrong_answer_rationale: {
      '45°': 'Confused with half a right angle.',
      '60°': 'Mixed up with common triangle angles.',
      '120°': 'Confused with an obtuse angle.',
    },
    accessibility_text: 'Right angle shown as a square corner.',
  },
  {
    id: 'Q2',
    difficulty: 'Easy',
    topic: 'straight_line',
    question_text: 'Angle check: how many degrees in a straight line?',
    diagram_description: 'A straight line with a half-turn arrow.',
    options: ['90°', '180°', '270°', '360°'],
    correct_answer: '180°',
    explanation: 'Angles on a straight line add up to 180 degrees.',
    wrong_answer_rationale: {
      '90°': 'Confused with a right angle.',
      '270°': 'Confused with three-quarter turn.',
      '360°': 'Confused with a full turn.',
    },
    accessibility_text: 'Straight line with a half-turn arrow.',
  },
  {
    id: 'Q3',
    difficulty: 'Easy',
    topic: 'around_point',
    question_text: 'Angle check: how many degrees in a full turn?',
    diagram_description: 'A point with a full circular arrow.',
    options: ['180°', '270°', '360°', '450°'],
    correct_answer: '360°',
    explanation: 'A full turn is 360 degrees.',
    wrong_answer_rationale: {
      '180°': 'Half a turn.',
      '270°': 'Three-quarter turn.',
      '450°': 'Went beyond a full turn.',
    },
    accessibility_text: 'Full circular arrow around a point.',
  },
  {
    id: 'Q4',
    difficulty: 'Easy',
    topic: 'triangle_angles',
    question_text: 'Triangle time: 50? and 60?. Find the third angle.',
    diagram_description: 'Triangle with two angles labelled 50° and 60°.',
    options: ['60°', '70°', '80°', '90°'],
    correct_answer: '70°',
    explanation: 'Angles in a triangle add to 180°. 180 - 50 - 60 = 70.',
    wrong_answer_rationale: {
      '60°': 'Assumed equilateral.',
      '80°': 'Subtracted only one given angle.',
      '90°': 'Guessed a right angle.',
    },
    accessibility_text: 'Triangle with 50 degrees and 60 degrees marked.',
  },
  {
    id: 'Q5',
    difficulty: 'Easy',
    topic: 'isosceles',
    question_text: 'Isosceles check: two angles are 40?. Find the third angle.',
    diagram_description: 'Isosceles triangle with two equal angles labelled 40°.',
    options: ['40°', '80°', '100°', '120°'],
    correct_answer: '100°',
    explanation: 'Two angles are 40° each. 180 - 80 = 100°.',
    wrong_answer_rationale: {
      '40°': 'Assumed all three angles equal.',
      '80°': 'Added instead of subtracting from 180.',
      '120°': 'Subtracted incorrectly.',
    },
    accessibility_text: 'Isosceles triangle with two equal 40 degree angles.',
  },
  {
    id: 'Q6',
    difficulty: 'Easy',
    topic: 'straight_line',
    question_text: 'Straight-line snap: 110? and ___. Find the missing angle.',
    diagram_description: 'Straight line split into two angles, one labelled 110°.',
    options: ['60°', '70°', '80°', '90°'],
    correct_answer: '70°',
    explanation: 'Angles on a straight line total 180°. 180 - 110 = 70.',
    wrong_answer_rationale: {
      '60°': 'Subtracted from 170 instead of 180.',
      '80°': 'Subtracted incorrectly.',
      '90°': 'Guessed a right angle.',
    },
    accessibility_text: 'Straight line with one angle labelled 110 degrees.',
  },
  {
    id: 'Q7',
    difficulty: 'Easy',
    topic: 'around_point',
    question_text: 'Around a point: one angle is 200?. Find the other angle.',
    diagram_description: 'Two angles around a point, one labelled 200°.',
    options: ['120°', '140°', '160°', '180°'],
    correct_answer: '160°',
    explanation: 'Angles around a point add to 360°. 360 - 200 = 160.',
    wrong_answer_rationale: {
      '120°': 'Subtracted from 320 instead of 360.',
      '140°': 'Subtracted incorrectly.',
      '180°': 'Confused with a straight line.',
    },
    accessibility_text: 'Two angles around a point with one labelled 200 degrees.',
  },
  {
    id: 'Q8',
    difficulty: 'Easy',
    topic: 'quadrilateral',
    question_text: 'Rectangle check: what is the marked angle?',
    diagram_description: 'Rectangle with one corner highlighted.',
    options: ['45°', '60°', '90°', '120°'],
    correct_answer: '90°',
    explanation: 'All angles in a rectangle are right angles.',
    wrong_answer_rationale: {
      '45°': 'Confused with diagonal angle.',
      '60°': 'Mixed up with triangle angles.',
      '120°': 'Confused with obtuse angle.',
    },
    accessibility_text: 'Rectangle with one corner highlighted.',
  },
  {
    id: 'Q9',
    difficulty: 'Easy',
    topic: 'turns',
    question_text: 'Quarter-turn check: how many degrees is it?',
    diagram_description: 'Arrow showing a quarter turn.',
    options: ['45°', '90°', '180°', '270°'],
    correct_answer: '90°',
    explanation: 'A quarter turn is 90 degrees.',
    wrong_answer_rationale: {
      '45°': 'Half of a right angle.',
      '180°': 'A half turn.',
      '270°': 'Three-quarter turn.',
    },
    accessibility_text: 'Arrow turning one quarter of a circle.',
  },
  {
    id: 'Q10',
    difficulty: 'Easy',
    topic: 'vertically_opposite',
    question_text: 'Vertically opposite angles: one is 65?. Find the other angle.',
    diagram_description: 'Two crossing lines with one angle labelled 65°.',
    options: ['65°', '85°', '115°', '125°'],
    correct_answer: '65°',
    explanation: 'Vertically opposite angles are equal.',
    wrong_answer_rationale: {
      '85°': 'Added 20 degrees by mistake.',
      '115°': 'Confused with angles on a straight line.',
      '125°': 'Added instead of keeping equal.',
    },
    accessibility_text: 'Crossing lines with one angle labelled 65 degrees.',
  },
  {
    id: 'Q11',
    difficulty: 'Mild',
    topic: 'triangle_angles',
    question_text: 'Triangle time: 35? and 70?. Find the third angle.',
    diagram_description: 'Triangle with two angles labelled 35° and 70°.',
    options: ['65°', '75°', '85°', '95°'],
    correct_answer: '75°',
    explanation: 'Angles in a triangle add to 180°. 180 - 35 - 70 = 75.',
    wrong_answer_rationale: {
      '65°': 'Subtracted only one angle.',
      '85°': 'Subtracted incorrectly.',
      '95°': 'Added instead of subtracting.',
    },
    accessibility_text: 'Triangle with 35 degrees and 70 degrees marked.',
  },
  {
    id: 'Q12',
    difficulty: 'Mild',
    topic: 'straight_line',
    question_text: 'Straight line: one angle is 125?. Find the other angle.',
    diagram_description: 'Straight line split with one angle labelled 125°.',
    options: ['35°', '45°', '55°', '65°'],
    correct_answer: '55°',
    explanation: 'Angles on a straight line add to 180°. 180 - 125 = 55.',
    wrong_answer_rationale: {
      '35°': 'Subtracted from 160.',
      '45°': 'Subtracted incorrectly.',
      '65°': 'Subtracted incorrectly.',
    },
    accessibility_text: 'Straight line with one angle labelled 125 degrees.',
  },
  {
    id: 'Q13',
    difficulty: 'Mild',
    topic: 'around_point',
    question_text: 'Around a point: 120?, 80? and ___. What is missing?',
    diagram_description: 'Three angles around a point, two labelled 120° and 80°.',
    options: ['140°', '150°', '160°', '180°'],
    correct_answer: '160°',
    explanation: 'Angles around a point add to 360°. 360 - 120 - 80 = 160.',
    wrong_answer_rationale: {
      '140°': 'Subtracted incorrectly.',
      '150°': 'Subtracted incorrectly.',
      '180°': 'Confused with straight line total.',
    },
    accessibility_text: 'Point with two angles labelled 120 and 80 degrees.',
  },
  {
    id: 'Q14',
    difficulty: 'Mild',
    topic: 'isosceles',
    question_text: 'Isosceles check: the vertex angle is 50?. Find each base angle.',
    diagram_description: 'Isosceles triangle with the top angle labelled 50°.',
    options: ['50°', '55°', '65°', '70°'],
    correct_answer: '65°',
    explanation: 'Remaining total is 130°. Split equally: 130 Ã· 2 = 65.',
    wrong_answer_rationale: {
      '50°': 'Assumed all angles equal.',
      '55°': 'Divided incorrectly.',
      '70°': 'Subtracted incorrectly.',
    },
    accessibility_text: 'Isosceles triangle with top angle 50 degrees.',
  },
  {
    id: 'Q15',
    difficulty: 'Mild',
    topic: 'vertically_opposite',
    question_text: 'Crossed lines: one angle is 130?. Find the opposite angle.',
    diagram_description: 'Crossing lines with one angle labelled 130°.',
    options: ['50°', '130°', '230°', '310°'],
    correct_answer: '130°',
    explanation: 'Vertically opposite angles are equal.',
    wrong_answer_rationale: {
      '50°': 'Confused with angles on a straight line.',
      '230°': 'Added instead of keeping equal.',
      '310°': 'Confused with full turn.',
    },
    accessibility_text: 'Crossing lines with one angle labelled 130 degrees.',
  },
  {
    id: 'Q16',
    difficulty: 'Mild',
    topic: 'right_angles',
    question_text: 'Right angle plus 30?. Find the new angle.',
    diagram_description: 'Right angle with an extra 30 degrees added.',
    options: ['90°', '100°', '120°', '130°'],
    correct_answer: '120°',
    explanation: '90° + 30° = 120°.',
    wrong_answer_rationale: {
      '90°': 'Forgot to add 30°.',
      '100°': 'Added only 10°.',
      '130°': 'Added 40° by mistake.',
    },
    accessibility_text: 'Right angle with an extra 30 degrees added.',
  },
  {
    id: 'Q17',
    difficulty: 'Mild',
    topic: 'quadrilateral',
    question_text: 'Quadrilateral check: 80?, 95? and 105?. Find the fourth angle.',
    diagram_description: 'Quadrilateral with three angles labelled 80°, 95°, 105°.',
    options: ['60°', '70°', '80°', '90°'],
    correct_answer: '80°',
    explanation: 'Angles in a quadrilateral add to 360°. 360 - 80 - 95 - 105 = 80.',
    wrong_answer_rationale: {
      '60°': 'Subtracted incorrectly.',
      '70°': 'Subtracted incorrectly.',
      '90°': 'Guessed a right angle.',
    },
    accessibility_text: 'Quadrilateral with three angles labelled 80, 95, 105 degrees.',
  },
  {
    id: 'Q18',
    difficulty: 'Mild',
    topic: 'parallel_lines',
    question_text: 'Parallel lines: one corresponding angle is 70?. Find the match.',
    diagram_description: 'Parallel lines with a transversal and one angle labelled 70°.',
    options: ['70°', '110°', '140°', '180°'],
    correct_answer: '70°',
    explanation: 'Corresponding angles are equal on parallel lines.',
    wrong_answer_rationale: {
      '110°': 'Used co-interior instead of corresponding.',
      '140°': 'Added instead of matching.',
      '180°': 'Confused with a straight line.',
    },
    accessibility_text: 'Parallel lines with a transversal and a 70 degree angle.',
  },
  {
    id: 'Q19',
    difficulty: 'Mild',
    topic: 'parallel_lines',
    question_text: 'Parallel lines: one alternate angle is 55?. Find the match.',
    diagram_description: 'Parallel lines with a transversal and one alternate angle labelled 55°.',
    options: ['55°', '125°', '145°', '235°'],
    correct_answer: '55°',
    explanation: 'Alternate angles are equal when lines are parallel.',
    wrong_answer_rationale: {
      '125°': 'Added 70° by mistake.',
      '145°': 'Confused with co-interior.',
      '235°': 'Added a full turn.',
    },
    accessibility_text: 'Parallel lines with a transversal and a 55 degree alternate angle.',
  },
  {
    id: 'Q20',
    difficulty: 'Mild',
    topic: 'word_problem',
    question_text: 'Compass turn: East to South. How many degrees?',
    diagram_description: 'Compass with an arrow turning from East to South.',
    options: ['45°', '90°', '135°', '180°'],
    correct_answer: '90°',
    explanation: 'East to South is a quarter turn: 90°.',
    wrong_answer_rationale: {
      '45°': 'Half of a quarter turn.',
      '135°': 'Three eighths of a turn.',
      '180°': 'Half turn.',
    },
    accessibility_text: 'Compass arrow turning from East to South.',
  },
  {
    id: 'Q21',
    difficulty: 'Medium',
    topic: 'triangle_angles',
    question_text: 'Triangle time: 25? and 80?. Find the third angle.',
    diagram_description: 'Triangle with two angles labelled 25° and 80°.',
    options: ['65°', '75°', '85°', '95°'],
    correct_answer: '75°',
    explanation: '180 - 25 - 80 = 75.',
    wrong_answer_rationale: {
      '65°': 'Subtracted incorrectly.',
      '85°': 'Added instead of subtracting.',
      '95°': 'Subtracted incorrectly.',
    },
    accessibility_text: 'Triangle with 25 degrees and 80 degrees marked.',
  },
  {
    id: 'Q22',
    difficulty: 'Medium',
    topic: 'parallel_lines',
    question_text: 'Parallel lines: one co-interior angle is 115?. Find the other angle.',
    diagram_description: 'Parallel lines with co-interior angle labelled 115°.',
    options: ['55°', '65°', '115°', '245°'],
    correct_answer: '65°',
    explanation: 'Co-interior angles add to 180°. 180 - 115 = 65.',
    wrong_answer_rationale: {
      '55°': 'Subtracted incorrectly.',
      '115°': 'Assumed equal like corresponding.',
      '245°': 'Added instead of subtracting.',
    },
    accessibility_text: 'Parallel lines with co-interior angle labelled 115 degrees.',
  },
  {
    id: 'Q23',
    difficulty: 'Medium',
    topic: 'around_point',
    question_text: 'Around a point: 90?, 110?, 80? and ___. What is missing?',
    diagram_description: 'Point with three angles labelled 90°, 110°, 80°.',
    options: ['60°', '70°', '80°', '90°'],
    correct_answer: '80°',
    explanation: '360 - 90 - 110 - 80 = 80.',
    wrong_answer_rationale: {
      '60°': 'Subtracted incorrectly.',
      '70°': 'Subtracted incorrectly.',
      '90°': 'Confused with right angle.',
    },
    accessibility_text: 'Point with three angles labelled 90, 110, 80 degrees.',
  },
  {
    id: 'Q24',
    difficulty: 'Medium',
    topic: 'quadrilateral',
    question_text: 'Quadrilateral check: 100?, 90? and 85?. Find the fourth angle.',
    diagram_description: 'Quadrilateral with three angles labelled 100°, 90°, 85°.',
    options: ['65°', '75°', '85°', '95°'],
    correct_answer: '85°',
    explanation: '360 - 100 - 90 - 85 = 85.',
    wrong_answer_rationale: {
      '65°': 'Subtracted incorrectly.',
      '75°': 'Subtracted incorrectly.',
      '95°': 'Added instead of subtracting.',
    },
    accessibility_text: 'Quadrilateral with three angles labelled 100, 90, 85 degrees.',
  },
  {
    id: 'Q25',
    difficulty: 'Medium',
    topic: 'isosceles',
    question_text: 'Isosceles check: base angles are 55?. What is the vertex angle?',
    diagram_description: 'Isosceles triangle with two base angles labelled 55°.',
    options: ['60°', '70°', '80°', '90°'],
    correct_answer: '70°',
    explanation: 'Two base angles total 110°. 180 - 110 = 70.',
    wrong_answer_rationale: {
      '60°': 'Subtracted incorrectly.',
      '80°': 'Added instead of subtracting.',
      '90°': 'Assumed right angle.',
    },
    accessibility_text: 'Isosceles triangle with base angles 55 degrees.',
  },
  {
    id: 'Q26',
    difficulty: 'Medium',
    topic: 'word_problem',
    question_text: 'Door turn: closed to straight. How many degrees?',
    diagram_description: 'Door opening from closed to straight line.',
    options: ['90°', '135°', '180°', '270°'],
    correct_answer: '180°',
    explanation: 'A straight line is 180°.',
    wrong_answer_rationale: {
      '90°': 'Quarter turn.',
      '135°': 'Three-eighths turn.',
      '270°': 'Three-quarter turn.',
    },
    accessibility_text: 'Door opening to a straight line position.',
  },
  {
    id: 'Q27',
    difficulty: 'Medium',
    topic: 'vertically_opposite',
    question_text: 'Crossed lines: one angle is 40?. Find the adjacent angle.',
    diagram_description: 'Crossing lines with one angle labelled 40°.',
    options: ['40°', '60°', '140°', '220°'],
    correct_answer: '140°',
    explanation: 'Adjacent angles on a straight line add to 180°. 180 - 40 = 140.',
    wrong_answer_rationale: {
      '40°': 'Used vertically opposite instead of adjacent.',
      '60°': 'Subtracted incorrectly.',
      '220°': 'Added instead of subtracting.',
    },
    accessibility_text: 'Crossing lines with an adjacent angle to 40 degrees.',
  },
  {
    id: 'Q28',
    difficulty: 'Medium',
    topic: 'parallel_lines',
    question_text: 'Parallel lines: corresponding angle is 118?. Find the co-interior angle.',
    diagram_description: 'Parallel lines with a corresponding angle labelled 118°.',
    options: ['62°', '118°', '148°', '242°'],
    correct_answer: '62°',
    explanation: 'Co-interior angles add to 180°. 180 - 118 = 62.',
    wrong_answer_rationale: {
      '118°': 'Used corresponding instead of co-interior.',
      '148°': 'Subtracted incorrectly.',
      '242°': 'Added instead of subtracting.',
    },
    accessibility_text: 'Parallel lines with one corresponding angle 118 degrees.',
  },
  {
    id: 'Q29',
    difficulty: 'Medium',
    topic: 'turns',
    question_text: 'Robot turn: three-quarters of a full turn. How many degrees?',
    diagram_description: 'Robot arrow showing three-quarter rotation.',
    options: ['90°', '180°', '270°', '360°'],
    correct_answer: '270°',
    explanation: 'Three-quarters of 360° is 270°.',
    wrong_answer_rationale: {
      '90°': 'One quarter turn.',
      '180°': 'Half turn.',
      '360°': 'Full turn.',
    },
    accessibility_text: 'Arrow showing three-quarter turn.',
  },
  {
    id: 'Q30',
    difficulty: 'Medium',
    topic: 'multi_step',
    question_text: 'Right triangle check: one angle is 90? and one is 35?. Find the third angle.',
    diagram_description: 'Right triangle with another angle labelled 35°.',
    options: ['45°', '55°', '65°', '75°'],
    correct_answer: '55°',
    explanation: '180 - 90 - 35 = 55.',
    wrong_answer_rationale: {
      '45°': 'Subtracted incorrectly.',
      '65°': 'Added instead of subtracting.',
      '75°': 'Subtracted incorrectly.',
    },
    accessibility_text: 'Right triangle with another angle of 35 degrees.',
  },
  {
    id: 'Q31',
    difficulty: 'Hard',
    topic: 'parallel_lines',
    question_text: 'Parallel lines: angle x matches 38?. Find x.',
    diagram_description: 'Parallel lines with a transversal and one alternate angle 38°.',
    options: ['38°', '52°', '142°', '180°'],
    correct_answer: '38°',
    explanation: 'Alternate angles are equal when lines are parallel.',
    wrong_answer_rationale: {
      '52°': 'Added 14 degrees by mistake.',
      '142°': 'Used co-interior instead of alternate.',
      '180°': 'Used straight line total.',
    },
    accessibility_text: 'Parallel lines with a transversal and alternate angle 38 degrees.',
  },
  {
    id: 'Q32',
    difficulty: 'Hard',
    topic: 'quadrilateral',
    question_text: 'Quadrilateral check: three angles are 95?. What is the fourth?',
    diagram_description: 'Quadrilateral with three angles labelled 95°.',
    options: ['55°', '65°', '75°', '85°'],
    correct_answer: '75°',
    explanation: 'Total is 360°. 360 - 95 - 95 - 95 = 75.',
    wrong_answer_rationale: {
      '55°': 'Subtracted incorrectly.',
      '65°': 'Subtracted incorrectly.',
      '85°': 'Subtracted incorrectly.',
    },
    accessibility_text: 'Quadrilateral with three angles of 95 degrees.',
  },
  {
    id: 'Q33',
    difficulty: 'Hard',
    topic: 'triangle_angles',
    question_text: 'Triangle ratio 2:3:4. Find the biggest angle.',
    diagram_description: 'Triangle with angles labelled 2x, 3x, 4x.',
    options: ['60°', '80°', '90°', '100°'],
    correct_answer: '80°',
    explanation: 'Total parts = 9. 180 Ã· 9 = 20. Largest = 4 Ã— 20 = 80.',
    wrong_answer_rationale: {
      '60°': 'Used 3x instead of 4x.',
      '90°': 'Assumed right angle.',
      '100°': 'Multiplied by 5 instead of 4.',
    },
    accessibility_text: 'Triangle with angles marked 2x, 3x, 4x.',
  },
  {
    id: 'Q34',
    difficulty: 'Hard',
    topic: 'parallel_lines',
    question_text: 'Parallel lines: one co-interior angle is 132?. Find the other angle.',
    diagram_description: 'Parallel lines with a co-interior angle labelled 132°.',
    options: ['48°', '132°', '168°', '228°'],
    correct_answer: '48°',
    explanation: 'Co-interior angles add to 180°, so 180 - 132 = 48°.',
    wrong_answer_rationale: {
      '132°': 'Assumed co-interior angles are equal.',
      '168°': 'Subtracted incorrectly.',
      '228°': 'Added instead of subtracting.',
    },
    accessibility_text: 'Parallel lines with a co-interior angle 132 degrees.',
  },
  {
    id: 'Q35',
    difficulty: 'Hard',
    topic: 'multi_step',
    question_text: 'Around a point: 90?, 140? and 70?. Find the final angle.',
    diagram_description: 'Point with three angles labelled 90°, 140°, 70°.',
    options: ['40°', '50°', '60°', '70°'],
    correct_answer: '60°',
    explanation: '360 - 90 - 140 - 70 = 60.',
    wrong_answer_rationale: {
      '40°': 'Subtracted incorrectly.',
      '50°': 'Subtracted incorrectly.',
      '70°': 'Confused with one given angle.',
    },
    accessibility_text: 'Point with three angles labelled 90, 140, 70 degrees.',
  },
  {
    id: 'Q36',
    difficulty: 'Hard',
    topic: 'isosceles',
    question_text: 'Isosceles check: vertex angle is 30?. Find the base angles.',
    diagram_description: 'Isosceles triangle with top angle labelled 30°.',
    options: ['60°', '70°', '75°', '85°'],
    correct_answer: '75°',
    explanation: 'Remaining total is 150°. 150 Ã· 2 = 75.',
    wrong_answer_rationale: {
      '60°': 'Divided 120 instead of 150.',
      '70°': 'Divided incorrectly.',
      '85°': 'Subtracted incorrectly.',
    },
    accessibility_text: 'Isosceles triangle with top angle 30 degrees.',
  },
  {
    id: 'Q37',
    difficulty: 'Hard',
    topic: 'parallel_lines',
    question_text: 'Parallel lines: alternate angle is 72?. Find the adjacent angle.',
    diagram_description: 'Parallel lines with alternate angle 72°.',
    options: ['72°', '98°', '108°', '128°'],
    correct_answer: '108°',
    explanation: 'Adjacent on a straight line: 180 - 72 = 108.',
    wrong_answer_rationale: {
      '72°': 'Stayed with alternate angle.',
      '98°': 'Subtracted incorrectly.',
      '128°': 'Subtracted incorrectly.',
    },
    accessibility_text: 'Parallel lines with alternate angle 72 degrees.',
  },
  {
    id: 'Q38',
    difficulty: 'Hard',
    topic: 'word_problem',
    question_text: 'Compass turn: North to South-West. How many degrees?',
    diagram_description: 'Compass showing turn from North to South-West.',
    options: ['90°', '135°', '180°', '225°'],
    correct_answer: '225°',
    explanation: 'North to West is 270°; to South-West is 225°.',
    wrong_answer_rationale: {
      '90°': 'Quarter turn.',
      '135°': 'Three-eighths turn.',
      '180°': 'Half turn.',
    },
    accessibility_text: 'Compass showing a turn from North to South-West.',
  },
  {
    id: 'Q39',
    difficulty: 'Hard',
    topic: 'multi_step',
    question_text: 'Triangle check: one angle is 120?. The other two are equal. Find each angle.',
    diagram_description: 'Triangle with one angle labelled 120° and two equal angles.',
    options: ['20°', '30°', '40°', '50°'],
    correct_answer: '30°',
    explanation: 'Remaining total is 60°. Split equally: 60 Ã· 2 = 30.',
    wrong_answer_rationale: {
      '20°': 'Divided 40 instead of 60.',
      '40°': 'Subtracted incorrectly.',
      '50°': 'Guessed.',
    },
    accessibility_text: 'Triangle with one angle 120 degrees and two equal angles.',
  },
  {
    id: 'Q40',
    difficulty: 'Hard',
    topic: 'parallel_lines',
    question_text: 'Parallel lines: corresponding angle is 146?. Find the co-interior angle.',
    diagram_description: 'Parallel lines with corresponding angle 146°.',
    options: ['34°', '46°', '146°', '214°'],
    correct_answer: '34°',
    explanation: 'Co-interior angles total 180°. 180 - 146 = 34.',
    wrong_answer_rationale: {
      '46°': 'Subtracted incorrectly.',
      '146°': 'Stayed with corresponding angle.',
      '214°': 'Added instead of subtracting.',
    },
    accessibility_text: 'Parallel lines with corresponding angle 146 degrees.',
  },
  {
    id: 'Q41',
    difficulty: 'Expert',
    topic: 'multi_step',
    question_text: 'Triangle ratio 1:2:3. Find the smallest angle.',
    diagram_description: 'Triangle with angles labelled 1x, 2x, 3x.',
    options: ['20°', '30°', '40°', '50°'],
    correct_answer: '30°',
    explanation: 'Total parts 6. 180 Ã· 6 = 30. Smallest is 1 Ã— 30.',
    wrong_answer_rationale: {
      '20°': 'Divided 180 by 9 instead of 6.',
      '40°': 'Used 2x instead of 1x.',
      '50°': 'Guessed without using ratios.',
    },
    accessibility_text: 'Triangle with angles marked 1x, 2x, 3x.',
  },
  {
    id: 'Q42',
    difficulty: 'Expert',
    topic: 'straight_line',
    question_text: 'Straight line ratio 1:2. Find the smaller angle.',
    diagram_description: 'Straight line split into two angles labelled 1x and 2x.',
    options: ['50°', '60°', '70°', '80°'],
    correct_answer: '60°',
    explanation: 'Total parts 3. 180 Ã· 3 = 60. Smaller angle is 60°.',
    wrong_answer_rationale: {
      '50°': 'Divided 180 by 4.',
      '70°': 'Added instead of dividing.',
      '80°': 'Guessed.',
    },
    accessibility_text: 'Straight line split into angles 1x and 2x.',
  },
  {
    id: 'Q43',
    difficulty: 'Expert',
    topic: 'quadrilateral',
    question_text: 'Quadrilateral check: 90?, 110?, x and x. Find x.',
    diagram_description: 'Quadrilateral with angles 90°, 110° and two equal angles marked x.',
    options: ['70°', '80°', '90°', '100°'],
    correct_answer: '80°',
    explanation: 'Total is 360°. 360 - 90 - 110 = 160. Split equally gives 80°.',
    wrong_answer_rationale: {
      '70°': 'Subtracted incorrectly.',
      '90°': 'Assumed right angle.',
      '100°': 'Added instead of splitting equally.',
    },
    accessibility_text: 'Quadrilateral with angles 90 degrees, 110 degrees, and two equal angles.',
  },
  {
    id: 'Q44',
    difficulty: 'Expert',
    topic: 'around_point',
    question_text: 'Around a point ratio 2:3:5. Find the biggest angle.',
    diagram_description: 'Point with angles labelled 2x, 3x and 5x.',
    options: ['144°', '180°', '216°', '240°'],
    correct_answer: '180°',
    explanation: 'Total parts 10. 360 Ã· 10 = 36. Largest is 5 Ã— 36 = 180.',
    wrong_answer_rationale: {
      '144°': 'Used 4x instead of 5x.',
      '216°': 'Used 6x instead of 5x.',
      '240°': 'Used 6.5x instead of 5x.',
    },
    accessibility_text: 'Point with angles marked 2x, 3x, 5x.',
  },
  {
    id: 'Q45',
    difficulty: 'Expert',
    topic: 'isosceles',
    question_text: 'Isosceles check: vertex angle is 40?. Find each base angle.',
    diagram_description: 'Isosceles triangle with top angle labelled 40°.',
    options: ['60°', '70°', '80°', '90°'],
    correct_answer: '70°',
    explanation: 'Remaining total is 140°. 140 Ã· 2 = 70.',
    wrong_answer_rationale: {
      '60°': 'Divided 120 instead of 140.',
      '80°': 'Subtracted incorrectly.',
      '90°': 'Assumed right angle.',
    },
    accessibility_text: 'Isosceles triangle with top angle 40 degrees.',
  },
  {
    id: 'Q46',
    difficulty: 'Expert',
    topic: 'parallel_lines',
    question_text: 'Parallel lines: co-interior angle is 128?. Find the match.',
    diagram_description: 'Parallel lines with an interior angle labelled 128°.',
    options: ['42°', '52°', '128°', '180°'],
    correct_answer: '52°',
    explanation: 'Co-interior angles add to 180°. 180 - 128 = 52.',
    wrong_answer_rationale: {
      '42°': 'Subtracted incorrectly.',
      '128°': 'Assumed equal instead of supplementary.',
      '180°': 'Used straight line total only.',
    },
    accessibility_text: 'Parallel lines with an interior angle 128 degrees.',
  },
  {
    id: 'Q47',
    difficulty: 'Expert',
    topic: 'word_problem',
    question_text: 'Robot turn: a right angle, then 45?. Find the total.',
    diagram_description: 'Robot arrow showing a 90° turn then 45° more.',
    options: ['120°', '135°', '150°', '180°'],
    correct_answer: '135°',
    explanation: '90° + 45° = 135°.',
    wrong_answer_rationale: {
      '120°': 'Added only 30°.',
      '150°': 'Added 60° instead of 45°.',
      '180°': 'Rounded to a half turn.',
    },
    accessibility_text: 'Arrow showing a 90 degree turn then 45 degrees more.',
  },
  {
    id: 'Q48',
    difficulty: 'Expert',
    topic: 'triangle_angles',
    question_text: 'Triangle check: angles are 2x, 2x and x. Find x.',
    diagram_description: 'Triangle with angles labelled 2x, 2x and x.',
    options: ['30°', '36°', '40°', '45°'],
    correct_answer: '36°',
    explanation: 'Total parts 5. 180 Ã· 5 = 36.',
    wrong_answer_rationale: {
      '30°': 'Divided by 6 instead of 5.',
      '40°': 'Used 200 Ã· 5.',
      '45°': 'Guessed.',
    },
    accessibility_text: 'Triangle with angles marked 2x, 2x and x.',
  },
  {
    id: 'Q49',
    difficulty: 'Expert',
    topic: 'vertically_opposite',
    question_text: 'Crossed lines: one angle is 150?. Find the adjacent angle.',
    diagram_description: 'Crossing lines with one angle labelled 150°.',
    options: ['30°', '40°', '150°', '210°'],
    correct_answer: '30°',
    explanation: 'Adjacent angles on a straight line add to 180°. 180 - 150 = 30.',
    wrong_answer_rationale: {
      '40°': 'Subtracted incorrectly.',
      '150°': 'Used vertically opposite instead of adjacent.',
      '210°': 'Added instead of subtracting.',
    },
    accessibility_text: 'Crossing lines with one angle labelled 150 degrees.',
  },
  {
    id: 'Q50',
    difficulty: 'Expert',
    topic: 'quadrilateral',
    question_text: 'Quadrilateral ratio 1:1:2:2. Find the biggest angle.',
    diagram_description: 'Quadrilateral with angles labelled 1x, 1x, 2x, 2x.',
    options: ['90°', '100°', '120°', '150°'],
    correct_answer: '120°',
    explanation: 'Total parts 6. 360 Ã· 6 = 60. Largest is 2 Ã— 60 = 120.',
    wrong_answer_rationale: {
      '90°': 'Used 1.5x instead of 2x.',
      '100°': 'Added 40 instead of 60.',
      '150°': 'Used 2.5x instead of 2x.',
    },
    accessibility_text: 'Quadrilateral with angles marked 1x, 1x, 2x, 2x.',
  },
];

export const buildAngleQuestions = ({ launcherX, groundY, gravity }: BuildConfig): AngleQuestion[] => {
  const speed = 520;
  const all = questionBank.map((entry, index) =>
    toAngleQuestion(entry, index, speed, launcherX, groundY, gravity, 54),
  );
  return all.sort(() => Math.random() - 0.5);
};







