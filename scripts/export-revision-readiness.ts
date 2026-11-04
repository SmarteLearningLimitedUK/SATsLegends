import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { arithmeticMissions, reasoningMissions, buildSatsPaper, getRevisionMissions } from '../src/systems/content/satsAdventure';
import { LEARNER_GUIDES } from '../src/systems/content/learnerGuides';

// Measure delivery and numeric replay variety; these are not semantic coverage grades.
const out = 'qa-artifacts/revision-readiness';
mkdirSync(out, { recursive: true });
const catalog = JSON.parse(readFileSync('qa-artifacts/recommended-changes/screenshots/catalog.json', 'utf8'));
const rows = new Map<string, any>();
const seeds = 125;
for (let seed = 0; seed < seeds; seed++) {
  const missions = [...arithmeticMissions(seed), ...reasoningMissions(seed)];
  for (const q of missions) {
    if (!rows.has(q.id)) rows.set(q.id, { sample: q, variants: new Set(), explanations: new Set(), appearances: {}, responses: new Set() });
    const row = rows.get(q.id);
    row.variants.add(JSON.stringify([q.prompt, q.visual, q.fields]));
    row.explanations.add(q.explanation);
    q.fields.forEach(f => row.responses.add(f.options ? 'choice' : f.response || (f.answer.includes(':') ? 'construction/encoded answer' : 'entered answer')));
  }
  for (const key of ['crystal_core', 'mirror_gate', 'matrix_match']) {
    for (const q of buildSatsPaper(key, seed).missions) {
      const row = rows.get(q.id);
      if (!row) throw new Error(`Unknown selected family: ${q.id}`);
      row.appearances[key] = (row.appearances[key] || 0) + 1;
    }
  }
}
const families = [...rows.values()].map(row => {
  const q = row.sample;
  const route = catalog.find((r: any) => r.key === q.game);
  const guide = LEARNER_GUIDES[q.game];
  const revisionKey = guide?.revisionKey;
  return { ...q, numericVisualAnswerVariants: row.variants.size, explanationVariants: row.explanations.size,
    responseModes: [...row.responses], paperAppearances: row.appearances,
    route: route?.route || null, guideExample: guide?.example || null, revisionKey: revisionKey || null,
    inGuidedBank: Boolean(revisionKey && getRevisionMissions(revisionKey, 0).some(m => m.id === q.id)),
    guidedAccess: Boolean(route && revisionKey && getRevisionMissions(revisionKey, 0).some(m => m.id === q.id)),
  };
});
if (families.length !== 202) throw new Error(`Review family count changed: ${families.length}`);
writeFileSync(`${out}/family-delivery.json`, JSON.stringify({ generatedAt: new Date().toISOString(), seeds,
  interpretation: 'Variants combine numbers, diagrams and answer values; they do not count independent problem structures. Route access is a static catalog/guide/bank join, not a new browser run.', families }, null, 2));
console.log(JSON.stringify({ families: families.length, seeds, guided: families.filter(q => q.guidedAccess).length,
  noGuidedRoute: families.filter(q => !q.guidedAccess).map(q => q.id), selectedInCore: families.filter(q => Object.keys(q.paperAppearances).length).length }));
