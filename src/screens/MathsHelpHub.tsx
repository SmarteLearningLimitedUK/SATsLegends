import React, { useMemo, useState } from 'react';
import AssetIcon from '../components/AssetIcon';

type GlossaryTerm = {
  term: string;
  category: string;
  definition: string;
  example: string;
  quickTip: string;
};

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'BIDMAS',
    category: 'Operations',
    definition: 'The order to solve calculations: Brackets, Indices, Division, Multiplication, Addition, Subtraction.',
    example: '3 + 4 x 2 = 11 (multiply first, then add)',
    quickTip: 'Do brackets first, then indices, then division and multiplication, then addition and subtraction.',
  },
  {
    term: 'Right Angle',
    category: 'Geometry',
    definition: 'An angle that measures exactly 90 degrees.',
    example: 'The corner of a square is a right angle.',
    quickTip: 'Right angles make a perfect corner.',
  },
  {
    term: 'Acute Angle',
    category: 'Geometry',
    definition: 'An angle smaller than 90 degrees.',
    example: '45 degrees is an acute angle.',
    quickTip: 'Acute angles are smaller than a right angle.',
  },
  {
    term: 'Obtuse Angle',
    category: 'Geometry',
    definition: 'An angle greater than 90 degrees but less than 180 degrees.',
    example: '120 degrees is an obtuse angle.',
    quickTip: 'Obtuse angles are wider than a right angle.',
  },
  {
    term: 'Reflex Angle',
    category: 'Geometry',
    definition: 'An angle greater than 180 degrees but less than 360 degrees.',
    example: '270 degrees is a reflex angle.',
    quickTip: 'A reflex angle goes around the outside.',
  },
  {
    term: 'Mean',
    category: 'Statistics',
    definition: 'The average of a set of numbers.',
    example: '(2 + 4 + 6) divided by 3 = 4',
    quickTip: 'Add the values, then divide by how many there are.',
  },
  {
    term: 'Median',
    category: 'Statistics',
    definition: 'The middle number when numbers are in order.',
    example: '2, 5, 9 -> median = 5',
    quickTip: 'Put the numbers in order first.',
  },
  {
    term: 'Mode',
    category: 'Statistics',
    definition: 'The number that appears most often.',
    example: '3, 3, 5, 7 -> mode = 3',
    quickTip: 'Mode means most often.',
  },
  {
    term: 'Range',
    category: 'Statistics',
    definition: 'The difference between the largest and smallest values.',
    example: '10 - 3 = 7',
    quickTip: 'Range means biggest minus smallest.',
  },
  {
    term: 'Remainder',
    category: 'Operations',
    definition: 'What is left over after division.',
    example: '17 divided by 5 = 3 remainder 2',
    quickTip: 'The remainder must be smaller than the divisor.',
  },
  {
    term: 'Quotient',
    category: 'Operations',
    definition: 'The answer to a division.',
    example: '20 divided by 5 = 4 -> quotient = 4',
    quickTip: 'Quotient means division answer.',
  },
  {
    term: 'Product',
    category: 'Operations',
    definition: 'The answer to a multiplication.',
    example: '6 x 4 = 24 -> product = 24',
    quickTip: 'Product means multiplication answer.',
  },
  {
    term: 'Sum',
    category: 'Operations',
    definition: 'The total after addition.',
    example: '7 + 8 = 15',
    quickTip: 'Sum means total.',
  },
  {
    term: 'Difference',
    category: 'Operations',
    definition: 'The result of subtraction.',
    example: '10 - 6 = 4',
    quickTip: 'Difference comes from subtracting.',
  },
  {
    term: 'Area',
    category: 'Measurement',
    definition: 'The space inside a shape.',
    example: 'Rectangle: 5 x 3 = 15 cm squared',
    quickTip: 'Area is inside a shape and uses square units.',
  },
  {
    term: 'Perimeter',
    category: 'Measurement',
    definition: 'The distance around a shape.',
    example: 'Square: 4 + 4 + 4 + 4 = 16 cm',
    quickTip: 'Perimeter means walk around the edge.',
  },
  {
    term: 'Volume',
    category: 'Measurement',
    definition: 'The space inside a 3D shape.',
    example: '2 x 3 x 4 = 24 cm cubed',
    quickTip: 'Volume uses cubic units.',
  },
  {
    term: 'Capacity',
    category: 'Measurement',
    definition: 'How much something can hold.',
    example: 'A bottle holds 1 litre.',
    quickTip: 'Capacity is usually measured in ml or litres.',
  },
  {
    term: 'Equivalent',
    category: 'Fractions, Decimals & Percentages',
    definition: 'Equal in value.',
    example: '1/2 = 2/4',
    quickTip: 'Equivalent means worth the same.',
  },
  {
    term: 'Numerator',
    category: 'Fractions, Decimals & Percentages',
    definition: 'The top number in a fraction.',
    example: 'In 3/5, the numerator is 3.',
    quickTip: 'The numerator tells how many parts you have.',
  },
  {
    term: 'Denominator',
    category: 'Fractions, Decimals & Percentages',
    definition: 'The bottom number in a fraction.',
    example: 'In 3/5, the denominator is 5.',
    quickTip: 'The denominator tells how many equal parts make the whole.',
  },
  {
    term: 'Improper Fraction',
    category: 'Fractions, Decimals & Percentages',
    definition: 'A fraction where the numerator is bigger than the denominator.',
    example: '7/4',
    quickTip: 'Improper fractions are at least one whole.',
  },
  {
    term: 'Mixed Number',
    category: 'Fractions, Decimals & Percentages',
    definition: 'A whole number and a fraction together.',
    example: '1 3/4',
    quickTip: 'A mixed number combines a whole and a fraction.',
  },
  {
    term: 'Multiple',
    category: 'Number',
    definition: 'A number in another number s times table.',
    example: '24 is a multiple of 6.',
    quickTip: 'Multiples come from skip counting.',
  },
  {
    term: 'Factor',
    category: 'Number',
    definition: 'A number that divides exactly into another number.',
    example: '3 is a factor of 12.',
    quickTip: 'Factors divide with no remainder.',
  },
  {
    term: 'Prime Number',
    category: 'Number',
    definition: 'A number with only two factors: 1 and itself.',
    example: '7 is prime.',
    quickTip: '1 is not a prime number.',
  },
  {
    term: 'Square Number',
    category: 'Number',
    definition: 'A number multiplied by itself.',
    example: '5 x 5 = 25',
    quickTip: 'Square numbers come from equal rows and columns.',
  },
  {
    term: 'Percentage',
    category: 'Fractions, Decimals & Percentages',
    definition: 'A number out of 100.',
    example: '25% = 25 out of 100',
    quickTip: 'Percent means out of 100.',
  },
  {
    term: 'Ratio',
    category: 'Fractions, Decimals & Percentages',
    definition: 'A comparison between two amounts.',
    example: '2:3 means 2 parts to 3 parts',
    quickTip: 'Ratios compare parts.',
  },
  {
    term: 'Coordinate',
    category: 'Geometry',
    definition: 'A position on a grid using two numbers.',
    example: '(3, 5) -> 3 across, 5 up',
    quickTip: 'Read x first, then y.',
  },
];

interface MathsHelpHubProps {
  onBack: () => void;
}

const MathsHelpHub: React.FC<MathsHelpHubProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');

  const filteredTerms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return GLOSSARY_TERMS;
    return GLOSSARY_TERMS.filter((term) => (
      term.term.toLowerCase().includes(query)
      || term.category.toLowerCase().includes(query)
      || term.definition.toLowerCase().includes(query)
    ));
  }, [search]);

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[#050914] px-3 py-4 text-white">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-24">
        <div className="rounded-[1.15rem] border border-amber-300/60 bg-[linear-gradient(180deg,rgba(5,25,67,0.96),rgba(4,15,38,0.94))] p-4 shadow-[0_12px_24px_rgba(2,6,23,0.42)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Glossary</div>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-white">Maths Help Hub</h1>
              <p className="mt-1 text-sm font-bold text-cyan-100/80">Quick meanings, examples and tricks for SATs maths.</p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="ui-icon-button flex h-12 w-12 shrink-0 items-center justify-center text-white"
              aria-label="Back to map"
            >
              <AssetIcon name="back" className="h-5 w-5" />
            </button>
          </div>

          <label className="mt-4 block">
            <span className="sr-only">Search glossary</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search mean, area, BIDMAS..."
              className="h-12 w-full rounded-[0.8rem] border border-cyan-100/35 bg-slate-950/52 px-4 text-base font-bold text-white outline-none placeholder:text-cyan-100/45 focus:border-amber-200"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {filteredTerms.map((term) => (
            <article
              key={term.term}
              className="rounded-[1rem] border border-cyan-100/28 bg-[linear-gradient(180deg,rgba(7,35,82,0.92),rgba(4,17,43,0.94))] p-4 shadow-[0_8px_18px_rgba(2,6,23,0.3)]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-black text-white">{term.term}</h2>
                <span className="rounded-full border border-amber-200/45 bg-amber-300/12 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
                  {term.category}
                </span>
              </div>
              <p className="mt-3 text-sm font-bold leading-relaxed text-cyan-50/88">{term.definition}</p>
              <p className="mt-3 rounded-[0.7rem] bg-slate-950/40 p-3 text-sm font-black text-white">{term.example}</p>
              <p className="mt-2 text-sm font-bold text-amber-100">{term.quickTip}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MathsHelpHub;
