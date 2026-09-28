import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { WELLBEING_SCENES } from './scenes';
import { WellbeingActivityId } from './types';
import './wellbeing.css';

interface WellbeingShellProps {
  title: string;
  subtitle?: string;
  type?: string;
  activityId?: WellbeingActivityId;
  progress?: number;
  status?: string;
  purpose?: string;
  affirmation?: string;
  paused?: boolean;
  onExit: () => void;
  children: React.ReactNode;
}

const WellbeingShell: React.FC<WellbeingShellProps> = ({
  title, subtitle, type, activityId, progress, status, purpose, affirmation,
  paused = false, onExit, children,
}) => {
  const safeProgress = Math.max(0, Math.min(100, progress ?? 0));
  return (
    <section className={`wellbeing-shell${activityId ? '' : ' wellbeing-shell--hub'}`} data-wellbeing-activity={activityId ?? 'hub'} data-wellbeing-paused={paused} aria-label={title}>
      <div className="wellbeing-landscape" aria-hidden="true">
        <img src={WELLBEING_SCENES[activityId ?? 'leaf_drift']} alt="" draggable={false} data-wellbeing-scene />
        <div className="wellbeing-scene-shade" />
        <div className="wellbeing-haze wellbeing-drift" />
        <div className="wellbeing-light wellbeing-drift" />
        <div className="wellbeing-motes">
          {Array.from({ length: 7 }, (_, index) => (
            <span className="wellbeing-drift" key={index} style={{
              left: `${12 + index * 12}%`, top: `${24 + (index % 3) * 20}%`,
              animationDelay: `${index * -2.1}s`, animationDuration: `${13 + index * 1.4}s`,
            }} />
          ))}
        </div>
      </div>
      <header className="wellbeing-header">
        <div className="wellbeing-heading">
          <span className="wellbeing-eyebrow">{activityId ? `Calm Grove · ${type ?? 'A moment for you'}` : 'A moment for you'}</span>
          <h1>{title}</h1>
          {subtitle ? <p className="wellbeing-how-to" data-wellbeing-instructions>{subtitle}</p> : null}
          {purpose ? <p className="wellbeing-purpose" data-wellbeing-purpose>{purpose}</p> : null}
        </div>
        <button type="button" onClick={onExit} className="wellbeing-exit" data-button-skin="none" data-wellbeing-exit aria-label="Back to adventure">
          <ArrowLeft size={19} aria-hidden="true" /><span>Back to adventure</span>
        </button>
      </header>
      <div className="wellbeing-content">{children}</div>
      {status || affirmation || progress !== undefined ? (
        <footer className="wellbeing-footer">
          {status ? <p data-wellbeing-status role="status" aria-live="polite">{status}</p> : null}
          {progress !== undefined ? (
            <div className="wellbeing-progress" role="progressbar" aria-label={`${title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safeProgress)} data-wellbeing-progress={Math.round(safeProgress)}>
              <span style={{ width: `${safeProgress}%` }} />
            </div>
          ) : null}
          {affirmation ? <p className="wellbeing-affirmation" data-wellbeing-affirmation>{affirmation}</p> : null}
        </footer>
      ) : null}
    </section>
  );
};

export default WellbeingShell;
