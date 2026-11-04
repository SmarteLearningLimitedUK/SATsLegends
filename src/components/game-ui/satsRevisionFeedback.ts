import type { SatsMission } from '../../systems/content/satsAdventure';

/** Keep construction storage tokens out of learner-facing answer feedback. */
export function revisionAnswerSummary(mission: SatsMission, values = mission.fields.map(f => f.answer)): string {
  if (mission.visual.type === 'depth') {
    const model = mission.visual.model;
    if (model.kind === 'fraction-grid' && model.construct) {
      const count = values[0]?.match(/^shade:(\d+)$/)?.[1];
      return count ? `${count} of 100 squares shaded` : 'Not answered';
    }
    if (model.kind === 'pictogram-build') {
      const parts = values[0]?.split(':').slice(1) ?? [];
      return model.labels.map((label, i) => `${label}: ${/^\d+$/.test(parts[i] ?? '') ? `${Number(parts[i]) / 2} ${Number(parts[i]) === 2 ? 'symbol' : 'symbols'}` : 'not placed'}`).join(' · ');
    }
  }
  return mission.fields.map((f, i) => `${f.label}: ${values[i] || 'Not answered'}`).join(' · ');
}
