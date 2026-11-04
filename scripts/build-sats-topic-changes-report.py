"""Publish the implementation evidence for the seven SATs-only topic gaps."""
import html
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-artifacts/sats-topic-changes'
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))

def main():
    before=read('qa-artifacts/sats-topic-review/review.json')
    mapping={
      'calendar-facts':['revision-month-days','revision-year-days','revision-years-months'],
      'visual-equivalence':['revision-fraction-equivalent','revision-fraction-shade'],
      'applied-rounding':['revision-context-round'],
      'unknown-factor':['revision-unknown-scale'],
      'pictogram-construction':['revision-pictogram-build'],
      'correspondence':['revision-combinations'],
      'measure-estimation':['revision-measure-estimate'],
    }
    inventory=read('qa-artifacts/maths-curriculum-audit/current-inventory.json')
    families={q['id']:q for q in inventory['missions'][0]['arithmetic']+inventory['missions'][0]['reasoning']}
    answers=read('qa-artifacts/maths-curriculum-audit/current-answer-verification.json')
    checks=read('qa-artifacts/sats-topic-changes/content-checks.json')
    browser=read('qa-artifacts/sats-topic-changes/chromium-browser-checks.json')
    webkit=read('qa-artifacts/sats-topic-changes/webkit-browser-checks.json')
    practice=read('qa-artifacts/sats-topic-changes/practice-access.json')
    assert len(families)==202 and answers['passed'] and checks['passed']
    assert len(browser)==20 and len(webkit)==10 and len(practice)==14
    assert all(r['passed'] for r in browser+webkit+practice)
    build=(OUT/'build.log').read_text(encoding='utf-8',errors='replace')
    assert 'built in' in build and 'error during build' not in build
    route={r['key']:r['route'] for r in read('qa-artifacts/recommended-changes/screenshots/catalog.json')}
    gaps=[]
    for gap in before['findings']:
        ids=mapping[gap['id']];assert all(i in families for i in ids)
        gaps.append({'id':gap['id'],'title':gap['title'],'codes':gap['codes'],'status':'Implemented and verified',
                     'missionFamilies':ids,'islandPractice':route[families[ids[0]]['game']]})
    changed=[
      'src/systems/content/satsRevisionGapMissions.ts','src/systems/content/satsAdventure.ts','src/systems/content/satsDepthModels.ts',
      'src/components/game-ui/SatsRevisionGapVisual.tsx','src/components/game-ui/SatsRevisionGapConstruction.tsx','src/components/game-ui/sats-revision-gaps.css',
      'src/components/game-ui/SatsDepthVisual.tsx','src/components/game-ui/SatsDepthConstruction.tsx','src/components/game-ui/SatsConstructionControl.tsx',
      'src/components/game-ui/RevisionWorkshop.tsx','src/components/game-ui/satsRevisionFeedback.ts','src/components/game-ui/sats-adventure.css','src/games/BossEncounterGame.tsx',
      'docs/maths-coverage-evidence.json','scripts/verify-sats-topic-gaps.ts','scripts/verify-sats-topic-gaps-browser.mjs','scripts/verify-sats-topic-practice.mjs',
      'scripts/qa/sats_revision_gap_oracle.py','scripts/audit-maths-answers.py','scripts/export-revision-readiness.ts','scripts/build-sats-topic-changes-report.py',
      'qa-artifacts/sats-topic-changes/*','qa-artifacts/maths-curriculum-audit/current-inventory.json','qa-artifacts/maths-curriculum-audit/current-answer-verification.json']
    report={'reviewed':'2026-10-20','scope':'SATs revision only: the seven identified paper-testable facets.',
      'gaps':gaps,'newFamilies':10,'totalFamilies':202,'newGames':0,
      'access':'The new tasks appear in Core Papers 2/3 and in Help → Choose a practice question within the linked island games. Main island action loops retain their existing mechanics.',
      'checks':{'contentSeeds':1000,'coreBrowserCases':20,'webkitCases':10,'islandPracticeCases':14,'independentAnswerFields':answers['independentlyCheckedFields'],'typecheck':'passed','productionBuild':'passed (existing large-chunk advisory)'},
      'assumptions':['England KS2 SATs test content domain; rare examinable facets remain included.','Matharia is the app in the current repository.','Short revision challenges and brief corrective feedback; no concept lessons.'],
      'limitations':['Closes the seven identified content gaps; does not certify every possible SATs question variant.','Safari engine testing is WebKit automation, not a physical iPhone device test.'],
      'changedFiles':changed,'externalLegacyAssumptions':False}
    (OUT/'review.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    esc=html.escape
    rows=''.join('<tr><td>'+esc(g['title'])+'<br><small>'+esc(', '.join(g['codes']))+'</small></td><td>Implemented and verified</td><td><a href="'+g['islandPractice']+'">Open island game</a><br><small>Help → Choose a practice question</small></td></tr>' for g in gaps)
    cards=''.join('<figure><a href="'+r['file']+'"><img loading="lazy" src="'+r['file']+'" alt="'+esc(r['id']+' '+r['profile'])+'"></a><figcaption>'+esc(r['id'].removeprefix('revision-').replace('-',' ').title())+' · '+esc(r['profile'])+'</figcaption></figure>' for r in sorted(browser,key=lambda r:(r['profile'],r['id'])))
    text='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matharia · SATs topic changes</title><style>*{box-sizing:border-box}body{margin:0;background:#0b202b;color:#f2f3ec;font:16px/1.55 system-ui,sans-serif}main{max-width:1350px;padding:32px 24px 70px;margin:auto}h1{font-size:clamp(30px,4vw,46px)}h2{color:#ffda86;margin-top:36px}a{color:#a4e7e9}table{width:100%;border-collapse:collapse}td,th{border:1px solid #345460;padding:14px;text-align:left}small{color:#bad0d4}.screens{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:24px}figure{margin:0}img{display:block;width:100%;border-radius:9px}figcaption{padding-top:8px}.table{overflow:auto}code{overflow-wrap:anywhere}summary{cursor:pointer}li{margin:5px 0}</style><main><p>SATs revision update · 20 October 2026</p><h1>Seven gaps addressed</h1><p>Ten new revision question families cover the seven identified examinable facets. Each fits an existing game, so no new game was needed. The shared Core bank now contains 202 families.</p><p><strong>Where to play:</strong> Core Papers 2 and 3, or open a linked island game, choose Help and use “Choose a practice question”. The new selector makes all practice tasks directly reachable. Main island action loops retain their existing mechanics.</p><p><a href="review.json">Evidence and changed files</a> · <a href="content-checks.json">Content checks</a> · <a href="chromium-browser-checks.json">Desktop/phone checks</a> · <a href="webkit-browser-checks.json">Safari/WebKit checks</a> · <a href="practice-access.json">Island practice access</a></p><div class="table"><table><thead><tr><th>SATs facet</th><th>Status</th><th>Practice location</th></tr></thead><tbody>ROWS</tbody></table></div><h2>Verified in play</h2><p>All 10 families were exercised through real controls, answer entry, saving and marked review at desktop 1440×900 and landscape-phone 667×375. Safari/WebKit checks passed at 844×390. Pictogram controls keep one row active at a time so the phone save button stays visible.</p><p>Content checks passed for 1,000 seeds, including Core selection, marking, malformed constructions and partial pictogram credit. Independent checks passed for ANSWERS answer fields across the expanded banks. TypeScript checks and the production build passed.</p><h2>Current screenshots</h2><p>Click any image to view it at its captured size.</p><div class="screens">CARDS</div><h2>Scope</h2><p>These are revision challenges, not lessons. This closes the seven identified gaps and does not claim to certify every possible SATs question variant. WebKit testing is not a physical-device iPhone test.</p><p>Assumptions: England KS2 SATs and the app in this repository. No external legacy assumptions were used.</p><details><summary>Changed files</summary><ul>FILES</ul></details></main></html>'''
    text=text.replace('ROWS',rows).replace('CARDS',cards).replace('ANSWERS',str(answers['independentlyCheckedFields'])).replace('FILES',''.join('<li><code>'+esc(p)+'</code></li>' for p in changed))
    (OUT/'index.html').write_text(text,encoding='utf-8')
    print(json.dumps(report['checks']))

if __name__=='__main__':main()
