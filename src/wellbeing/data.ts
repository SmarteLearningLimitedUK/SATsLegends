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
    title: 'Breath Bloom',
    subtitle: 'Follow a gentle breathing rhythm',
    type: 'Breathing',
    durationEstimate: 'About 1 min',
    description: 'Follow the flower at a pace that feels comfortable.',
    icon: '🫧',
    component: BreathingBloom,
  },
  {
    id: 'peaceful_pond',
    title: 'Peaceful Pond',
    subtitle: 'Notice a detail, then guide a lily pad',
    type: 'Grounding',
    durationEstimate: '50 sec',
    description: 'Notice a sight, a sound or a feeling as you guide the lily pads.',
    icon: '🪷',
    component: PeacefulPond,
  },
  {
    id: 'candle_calm',
    title: 'Lantern Camp',
    subtitle: 'Notice the scene, then dim the lantern',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Pack the camp while noticing small details, then tune the light.',
    icon: '🏕️',
    component: CandleCalm,
  },
  {
    id: 'constellation_connect',
    title: 'Star Path',
    subtitle: 'Follow one glowing star at a time',
    type: 'Focus',
    durationEstimate: 'At your pace',
    description: 'Connect a constellation, then choose whether to rest or follow another.',
    icon: '✨',
    component: ConstellationConnect,
  },
  {
    id: 'leaf_drift',
    title: 'Leaf Drift',
    subtitle: 'Notice a detail with each leaf',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Give a sight, sound or scent a moment of attention as the leaves drift.',
    icon: '🍃',
    component: LeafDrift,
  },
  {
    id: 'thought_sort',
    title: 'Thought Release',
    subtitle: 'Name a feeling and choose a balanced thought',
    type: 'Thought Reset',
    durationEstimate: '45 sec',
    description: 'Name a feeling, find another angle, and release the balloon.',
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
