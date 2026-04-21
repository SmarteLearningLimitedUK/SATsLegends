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
    subtitle: 'Expand and soften with the 4-7-8 rhythm',
    type: 'Breathing',
    durationEstimate: '45 sec',
    description: 'Expand the glowing orb with slow breathing and let it settle back gently.',
    icon: '🫧',
    component: BreathingBloom,
  },
  {
    id: 'ripple_water',
    title: 'Cloud Catcher',
    subtitle: 'Pop stress clouds before they drift away',
    type: 'Grounding',
    durationEstimate: '30 sec',
    description: 'Tap the drifting clouds and keep the sky feeling light and steady.',
    icon: '☁️',
    component: RippleWater,
  },
  {
    id: 'feather_float',
    title: 'Thought Jar',
    subtitle: 'Lock away unhelpful thoughts',
    type: 'Breathing',
    durationEstimate: '40 sec',
    description: 'Drag each thought into the jar and keep the helpful ones in view.',
    icon: '🫙',
    component: FeatherFloat,
  },
  {
    id: 'candle_calm',
    title: 'Calm Garden',
    subtitle: 'Plant and grow a quiet garden',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Tap to grow soft blooms and let the garden settle into a calm rhythm.',
    icon: '🌱',
    component: CandleCalm,
  },
  {
    id: 'constellation_connect',
    title: 'Star Path',
    subtitle: 'Trace a gentle constellation',
    type: 'Focus',
    durationEstimate: '40 sec',
    description: 'Connect the glowing stars in order and reveal the full pattern.',
    icon: '✨',
    component: ConstellationConnect,
  },
  {
    id: 'leaf_drift',
    title: 'Leaf Drift',
    subtitle: 'Guide leaves into the light',
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
