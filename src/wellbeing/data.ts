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
    subtitle: 'Follow a gentle rhythm at a comfortable pace',
    type: 'Breathing',
    durationEstimate: '40 sec',
    description: 'Follow the bloom. Pause whenever you like.',
    icon: '🫧',
    component: BreathingBloom,
  },
  {
    id: 'peaceful_pond',
    title: 'Peaceful Pond',
    subtitle: 'Guide the lilypads and fish',
    type: 'Grounding',
    durationEstimate: '50 sec',
    description: 'Guide four lily pads home and watch the water ripple.',
    icon: '🪷',
    component: PeacefulPond,
  },
  {
    id: 'candle_calm',
    title: 'Lantern Camp',
    subtitle: 'Pack the camp and dim the lantern',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Put six things away, then enjoy the evening glow.',
    icon: '🏕️',
    component: CandleCalm,
  },
  {
    id: 'constellation_connect',
    title: 'Star Path',
    subtitle: 'Trace the stars in order',
    type: 'Focus',
    durationEstimate: '40 sec',
    description: 'Connect five stars, one small step at a time.',
    icon: '✨',
    component: ConstellationConnect,
  },
  {
    id: 'leaf_drift',
    title: 'Leaf Drift',
    subtitle: 'Guide leaves into the glow',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Send three leaves along a quiet woodland stream.',
    icon: '🍃',
    component: LeafDrift,
  },
  {
    id: 'thought_sort',
    title: 'Worry Balloon',
    subtitle: 'Name a feeling and release your balloon',
    type: 'Thought Reset',
    durationEstimate: '45 sec',
    description: 'Choose a few feeling words and let a balloon drift into the sky.',
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
