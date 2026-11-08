import type { SatsMission } from '../../systems/content/satsAdventure';

/** Keep construction storage tokens out of learner-facing answer feedback. */
export function revisionAnswerSummary(mission: SatsMission, values = mission.fields.map(f => f.answer)): string {
  const response=mission.assessment?.response;
  if(response?.kind==='ordering'||response?.kind==='select-many'){
    try{const items=JSON.parse(values[0]??'');if(Array.isArray(items))return items.map(v=>response.kind==='select-many'?response.options[Number(v)]:v).join(response.kind==='ordering'?' < ':', ')||'Not answered';}catch{/* An incomplete response is shown below. */}
  }
  if(mission.assessment?.quiz&&mission.marking?.kind==='rectangle'){
    const parts=values[0]?.match(/^rect:(\d+):(\d+)$/);return parts?`${parts[1]} cm × ${parts[2]} cm`:'Not answered';
  }
  if(mission.assessment?.quiz&&mission.marking?.kind==='plot'&&mission.visual.type==='depth'){
    const parts=values[0]?.split(':').slice(1)??[],model=mission.visual.model;
    if(model.kind==='line-build'||model.kind==='pie-build')return parts.length?parts.map((v,i)=>`${model.labels[i]}: ${v==='_'?'Not answered':v}${model.kind==='pie-build'?'°':''}`).join(' · '):'Not answered';
  }
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
