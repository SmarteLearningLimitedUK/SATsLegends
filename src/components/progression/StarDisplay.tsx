import React from 'react';
import { StarCount } from '../../lib/progression/types';
import AnimatedStarDisplay from './AnimatedStarDisplay';

interface StarDisplayProps {
  stars: StarCount;
  sizeClassName?: string;
}

const StarDisplay: React.FC<StarDisplayProps> = ({ stars, sizeClassName }) => (
  <AnimatedStarDisplay stars={stars} play={false} sizeClassName={sizeClassName} />
);

export default StarDisplay;
