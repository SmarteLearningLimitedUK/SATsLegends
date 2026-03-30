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
    title: 'Breathing Bloom',
    subtitle: 'Open the flower with slow breaths',
    type: 'Breathing',
    durationEstimate: '45 sec',
    description: 'A guided flower rhythm to help you breathe in, hold, and breathe out slowly.',
    icon: '??',
    component: BreathingBloom,
  },
  {
    id: 'ripple_water',
    title: 'Ripple Water',
    subtitle: 'Slow taps, calm ripples',
    type: 'Grounding',
    durationEstimate: '30 sec',
    description: 'Tap the water gently and watch the pond settle into smooth glowing ripples.',
    icon: '??',
    component: RippleWater,
  },
  {
    id: 'feather_float',
    title: 'Feather Float',
    subtitle: 'Keep the feather in the glow',
    type: 'Breathing',
    durationEstimate: '40 sec',
    description: 'Use gentle holds and releases to keep the feather drifting inside the calm band.',
    icon: '??',
    component: FeatherFloat,
  },
  {
    id: 'candle_calm',
    title: 'Candle Calm',
    subtitle: 'Steady the flame',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Slow, steady pressure helps the candle glow warmly instead of flickering.',
    icon: '???',
    component: CandleCalm,
  },
  {
    id: 'constellation_connect',
    title: 'Constellation Connect',
    subtitle: 'Trace a soft star path',
    type: 'Focus',
    durationEstimate: '40 sec',
    description: 'Connect glowing stars in order and let a gentle constellation appear.',
    icon: '?',
    component: ConstellationConnect,
  },
  {
    id: 'leaf_drift',
    title: 'Leaf Drift',
    subtitle: 'Guide leaves into the light',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Guide drifting leaves into a soft glow with light, easy touches.',
    icon: '??',
    component: LeafDrift,
  },
  {
    id: 'thought_sort',
    title: 'Thought Sort',
    subtitle: 'Keep what helps, let the rest go',
    type: 'Thought Reset',
    durationEstimate: '45 sec',
    description: 'Sort a few gentle thoughts into helpful calm or let-go clouds.',
    icon: '??',
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
