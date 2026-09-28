import React from 'react';
import { ArrowUpRight, Leaf } from 'lucide-react';
import WellbeingShell from './WellbeingShell';
import { WELLBEING_SCENES } from './scenes';
import { WellbeingActivityMeta } from './types';

interface WellbeingHubProps {
  activities: WellbeingActivityMeta[];
  calmTokens: number;
  onSelect: (activityId: WellbeingActivityMeta['id']) => void;
  onExit: () => void;
}

const WellbeingHub: React.FC<WellbeingHubProps> = ({ activities, calmTokens, onSelect, onExit }) => (
  <WellbeingShell title="Calm Grove" subtitle="Choose a small pause. Explore at your own pace." onExit={onExit}>
    <div className="wellbeing-hub-scroll" data-wellbeing-scroll-region="hub" data-calm-tokens={calmTokens}>
      <div className="wellbeing-hub-grid">
        {activities.map((activity) => (
          <button key={activity.id} type="button" onClick={() => onSelect(activity.id)} className="wellbeing-destination" data-button-skin="none" data-wellbeing-select={activity.id}>
            <div className="wellbeing-destination-art"><img src={WELLBEING_SCENES[activity.id]} alt="" draggable={false} /><span>{activity.durationEstimate}</span></div>
            <div className="wellbeing-destination-copy">
              <span className="wellbeing-eyebrow">{activity.type}</span>
              <h2>{activity.title}<ArrowUpRight size={18} aria-hidden="true" /></h2>
              <p>{activity.description}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="wellbeing-hub-note"><Leaf size={17} aria-hidden="true" />Leaf tokens collected: {calmTokens}<span>Every pause is yours to choose.</span></p>
    </div>
  </WellbeingShell>
);

export default WellbeingHub;
