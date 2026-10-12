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
    subtitle: 'Choose a rhythm and start each breath cycle',
    type: 'Breathing',
    durationEstimate: 'About 1 min',
    description: 'Set a comfortable visual pace and check in between cycles.',
    icon: '🫧',
    component: BreathingBloom,
  },
  {
    id: 'peaceful_pond',
    title: 'Peaceful Pond',
    subtitle: 'Notice a detail, then guide a lily pad',
    type: 'Grounding',
    durationEstimate: '50 sec',
    description: 'Use sight, sound and touch as you guide four pads home.',
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
      subtitle: 'Trace three constellations and discover sky facts',
    type: 'Focus',
      durationEstimate: 'About 2 min',
      description: 'Trace three different constellations, uncover a fact after each, then shift focus side to side.',
    icon: '✨',
    component: ConstellationConnect,
  },
  {
    id: 'leaf_drift',
    title: 'Leaf Drift',
    subtitle: 'Notice a detail with each leaf',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Use sight, sound and touch to guide three leaves downstream.',
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
