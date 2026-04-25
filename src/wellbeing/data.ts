import AffirmationStation from './activities/AffirmationStation';
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
    subtitle: 'Inflate the calm bubble with each slow breath',
    type: 'Breathing',
    durationEstimate: '45 sec',
    description: 'Watch a clear bubble swell on the in-breath and soften on the out-breath beneath a sunny sky.',
    icon: 'Bubble',
    component: BreathingBloom,
  },
  {
    id: 'peaceful_pond',
    title: 'Peaceful Pond',
    subtitle: 'Herd the fish into the calm blue cove',
    type: 'Grounding',
    durationEstimate: '50 sec',
    description: 'Sweep gentle currents through the bright blue water and guide the fish into a glowing sanctuary.',
    icon: 'Pond',
    component: PeacefulPond,
  },
  {
    id: 'candle_calm',
    title: 'Sleepy Room',
    subtitle: 'Clear the room and tuck the baby monster in',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Clear the bedroom clutter, then tap the crib to help the baby monster settle.',
    icon: 'Rest',
    component: CandleCalm,
  },
  {
    id: 'constellation_connect',
    title: 'Star Path',
    subtitle: 'Trace three constellations across the night sky',
    type: 'Focus',
    durationEstimate: '30 sec',
    description: 'Follow multiple constellations in order and stay with the sky long enough to settle into the moment.',
    icon: 'Stars',
    component: ConstellationConnect,
  },
  {
    id: 'leaf_drift',
    title: 'Leaf Drift',
    subtitle: 'Guide the grove leaves into the golden resting place',
    type: 'Grounding',
    durationEstimate: '35 sec',
    description: 'Use the new drifting leaf shapes from the calm grove and guide them gently into the warm glow.',
    icon: 'Leaves',
    component: LeafDrift,
  },
  {
    id: 'thought_sort',
    title: 'Worry Balloon',
    subtitle: 'Choose a few feelings and let them float away',
    type: 'Thought Reset',
    durationEstimate: '45 sec',
    description: 'Choose the feelings that fit, then send the balloon into a bright, cloud-filled sky.',
    icon: 'Balloon',
    component: ThoughtSort,
  },
  {
    id: 'affirmation_station',
    title: 'Affirmation Station',
    subtitle: 'Pop positive affirmations in the calm sky',
    type: 'Focus',
    durationEstimate: '40 sec',
    description: 'Listen to gentle calm music and pop floating affirmation bubbles in a soothing Prime Pop-style activity.',
    icon: 'Glow',
    component: AffirmationStation,
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
  7: 'affirmation_station',
};
