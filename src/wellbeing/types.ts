import React from 'react';

export type WellbeingActivityId =
  | 'breathing_bloom'
  | 'peaceful_pond'
  | 'constellation_connect'
  | 'leaf_drift'
  | 'thought_sort'
  | 'affirmation_station';

export type WellbeingActivityType = 'Breathing' | 'Focus' | 'Grounding' | 'Thought Reset';

export type WellbeingOrigin =
  | 'world_map'
  | 'island_levels'
  | 'post_fail'
  | 'gameplay_break'
  | 'manual';

export interface WellbeingActivityComponentProps {
  onComplete: () => void;
  onExit: () => void;
}

export interface WellbeingActivityMeta {
  id: WellbeingActivityId;
  title: string;
  subtitle: string;
  type: WellbeingActivityType;
  durationEstimate: string;
  description: string;
  icon: string;
  component: React.ComponentType<WellbeingActivityComponentProps>;
}

export interface WellbeingLaunchContext {
  origin: WellbeingOrigin;
  islandId?: number | null;
  suggested?: boolean;
}

export interface WellbeingCompletionState {
  activityId: WellbeingActivityId;
  rewardLabel: string;
}
