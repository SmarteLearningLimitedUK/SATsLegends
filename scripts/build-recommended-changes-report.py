"""Publish the scoped fixes and their reproducible QA evidence."""
from pathlib import Path
import json
import html

root = Path(__file__).resolve().parents[1]
out = root / 'qa-artifacts/recommended-changes'
def read(path):
    return json.loads((out / path).read_text(encoding='utf-8'))

desktop = read('route-layouts/report-desktop.json')
phone = read('route-layouts/report-phone.json')
shots = read('screenshots/manifest.json')['results']
webkit = read('webkit/manifest.json')['results']
coverage = read('coverage.json')
profile = read('difficulty/content-profile.json')
changes = [
 ('layout-01','Conversion Canyon','Reset stale drag projection when reduced motion changes; preserve normal dragging. All tiers checked in both motion modes.','Implemented'),
 ('space-01','Scale Builder','Move dimensions out of the shrinking SVG, share the heading row with Hide original, and rebalance the phone columns.','Implemented'),
 ('content-01','Curriculum gaps','Add 26 task families, including all eight previously unmatched objectives. Coverage is now 71 representative / 124 partial / 0 unmatched.','Expanded; depth remains open'),
 ('content-02','Independent reasoning','Enter answers with keyboard or a phone answer pad, save calculations, accept distinct valid algebra pairs, and include a three-mark task in each reasoning paper.','Implemented with marking limits'),
 ('space-02','Phone legibility','Enlarge cargo quantities, clue names and potion labels. Widen the cargo console so batch labels fit their buttons.','Implemented'),
 ('space-03','Potion hero clearance','Raise and resize the phone companion above Brew/Reset. All four heroes checked at 667px and 844px.','Implemented'),
 ('curve-01','Multiplication Mine','Start with the 2, 5 and 10 tables; introduce two-digit, then three-digit work before four-digit multiplication and wider two-digit multipliers.','Implemented'),
 ('curve-02','Graph Grabber','Generate varied boat deliveries: direct readings, differences, totals and multi-step comparisons. Scale crate stacks with the axis so larger values stay visible.','Implemented'),
 ('curve-03','Core replay and challenge','Reduce unchanged families from 59/113 to 13/139. Balance both reasoning tails and retain the 40/35/35 mark totals and official timings.','Implemented; pupil calibration pending'),
 ('content-03','Mean Machine','Introduce fractional means and zero values at later tiers. Keep mean and missing-value tasks; broader explanation practice remains part of the partial coverage.','Expanded'),
 ('qa-01','Difficulty checks','Load the real bank and selector dependencies, update six stale assertions, and independently recompute chart answers. All 28 generator groups pass.','Implemented'),
]
changed = [
 'src/main.tsx','src/games/ConversionCanyonGame.tsx','src/games/ScaleBlueprintBoard.tsx','src/games/ScaleBuilderGame.tsx','src/games/scale-builder.css','src/games/qa-readability-fixes.css','src/games/RemainderRunGame.tsx','src/games/MultiplicationMineGame.tsx','src/games/GraphGrabberGame.tsx','src/games/MeanMachineGame.tsx','src/games/PrimePopGame.tsx','src/games/BossEncounterGame.tsx',
 'src/systems/content/shipmentQuestions.ts','src/systems/content/satsAdventure.ts','src/systems/content/satsExtendedMissions.ts','src/systems/content/satsReplayVariations.ts','src/systems/content/satsResponseMarking.ts',
 'src/components/game-ui/SatsAnswerFields.tsx','src/components/game-ui/SatsExtendedVisual.tsx','src/components/game-ui/SatsSymmetryControl.tsx','src/components/game-ui/SatsMissionVisual.tsx','src/components/game-ui/SatsConstructionControl.tsx','src/components/game-ui/SatsTapWorkpad.tsx','src/components/game-ui/RevisionWorkshop.tsx','src/components/game-ui/sats-adventure.css',
 'docs/maths-coverage-evidence.json','docs/maths-curriculum-audit.md',
 'scripts/verify-five-tier-difficulty.mjs','scripts/qa/math-question-oracles.mjs','scripts/audit-current-local-difficulty.mjs','scripts/audit-maths-difficulty.ts','scripts/verify-maths-marking.ts','scripts/verify-sats-content.ts','scripts/audit-maths-answers.py','scripts/verify-maths-paper-flow.mjs','scripts/verify-sats-upgrades.ts','scripts/verify-sats-answer-entry.mjs','scripts/verify-qa-interactions.mjs','scripts/verify-potion-hero-clearance.mjs','scripts/verify-recommended-changes-report.mjs','scripts/build-recommended-changes-report.py',
]
raw = desktop + phone
assert len(raw) == 414
assert all(not r.get('error') and not r['audit']['overflow'] for r in raw)
assert all(r['key']=='coordinates_quest' for r in raw if not r['passed'])
assert len(shots)==148 and len(webkit)==37
assert all(r['captured'] and not r['runtimeErrors'] for r in shots+webkit)
for path in ['answer-entry/report.json','interactions/report.json','potion-heroes/report.json']:
    assert all(r['passed'] for r in read(path)), path
normal = read('conversion-motion/report-focused-motion.json')
assert len(normal)==24 and all(r['passed'] for r in normal)
assert all(read('final-browser.json')[key]['passed'] for key in ['gallery','conversion'])
assert 'built in' in (out/'build.log').read_text(encoding='utf-8-sig')
summary = {
 'reviewed':'2026-10-20','scope':'Recommended changes from comprehensive-qa/review.json',
 'verdict':'Targeted fixes implemented; complete curriculum coverage and classroom difficulty calibration remain unproven.',
 'changes':[dict(id=i,title=t,change=c,status=s) for i,t,c,s in changes],
 'screenshots':185,'routeChecks':414,'rawCleanRouteChecks':sum(r['passed'] for r in raw),
 'reviewedCoordinateAnnotations':sum(not r['passed'] for r in raw),
 'coordinateAdjudication':'Axis labels and the S start annotation intersect transparent point-selection rectangles. Visible grid labels remain distinct; these are retained raw signals rather than suppressed audit failures.',
 'coverage':coverage['counts'],'coverageGate':'not-complete','answerFieldsIndependentlyChecked':22225,
 'missionFamilies':len(profile['families']),'unchangedFamilies':profile['unchangedFamilies'],
 'changedFiles':changed,
 'assumptions':['England end-of-KS2 maths SATs.','Desktop in-site fullscreen and iPhone landscape; no portrait redesign.','Retain the existing rich scenery, heroes and gameplay architecture.','QA uses isolated test accounts; backend/account persistence is outside this review.','No external legacy assumptions were used.'],
 'limits':['124 objectives still have breadth, practical-method or response-format limits. A matched task is not full curriculum certification.','Automatic method credit recognises supported arithmetic calculations and selected intermediates; it is not an official examiner or a handwritten/prose working assessor.','Difficulty levels are content bands, not pupil-tested psychometric calibration. Thirteen families remain unchanged in the 1,000-seed sample.','WebKit captures emulate a landscape viewport; physical iPhone performance and browser chrome still need device testing.','The existing build chunk-size advisory remains.'],
 'shots':[{**r,'src':'screenshots/'+r['file']} for r in shots]+[{**r,'profile':'webkit','src':'webkit/'+r['file']} for r in webkit],
}
(out/'review.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
esc=html.escape
rows=''.join(f'<tr><th>{esc(t)}</th><td>{esc(c)}</td><td>{esc(s)}</td></tr>' for _,t,c,s in changes)
files=''.join(f'<li><code>{esc(f)}</code></li>' for f in changed)
limits=''.join(f'<li>{esc(s)}</li>' for s in summary['limits'])
assumptions=''.join(f'<li>{esc(s)}</li>' for s in summary['assumptions'])
payload=json.dumps([{k:r[k] for k in ['title','key','islandName','route','profile','src']} for r in summary['shots']]).replace('<','\\u003c')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SATs Legends · Recommended changes</title>
<style>
:root{color-scheme:dark;font:16px/1.6 system-ui,sans-serif;color:#ecf6f2;background:#071c25}*{box-sizing:border-box}body{margin:0}main{max-width:1500px;margin:auto;padding:40px 28px 80px}a{color:#f6d382}a:hover{color:white}h1{font-size:clamp(36px,5vw,68px);line-height:1.08;max-width:1000px;margin:15px 0 24px}h2{font-size:28px;margin:48px 0 16px}p{max-width:950px}.eyebrow{color:#8ed9d4;text-transform:uppercase;letter-spacing:.16em;font-size:13px}.lead{font-size:21px;color:#c6dbdf}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;border-block:1px solid #36515b;padding:24px 0;margin:32px 0}.stats strong{display:block;font-size:36px;color:#ffde99}.stats span{color:#b3cbd1}.notice{border-left:3px solid #e8c16f;padding:12px 20px;background:#112d36}table{border-collapse:collapse;width:100%;text-align:left}th,td{padding:18px 12px;border-bottom:1px solid #36515b;vertical-align:top}th{width:20%;color:#ffde99}td:last-child{width:23%;color:#b2e7cf}.table-wrap{overflow:auto}.proofs,.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 24px}figure{margin:0}figure img,.shot img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#102733;border-radius:8px}figcaption{padding-top:10px;color:#b3cbd1}.filters{display:flex;gap:16px;flex-wrap:wrap;align-items:end;margin:24px 0}label{display:grid;gap:5px}input,select,button{font:inherit;color:inherit;background:#123540;border:1px solid #658992;border-radius:7px;padding:10px 14px;min-height:44px}input{min-width:250px}button{cursor:pointer}button:hover{border-color:#ffe0a3}.shot button{padding:0;border:0;background:none;width:100%}.shot h3{margin:10px 0 3px;font-size:21px}.shot p{margin:0;color:#abcbd0;font-size:14px}.shot .meta{display:flex;justify-content:space-between;gap:12px}.count{color:#a8c6cb}details{margin:24px 0;border-block:1px solid #36515b;padding:16px 0}summary{cursor:pointer;font-size:18px}code{overflow-wrap:anywhere;font-size:14px}li{margin:7px 0}dialog{width:min(97vw,1800px);max-height:97vh;border:1px solid #7198a0;border-radius:10px;background:#071c25;color:inherit;padding:16px}dialog::backdrop{background:#000c}dialog header{display:flex;align-items:center;gap:18px;padding-bottom:12px}dialog header strong{flex:1}dialog img{display:block;width:100%;max-height:82vh;object-fit:contain}footer{border-top:1px solid #36515b;margin-top:48px;padding-top:20px;color:#adcbd1}@media(max-width:750px){main{padding:24px 16px}.stats{grid-template-columns:1fr 1fr}.gallery,.proofs{grid-template-columns:1fr}th,td{padding:12px 8px}input{min-width:180px}}
</style><main>
<p class="notice"><a href="../content-depth/index.html">Latest content-depth review: 53 additional task families and the updated objective audit →</a></p><div class="eyebrow">SATs Legends / QA follow-through / 20 October 2026</div><h1>Recommended changes,<br>ready to review.</h1>
<p class="lead">Clearer phone layouts, a steadier difficulty progression and broader SATs questions. The rich scenery and original cast remain in place.</p>
<p><a href="../comprehensive-qa/index.html">Original review</a> · <a href="#screens">Latest screenshots</a> · <a href="review.json">Machine-readable results</a> · <a href="coverage.csv">195-objective evidence matrix</a></p>
<div class="stats"><div><strong>37</strong><span>game types</span></div><div><strong>185</strong><span>fresh game captures</span></div><div><strong>414</strong><span>route/layout checks</span></div><div><strong>22,225</strong><span>independently checked answer fields</span></div></div>
<p class="notice"><strong>Coverage remains an open gate.</strong> The eight unmatched objectives now have tasks. The evidence matrix records 71 representative and 124 partial objectives, with zero unmatched. This does not establish complete curriculum depth or equivalence to an official school paper.</p>
<h2>What changed</h2><div class="table-wrap"><table><thead><tr><th>Area</th><td>Result</td><td>Status</td></tr></thead><tbody>ROWS</tbody></table></div>
<h2>New response tools in play</h2><div class="proofs">
<figure><img src="answer-entry/phone-paper-3-reasoning.png" loading="lazy" alt="Three-mark reasoning question with independently entered answer"><figcaption>A three-mark reasoning task, with calculations saved on the working board.</figcaption></figure>
<figure><img src="answer-entry/phone-paper-1-pad.png" loading="lazy" alt="Landscape phone answer pad"><figcaption>The answer pad stays within the landscape phone viewport.</figcaption></figure>
<figure><img src="interactions/symmetry-phone.png" loading="lazy" alt="Interactive symmetry completion"><figcaption>Complete a reflected pattern; buttons also support keyboard operation.</figcaption></figure>
<figure><img src="potion-heroes/667-bran.png" loading="lazy" alt="Potion scene with hero clear of Brew and Reset"><figcaption>Hero clearance checked for Barratt, Bran, Mochi and Vex at both phone widths.</figcaption></figure></div>
<h2>Verification and limits</h2><ul>
<li>All 148 Chromium captures and 37 WebKit captures loaded without runtime errors. Four Chromium sizes: 1920×1080, 1366×768, 844×390 and 667×375.</li>
<li>414 route checks cover all 207 routes on desktop and compact phone. 405 are raw clean passes; the remaining nine are reviewed Coordinate Quest annotation/hit-area signals. No page overflow or route-load failures were found. <a href="route-layouts/report-phone.json">Phone raw results</a> · <a href="route-layouts/report-desktop.json">Desktop raw results</a>.</li>
<li>The retained Coordinate Quest flags concern axis/start labels inside transparent point-selection hit rectangles. The visible labels remain distinct. <a href="route-layouts/phone-coordinates_quest-32.png">Inspect the phone grid</a>. These signals have not been silently suppressed.</li>
<li>Conversion Canyon: 24 normal-motion cases across four sizes, including repeated samples; all tiers also pass the reduced-motion route sweep. Actual dragging, switching the motion preference and reduced-motion tapping pass an interaction check. <a href="conversion-motion/report-focused-motion.json">Motion evidence</a> · <a href="final-browser.json">Interaction and gallery check</a>.</li>
<li>All 28 source-generator groups pass. Further checks cover 600 paper variants, 1,000 upgraded-content seeds, 5,000 independently calculated shipment questions and a 3,000-paper difficulty sample. <a href="difficulty/generator-verification.json">Generator results</a> · <a href="content-verification.json">Content regression results</a>.</li>
<li>All three Core papers pass desktop and phone answer/save/revisit/finish flows. Six additional cases verify the answer pad and method credit. Symmetry, visible crate stacks and pending Prime Pop callback cancellation also pass. <a href="answer-entry/report.json">Answer-entry results</a> · <a href="interactions/report.json">Interaction results</a>.</li>
<li>TypeScript and production build pass. The existing large-chunk advisory remains. <a href="build.log">Build log</a>.</li></ul><ul>LIMITS</ul>
<h2 id="screens">Latest game screens</h2><p>Choose a device profile, then open any image at full size. The captures show the highest current tier for each game type; the route checks above include every tier and practice route.</p>
<div class="filters"><label>Device<select id="profile"><option value="desktop">Desktop · 1920 × 1080</option><option value="laptop">Laptop · 1366 × 768</option><option value="phone">Phone · 844 × 390</option><option value="small-phone">Compact phone · 667 × 375</option><option value="webkit">iPhone viewport · WebKit · 844 × 390</option></select></label><label>Find a game<input id="search" type="search" placeholder="Game or island name"></label><span class="count" id="count" aria-live="polite"></span></div><div class="gallery" id="gallery"></div>
<details><summary>Changed files in this implementation</summary><ul>FILES</ul><p>Generated evidence is under <code>qa-artifacts/recommended-changes/</code>; existing review snapshots were retained. Other pre-existing checkout changes were preserved.</p></details>
<details><summary>Assumptions and official references</summary><ul>ASSUMPTIONS</ul><p><a href="https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework">STA test framework</a> · <a href="https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study">Statutory curriculum</a> · <a href="https://www.gov.uk/government/publications/key-stage-2-tests-2026-mathematics-test-materials">2026 papers and mark schemes</a></p></details>
<footer>No external legacy assumptions were used.</footer></main>
<dialog id="viewer"><header><strong id="viewer-title"></strong><a id="save" download>Save image</a><button id="close">Close</button></header><img id="full" alt=""></dialog>
<script>const shots=PAYLOAD;const gallery=document.querySelector('#gallery'),profile=document.querySelector('#profile'),search=document.querySelector('#search'),viewer=document.querySelector('#viewer');
function render(){const rows=shots.filter(s=>s.profile===profile.value&&(s.title+' '+s.islandName).toLowerCase().includes(search.value.toLowerCase()));gallery.replaceChildren();document.querySelector('#count').textContent=rows.length+' games';for(const s of rows){const article=document.createElement('article');article.className='shot';const button=document.createElement('button'),img=document.createElement('img');img.src=s.src;img.alt=s.title+' — '+profile.options[profile.selectedIndex].text;img.loading='lazy';button.append(img);button.setAttribute('aria-label','View '+s.title);button.onclick=()=>{document.querySelector('#viewer-title').textContent=s.title+' · '+profile.options[profile.selectedIndex].text;document.querySelector('#full').src=s.src;document.querySelector('#full').alt=img.alt;document.querySelector('#save').href=s.src;viewer.showModal();};const title=document.createElement('h3');title.textContent=s.title;const meta=document.createElement('div');meta.className='meta';const island=document.createElement('p');island.textContent=s.islandName;const a=document.createElement('a');a.href=s.route;a.textContent='Play game ↗';meta.append(island,a);article.append(button,title,meta);gallery.append(article);}}
profile.onchange=render;search.oninput=render;document.querySelector('#close').onclick=()=>viewer.close();render();</script></html>'''
for token,value in [('ROWS',rows),('FILES',files),('LIMITS',limits),('ASSUMPTIONS',assumptions),('PAYLOAD',payload)]:
    page=page.replace(token,value)
(out/'index.html').write_text(page,encoding='utf-8')
print(json.dumps({"screenshots":185,"routes":len(raw),"rawClean":summary['rawCleanRouteChecks'],"coverage":coverage['counts']}))
