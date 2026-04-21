import BreathingBloom from './activities/BreathingBloom';
import CandleCalm from './activities/CandleCalm';
import ConstellationConnect from './activities/ConstellationConnect';
import LeafDrift from './activities/LeafDrift';
import PeacefulPond from './activities/PeacefulPond';
import ThoughtSort from './activities/ThoughtSort';
import { WellbeingActivityId, WellbeingActivityMeta } from './types';

export const WELLBEING_ACTIVITIES: WellbeingActivityMeta[] = [
  {
    id: 'breathing_bloom',
    title: 'Bubble Breath',
    subtitle: 'Breathe with the 4-7-8 rhythm',
    type: 'Breathing',
    durationEstimate: '45 sec',
    description: 'Grow the glowing orb with a steady breath and let it drift back down.',
    icon: '🫧',
    component: BreathingBloom,
  },
  {
    id: 'peaceful_pond',
    title: 'Peaceful Pond',
    subtitle: 'Guide the lilypads and fish',
    type: 'Grounding',
    durationEstimate: '50 sec',
    description: 'Push lilypads across the pond and guide the fish into calmer waters.',
    icon: '🪷',
    component: PeacefulPond,
  },
  {
    id: 'candle_calm',
    title: 'Sleepy Room',
    subtitle: 'Clear the room and tuck the baby monster in',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Clear the bedroom clutter, then tap the crib to help the baby monster settle.',
    icon: '🛏️',
    component: CandleCalm,
  },
  {
    id: 'constellation_connect',
    title: 'Star Path',
    subtitle: 'Trace the stars in order',
    type: 'Focus',
    durationEstimate: '40 sec',
    description: 'Connect the glowing stars in order and reveal the full path.',
    icon: '✨',
    component: ConstellationConnect,
  },
  {
    id: 'leaf_drift',
    title: 'Leaf Drift',
    subtitle: 'Guide leaves into the glow',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Guide drifting leaves into a soft glow with light, easy touches.',
    icon: '🍃',
    component: LeafDrift,
  },
  {
    id: 'thought_sort',
    title: 'Worry Balloon',
    subtitle: 'Let worries float away',
    type: 'Thought Reset',
    durationEstimate: '45 sec',
    description: 'Type a worry, release it, and watch it drift upward out of the way.',
    icon: '🎈',
    component: ThoughtSort,
  },
];

export const WELLBEING_BY_ID: Record<WellbeingActivityId, WellbeingActivityMeta> = WELLBEING_ACTIVITIES.reduce((acc, activity) => {
  acc[activity.id] = activity;
  return acc;
}, {} as Record<WellbeingActivityId, WellbeingActivityMeta>);

export const WELLBEING_ACTIVITY_BY_ISLAND: Record<number, WellbeingActivityId> = {
  1: 'breathing_bloom',
  2: 'leaf_drift',
  3: 'constellation_connect',
  4: 'peaceful_pond',
  5: 'thought_sort',
  6: 'candle_calm',
  7: 'peaceful_pond',
};
