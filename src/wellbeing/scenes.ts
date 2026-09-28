import breathingBloom from '../assets/wellbeing/scenes/breathing-bloom.webp';
import peacefulPond from '../assets/wellbeing/scenes/peaceful-pond.webp';
import lanternCamp from '../assets/wellbeing/scenes/lantern-camp.webp';
import starPath from '../assets/wellbeing/scenes/star-path.webp';
import leafDrift from '../assets/wellbeing/scenes/leaf-drift.webp';
import worryBalloon from '../assets/wellbeing/scenes/worry-balloon.webp';
import { WellbeingActivityId } from './types';

export const WELLBEING_SCENES: Record<WellbeingActivityId, string> = {
  breathing_bloom: breathingBloom,
  peaceful_pond: peacefulPond,
  candle_calm: lanternCamp,
  constellation_connect: starPath,
  leaf_drift: leafDrift,
  thought_sort: worryBalloon,
};
