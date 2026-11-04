"""Current content evidence, kept separate from earlier review snapshots."""
from pathlib import Path
import html
import json
import re
import shutil

root=Path(__file__).resolve().parents[1]
out=root/'qa-artifacts/content-depth'
audit=root/'qa-artifacts/maths-curriculum-audit'
load=lambda p:json.loads(p.read_text(encoding='utf-8'))
coverage=load(audit/'coverage.json')
answers=load(audit/'current-answer-verification.json')
inventory=load(audit/'current-inventory.json')
families=[q for q in inventory['missions'][0]['reasoning'] if q['id'].startswith('depth-')]
checks=load(out/'content-checks.json')
browser=load(out/'browser-checks.json')
webkit=load(out/'webkit/browser-checks.json')
assert len(families)==53 and len(browser)==106 and len(webkit)==8
assert answers['passed'] and checks['passed'] and all(r['passed'] for r in browser+webkit)
assert all(not r['layout']['issues'] and not r['layout']['overflow'] for r in browser+webkit)
assert all(r['passed'] for r in load(out/'answer-entry/report.json'))
assert 'built in' in (out/'build.log').read_text(encoding='utf-8-sig')
for name in ['coverage.json','coverage.csv','current-answer-verification.json']:
    shutil.copyfile(audit/name,out/name)
shutil.copyfile(root/'qa-artifacts/comprehensive-qa/difficulty/content-profile.json',out/'difficulty-profile.json')
changes=[
 ('Independent reasoning','Book-order change, bottle sharing, minibus capacity and decimal-measure problems require learners to choose the operations. Supported calculations can earn method credit.'),
 ('Number and calculation','Larger-number ordering, varied rounding, negative midpoints, sparse number lines, forward/backward sequences, complete factor sets, mental strategies and reasonableness checks.'),
 ('Fractions and decimals','Order multiple fractions above and below one, count in tenths/hundredths, identify decimal digit values, round to different accuracies and multiply/divide by powers of ten.'),
 ('Measurement','Read offset rulers and measuring cylinders; compare mixed-unit lengths, masses and capacities; use supplied imperial approximations in both directions; calculate overnight durations.'),
 ('Area, perimeter and volume','Compare equal-area rectangles, choose formulae, calculate triangular areas without a supplied formula, estimate a grid area and construct a rectangle from area/perimeter givens.'),
 ('Geometry','Read both protractor scales, construct varied angles, estimate marked angles, select symmetry axes on turned shapes, identify circle parts and distinguish valid cube nets.'),
 ('Statistics','Plot a complete temperature graph, construct a pie chart from counts, interpret whole/half pictogram symbols, complete tables and explain why a zero belongs in a mean.'),
 ('Algebra','Describe sequence rules, generate terms from a position-number rule and independently list every possibility under a sum/ordering constraint.'),
]
changed=[
 'src/systems/content/satsDepthModels.ts','src/systems/content/satsDepthMissions.ts','src/systems/content/satsAdventure.ts','src/systems/content/satsResponseMarking.ts',
 'src/components/game-ui/SatsDepthVisual.tsx','src/components/game-ui/SatsDepthConstruction.tsx','src/components/game-ui/SatsMissionVisual.tsx','src/components/game-ui/SatsConstructionControl.tsx','src/components/game-ui/sats-adventure.css','src/games/BossEncounterGame.tsx',
 'docs/maths-coverage-evidence.json','docs/maths-curriculum-audit.md',
 'scripts/qa/sats_depth_oracle.py','scripts/audit-maths-answers.py','scripts/verify-sats-upgrades.ts','scripts/build-recommended-changes-report.py','scripts/verify-qa-interactions.mjs','scripts/verify-sats-answer-entry.mjs','scripts/verify-content-depth.ts','scripts/verify-content-depth-browser.mjs','scripts/build-content-depth-report.py',
]
summary={
 'reviewed':'2026-10-20','newFamilies':len(families),'totalFamilies':answers['missionFamilies'],
 'answerFieldsIndependentlyChecked':answers['independentlyCheckedFields'],'coverage':coverage['counts'],'coverageGate':'not-complete',
 'newTaskSeedsChecked':checks['seeds'],'coreAndGuidedReachable':checks['reachableInCore'],
 'browserCases':len(browser),'webkitCases':len(webkit),'allBrowserCasesPassed':True,
 'changes':[dict(area=a,result=b) for a,b in changes],'changedFiles':changed,
 'assumptions':['England KS2 mathematics SATs; the current repository framework/objective index remains the source for mappings.','Retain existing game mechanics, characters and scenery; new content is delivered through Core and guided practice.','Desktop in-site fullscreen and landscape iPhone layouts.','No backend, account-save, native-iOS or new artwork changes.','No external legacy assumptions were used.'],
 'limits':['96 objectives retain breadth, response-format or practical-method limitations. Representative practice is not full mastery or official test accreditation.','Graph construction uses supplied axes/scales; rectangle and angle construction use digital controls. Physical ruler/protractor handling and unrestricted drawing remain unverified.','Automatic method credit recognises supported arithmetic evidence, not arbitrary prose or handwritten reasoning.','Difficulty labels have not been calibrated through pupil trials. WebKit checks emulate landscape iPhone dimensions; they are not physical-device performance tests.','Core checkpoint version changed so old in-progress answers cannot be restored onto a differently selected question. Completed-run history is retained.','The existing large JavaScript chunk advisory remains in the successful production build.'],
}
(out/'review.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
(out/'families.json').write_text(json.dumps(families,indent=2),encoding='utf-8')
by_id={q['id']:q for q in families}
shots=[dict(**r,src=r['file']) for r in browser]+[dict(**r,src='webkit/'+r['file']) for r in webkit]
for shot in shots:
    q=by_id[shot['id']]
    shot.update(reference=q['reference'],domain=q['domain'],title=q['id'].removeprefix('depth-').replace('-',' ').capitalize())
    assert (out/shot['src']).exists()
payload=json.dumps([{k:r[k] for k in ['id','title','reference','domain','profile','src']} for r in shots]).replace('<','\\u003c')
old=(root/'qa-artifacts/recommended-changes/index.html').read_text(encoding='utf-8')
css=re.search(r'<style>(.*?)</style>',old,re.S).group(1)
esc=html.escape
table=''.join(f'<tr><th>{esc(a)}</th><td>{esc(b)}</td></tr>' for a,b in changes)
filelist=''.join(f'<li><code>{esc(p)}</code></li>' for p in changed)
limits=''.join(f'<li>{esc(s)}</li>' for s in summary['limits'])
assumptions=''.join(f'<li>{esc(s)}</li>' for s in summary['assumptions'])
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SATs Legends · Content depth</title><style>CSS</style><main>
<div class="eyebrow">SATs Legends / Content depth / 20 October 2026</div><h1>Broader questions.<br>More independent thinking.</h1>
<p class="lead">53 new task families expand the existing Core papers and guided practice, with complete graph construction, instrument reading and independently entered reasoning.</p>
<p><a href="#screens">Browse the new tasks</a> · <a href="coverage.csv">Objective evidence matrix</a> · <a href="review.json">Results and changed files</a> · <a href="../recommended-changes/index.html">Previous implementation review</a></p>
<div class="stats"><div><strong>53</strong><span>new task families</span></div><div><strong>192</strong><span>total mission families</span></div><div><strong>30,600</strong><span>independently checked answer fields</span></div><div><strong>114</strong><span>browser cases with screenshots</span></div></div>
<p class="notice"><strong>Coverage: 99 representative / 96 partial / 0 unmatched.</strong> Twenty-eight previously partial objective entries now have verified representative tasks. Remaining limitations stay recorded; complete curriculum depth remains unproven.</p>
<h2>What learners can now practise</h2><div class="table-wrap"><table><tbody>TABLE</tbody></table></div>
<h2>Where to find the new content</h2><p>Start a fresh <a href="/game/8/2">Core Paper 2</a> or <a href="/game/8/3">Core Paper 3</a> run. New families are sampled across replays. In the related island games, open <strong>Help → Try a SATs mission</strong> to use guided practice and its Next practice mission button. Every new family is reachable through both routes.</p>
<h2>Construction in play</h2><div class="proofs"><figure><img src="phone/depth-line-build.png" alt="Complete temperature graph on a landscape phone" loading="lazy"><figcaption>Plot every time/temperature reading against the scale.</figcaption></figure><figure><img src="phone/depth-pie-build.png" alt="Pie chart construction from category vote counts" loading="lazy"><figcaption>Calculate and construct each sector from the vote counts.</figcaption></figure><figure><img src="phone/depth-rectangle-build.png" alt="Rectangle construction from area and perimeter" loading="lazy"><figcaption>Find side lengths satisfying both givens; either orientation is accepted.</figcaption></figure><figure><img src="phone/depth-protractor-read.png" alt="Reading a dual-scale protractor" loading="lazy"><figcaption>Use the scale that starts at zero on the baseline.</figcaption></figure></div>
<h2>Verification</h2><ul><li><a href="current-answer-verification.json">Independent Python checks</a> recompute 30,600 answer fields across 192 families, including an independent 3D cube-net folding check.</li><li><a href="content-checks.json">1,000-seed property checks</a> cover all 53 new families, unordered unique sets, estimation bounds, partial plot marks, rectangle orientation, safe method evidence and reachability.</li><li><a href="browser-checks.json">106 Chromium cases</a> answer and finish every new family on desktop and compact landscape phone. All pass marking and overlap/overflow checks. <a href="webkit/browser-checks.json">Eight WebKit cases</a> also pass instrument and construction interactions.</li><li><a href="answer-entry/report.json">Six answer-pad regressions</a> check all three papers on desktop and phone: input, save, revisit and supported method credit.</li><li>600 complete-paper variants retain all nine strands, mark totals and timings. A <a href="difficulty-profile.json">3,000-paper sample</a> has no internal difficulty-order regressions; 16 of 192 families are unchanged in the sampled seeds.</li><li>TypeScript and the <a href="build.log">production build</a> pass.</li></ul>
<h2>Remaining limits</h2><ul>LIMITS</ul>
<h2 id="screens">Review every new task</h2><div class="filters"><label>Device<select id="profile"><option value="desktop">Desktop · 1440 × 900</option><option value="phone">Compact phone · 667 × 375</option><option value="webkit">WebKit · 844 × 390 · selected cases</option></select></label><label>Maths area<select id="area"><option value="">All areas</option><option value="N">Number</option><option value="C">Calculation</option><option value="F">Fractions and decimals</option><option value="A">Algebra</option><option value="M">Measurement</option><option value="G">Geometry</option><option value="S">Statistics</option></select></label><span id="count" class="count" aria-live="polite"></span></div><div class="gallery" id="gallery"></div>
<details><summary>Changed files</summary><ul>FILES</ul><p>Current evidence and screenshots are under <code>qa-artifacts/content-depth/</code>. Unrelated pre-existing checkout changes were preserved.</p></details><details><summary>Assumptions and references</summary><ul>ASSUMPTIONS</ul><p>Original questions use the scope of the <a href="https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework">STA test framework</a> and <a href="https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study">statutory maths curriculum</a>.</p></details><footer>No external legacy assumptions were used.</footer></main>
<dialog id="viewer"><header><strong id="viewer-title"></strong><a id="save" download>Save image</a><button id="close">Close</button></header><img id="full" alt=""></dialog><script>const shots=PAYLOAD,profile=document.querySelector('#profile'),area=document.querySelector('#area'),gallery=document.querySelector('#gallery'),viewer=document.querySelector('#viewer');function render(){const selected=shots.filter(s=>s.profile===profile.value&&(!area.value||s.domain===area.value));gallery.replaceChildren();document.querySelector('#count').textContent=selected.length+' tasks';for(const s of selected){const a=document.createElement('article');a.className='shot';const b=document.createElement('button'),im=document.createElement('img');im.src=s.src;im.loading='lazy';im.alt=s.title;b.append(im);b.setAttribute('aria-label','View '+s.title);b.onclick=()=>{document.querySelector('#viewer-title').textContent=s.title+' · '+s.reference;document.querySelector('#full').src=s.src;document.querySelector('#full').alt=s.title;document.querySelector('#save').href=s.src;viewer.showModal();};const h=document.createElement('h3');h.textContent=s.title;const p=document.createElement('p');p.textContent=s.reference;a.append(b,h,p);gallery.append(a);}}profile.onchange=render;area.onchange=render;document.querySelector('#close').onclick=()=>viewer.close();render();</script></html>'''
for token,value in [('CSS',css),('TABLE',table),('FILES',filelist),('LIMITS',limits),('ASSUMPTIONS',assumptions),('PAYLOAD',payload)]:page=page.replace(token,value)
(out/'index.html').write_text(page,encoding='utf-8')
print(json.dumps({k:summary[k] for k in ['newFamilies','totalFamilies','coverage','browserCases','webkitCases']}))
