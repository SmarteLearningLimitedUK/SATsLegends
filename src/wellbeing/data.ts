import BreathingBloom from './activities/BreathingBloom';
import RippleWater from './activities/RippleWater';
import FeatherFloat from './activities/FeatherFloat';
import CandleCalm from './activities/CandleCalm';
import ConstellationConnect from './activities/ConstellationConnect';
import LeafDrift from './activities/LeafDrift';
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
    id: 'ripple_water',
    title: 'Cloud Catcher',
    subtitle: 'Catch clouds before they drift away',
    type: 'Grounding',
    durationEstimate: '30 sec',
    description: 'Tap each drifting cloud and keep the grove sky bright and calm.',
    icon: '☁️',
    component: RippleWater,
  },
  {
    id: 'feather_float',
    title: 'Let It Go',
    subtitle: 'Choose a feeling and send it free',
    type: 'Breathing',
    durationEstimate: '40 sec',
    description: 'Pick words for how you feel, fill the balloon, then blow it free.',
    icon: '🫙',
    component: FeatherFloat,
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
  4: 'ripple_water',
  5: 'thought_sort',
  6: 'candle_calm',
  7: 'feather_float',
};
