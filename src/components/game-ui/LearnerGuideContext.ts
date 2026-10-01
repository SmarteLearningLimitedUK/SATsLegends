import { createContext } from 'react';
import type { LearnerGuide } from '../../systems/content/learnerGuides';
export const LearnerGuideContext = createContext<{ guide: LearnerGuide | null; introManaged: boolean; introDismissed: boolean } | null>(null);
