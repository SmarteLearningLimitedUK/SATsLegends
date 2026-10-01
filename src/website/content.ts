import numberArt from '../assets/maps/premium/place-value-panic.webp';
import fractionArt from '../assets/maps/premium/fraction-forge.webp';
import angleArt from '../assets/maps/premium/angle-arena.webp';
import operationsArt from '../assets/maps/premium/formula-forge.webp';
import dataArt from '../assets/maps/premium/data-detective.webp';
import ratioArt from '../assets/maps/premium/potion-panic.webp';

export interface RevisionTopic {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  island: number;
  steps: string[];
  example: string;
  tip: string;
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
}

export const revisionTopics: RevisionTopic[] = [
  { id: 'number', title: 'Know your numbers', category: 'Number', description: 'Place value, rounding and number confidence.', image: numberArt, island: 1,
    steps: ['Every digit has a value determined by its position.', 'From right to left, whole-number columns are ones, tens, hundreds and thousands.', 'To round, look at the digit one place to the right of the column you need. Five or more rounds up; less than five rounds down.'],
    example: 'In 3,472, the 4 is worth 400. Rounded to the nearest hundred, 3,472 becomes 3,500.', tip: 'Write the column headings above a number before you start.',
    question: 'What is 6,850 rounded to the nearest thousand?', answers: ['6,000', '6,800', '7,000'], correct: 2, explanation: 'The hundreds digit is 8, so round the thousands digit up: 7,000.' },
  { id: 'fractions', title: 'Crack the fraction code', category: 'Fractions', description: 'Fractions, decimals and percentages made clear.', image: fractionArt, island: 2,
    steps: ['The denominator tells you how many equal parts make a whole. The numerator tells you how many parts you have.', 'Multiply or divide both numbers by the same non-zero number to find an equivalent fraction.', 'Divide the numerator by the denominator to get a decimal. Multiply the decimal by 100 to get a percentage.'],
    example: '3/4 = 0.75 = 75%. And 3/4 is equivalent to 6/8.', tip: 'Remember these anchors: 1/2 = 50%, 1/4 = 25%, 3/4 = 75%.',
    question: 'Which percentage is equal to 2/5?', answers: ['20%', '40%', '50%'], correct: 1, explanation: '2 ÷ 5 = 0.4. Multiply by 100 to get 40%.' },
  { id: 'geometry', title: 'Get your angles right', category: 'Geometry', description: 'Angles, shapes, area and perimeter.', image: angleArt, island: 3,
    steps: ['A right angle is 90°. Angles on a straight line add up to 180°. Angles around a point add up to 360°.', 'The three inside angles in a triangle add up to 180°.', 'Perimeter is the distance around a shape. The area of a rectangle is length × width.'],
    example: 'A triangle has angles of 50° and 60°. The missing angle is 180° − 50° − 60° = 70°.', tip: 'Label what you know on the diagram before calculating what is missing.',
    question: 'Two angles on a straight line are 125° and…?', answers: ['35°', '55°', '65°'], correct: 1, explanation: 'A straight line totals 180°. So 180° − 125° = 55°.' },
  { id: 'operations', title: 'Power up your calculations', category: 'Arithmetic', description: 'Four operations, factors and order of operations.', image: operationsArt, island: 5,
    steps: ['Calculate brackets first, then powers, then multiplication and division, then addition and subtraction.', 'Multiplication and division have equal priority: work from left to right. Do the same for addition and subtraction.', 'Estimate before you calculate, then check whether your answer is reasonable.'],
    example: '6 + 4 × 3 = 6 + 12 = 18. But (6 + 4) × 3 = 10 × 3 = 30.', tip: 'A factor divides a number exactly. A multiple is a number in its times table.',
    question: 'What is 20 − 3 × 4?', answers: ['68', '8', '17'], correct: 1, explanation: 'Multiply first: 3 × 4 = 12. Then 20 − 12 = 8.' },
  { id: 'data', title: 'Become a data detective', category: 'Data', description: 'Read graphs, spot patterns and find the mean.', image: dataArt, island: 4,
    steps: ['Read the graph title, axis labels and scale before looking at the data.', 'Check what each interval represents. One square does not always mean one unit.', 'To find the mean, add all the values, then divide by how many values there are.'],
    example: 'The mean of 4, 6, 8 and 10 is (4 + 6 + 8 + 10) ÷ 4 = 7.', tip: 'Always include units in your answer when the graph uses them.',
    question: 'What is the mean of 3, 7 and 8?', answers: ['6', '7', '18'], correct: 0, explanation: '3 + 7 + 8 = 18. There are 3 values, so 18 ÷ 3 = 6.' },
  { id: 'ratio', title: 'Mix it. Share it. Scale it.', category: 'Ratio', description: 'Understand ratios and share amounts fairly.', image: ratioArt, island: 7,
    steps: ['A ratio compares amounts. A ratio of 2:3 means two parts of one quantity for every three parts of another.', 'For sharing questions, add the ratio numbers to find the total number of parts.', 'Divide the total amount by the number of parts, then multiply by each ratio number.'],
    example: 'Share 30 gems in the ratio 2:3. There are 5 parts. Each part is 30 ÷ 5 = 6, so the shares are 12 and 18.', tip: 'Check that your shares add back up to the original total.',
    question: 'Share 20 gems in the ratio 1:3. What is the smaller share?', answers: ['4', '5', '10'], correct: 1, explanation: 'There are 4 parts. Each part is 20 ÷ 4 = 5. The smaller share is one part: 5.' },
];

export const videoLessons = [
  { id: 'place-value', title: 'Place value, unlocked', category: 'Number', description: 'See how a digit’s position changes its value.', image: numberArt, topic: 'number', duration: '0:32' },
  { id: 'fractions', title: 'One fraction. Three ways.', category: 'Fractions', description: 'Connect fractions, decimals and percentages.', image: fractionArt, topic: 'fractions', duration: '0:32' },
  { id: 'angles', title: 'Find the missing angle', category: 'Geometry', description: 'Use a straight line to solve an angle puzzle.', image: angleArt, topic: 'geometry', duration: '0:32' },
];
