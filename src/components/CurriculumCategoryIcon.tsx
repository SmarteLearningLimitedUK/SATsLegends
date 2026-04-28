import React from 'react';
import spriteSheet from '../assets/curriculum_icons/categoryicons.png';

export type CurriculumCategory =
  | 'Number'
  | 'Fractions'
  | 'Ratio'
  | 'Algebra'
  | 'Geometry'
  | 'Measure'
  | 'Statistics'
  | 'Reasoning'
  | 'SATs Practice';

const CATEGORY_INDEX: Record<CurriculumCategory, number> = {
  Number: 0,
  Fractions: 1,
  Ratio: 2,
  Algebra: 3,
  Geometry: 4,
  Measure: 5,
  Statistics: 6,
  Reasoning: 7,
  'SATs Practice': 8,
};

type Props = {
  category: CurriculumCategory;
  size?: number;
  className?: string;
};

const CurriculumCategoryIcon: React.FC<Props> = ({ category, size = 96, className = '' }) => {
  const index = CATEGORY_INDEX[category];
  const col = index % 3;
  const row = Math.floor(index / 3);

  // Sprite sheet is 1536x1536, with 3x3 cells -> 512x512 per icon.
  const cell = 512;
  const bgSize = `${cell * 3}px ${cell * 3}px`;
  const bgPos = `${-col * cell}px ${-row * cell}px`;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${spriteSheet})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: bgSize,
        backgroundPosition: bgPos,
      }}
    />
  );
};

export default CurriculumCategoryIcon;

