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
    definition: 'The order to do calculations: Brackets, Indices, Division, Multiplication, Addition, Subtraction.',
    example: '3 + 4 x 2 = 11 because multiplication happens before addition.',
    quickTip: 'Do x and division from left to right, then + and - from left to right.',
  },
  {
    term: 'Area',
    category: 'Measurement',
    definition: 'The amount of space inside a 2D shape.',
    example: 'A rectangle 5 cm by 3 cm has area 15 cm2.',
    quickTip: 'Area is measured in square units.',
  },
  {
    term: 'Perimeter',
    category: 'Measurement',
    definition: 'The distance around the outside of a 2D shape.',
    example: 'A square with sides of 4 cm has perimeter 16 cm.',
    quickTip: 'Walk around the edge and add the sides.',
  },
  {
    term: 'Mean',
    category: 'Statistics',
    definition: 'The average found by adding all values and dividing by how many values there are.',
    example: 'The mean of 2, 4 and 6 is 4.',
    quickTip: 'Add them, then share equally.',
  },
  {
    term: 'Mode',
    category: 'Statistics',
    definition: 'The value that appears most often.',
    example: 'In 2, 3, 3, 5, 7, the mode is 3.',
    quickTip: 'Mode sounds like most.',
  },
  {
    term: 'Ratio',
    category: 'Fractions, Decimals & Percentages',
    definition: 'A comparison between amounts.',
    example: 'A ratio of 2:3 means 2 parts to 3 parts.',
    quickTip: 'Add the parts to find the total number of parts.',
  },
  {
    term: 'Coordinate',
    category: 'Geometry',
    definition: 'A pair of numbers that gives a position on a grid.',
    example: '(3, 5) means 3 across and 5 up.',
    quickTip: 'Along the corridor, then up the stairs.',
  },
  {
    term: 'Prime number',
    category: 'Number',
    definition: 'A number greater than 1 with exactly two factors: 1 and itself.',
    example: '7 is prime.',
    quickTip: '1 is not a prime number.',
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
