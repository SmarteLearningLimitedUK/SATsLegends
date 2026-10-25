"""Publish fresh visual evidence after checking the actual painted artwork."""
import html
import json
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-artifacts/presentation-repair'
def load(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))

def main():
    current=load('qa-artifacts/presentation-repair/chromium-browser-checks.json')
    safari=load('qa-artifacts/presentation-repair/webkit-browser-checks.json')
    original=load('qa-artifacts/presentation-repair-originals/chromium-browser-checks.json')
    interactive=load('qa-artifacts/presentation-repair-interactions/chromium-browser-checks.json')
    assert len(current)==40 and len(safari)==10 and len(original)==28 and len(interactive)==8
    assert all(r['passed'] and not r['model']['issues'] for r in current+safari+original+interactive)
    assert 'built in' in (OUT/'build.log').read_text(encoding='utf-8',errors='replace')
    before=OUT/'before-fraction-shade.png'
    if not before.exists():shutil.copy2(ROOT/'qa-artifacts/sats-topic-changes/desktop/revision-fraction-shade.png',before)
    # Refresh the previously shared gallery as well, so it no longer serves the
    # superseded overflowing screenshots. Preserve the before image above.
    for row in current:
        if row['profile'] in ['desktop','phone']:
            shutil.copy2(OUT/row['file'],ROOT/'qa-artifacts/sats-topic-changes'/row['file'])
    changes=['src/components/game-ui/core-paper-presentation.css','src/components/game-ui/sats-revision-gaps.css',
      'src/components/game-ui/SatsConstructionControl.tsx','src/components/game-ui/SatsMissionVisual.tsx',
      'src/components/game-ui/SatsDepthConstruction.tsx','src/games/BossEncounterGame.tsx',
      'scripts/qa/sats-model-containment.mjs','scripts/verify-sats-topic-gaps-browser.mjs',
      'scripts/build-presentation-repair-report.py','qa-artifacts/presentation-repair/*',
      'qa-artifacts/presentation-repair-originals/*','qa-artifacts/presentation-repair-interactions/*',
      'qa-artifacts/sats-topic-changes/desktop/*.png','qa-artifacts/sats-topic-changes/phone/*.png']
    report={'reviewed':'2026-10-20','scope':'Repair containment and presentation in the recently changed Core screens; preserve the supplied rich-scene benchmark.',
      'fixes':['Shared bounded model canvas with a reserved title area','Both interactive and read-only SVGs fit the canvas without cropping their artwork',
        'Construction controls separated from diagrams for older as well as new tasks','Compact active-bar controls and readable landscape timetables',
        'Space for coordinate/chart labels inside SVG view boxes','Core palette applied to new controls; focused slider indicates focus on the thumb',
        'Redundant mock-run badge hidden on landscape phones to keep the timer clear','Previously shared screenshot gallery refreshed'],
      'checks':{'newTaskCases':len(current),'webkitCases':len(safari),'originalModelCases':len(original),'originalConstructionAnswerFlows':len(interactive),
        'viewports':['1440×900','1280×720','1920×1080','667×375','844×390 (WebKit)'],'typecheck':'passed','productionBuild':'passed'},
      'criterion':'Check painted SVG elements and HTML content against the canvas/frame, against SVG clipping edges, and against the inscription; check model/question/response zones and control overlaps.',
      'assumptions':['The attached rich-scene gallery is the visual benchmark.','Desktop full-screen website and iPhone landscape are the target layouts.','The seven SATs topic additions remain in the existing practice/Core architecture.'],
      'limits':['This repair verifies the affected Core presentation and sampled existing model types; it is not a new complete gameplay audit of every island game.','WebKit automation is not a physical iPhone test.'],
      'changedFiles':changes,'externalLegacyAssumptions':False}
    (OUT/'review.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    e=html.escape
    cards=''.join(f'<figure data-profile="{e(r["profile"])}"><a href="{e(r["file"])}"><img loading="lazy" src="{e(r["file"])}" alt="{e(r["id"])} at {e(r["profile"])}"></a><figcaption>{e(r["id"].removeprefix("revision-").replace("-"," ").title())} · {e(r["profile"])}</figcaption></figure>' for r in sorted(current,key=lambda r:(r['profile'],r['id'])))
    oldcards=''.join(f'<figure><a href="../presentation-repair-originals/{e(r["file"])}"><img loading="lazy" src="../presentation-repair-originals/{e(r["file"])}" alt="{e(r["id"])}"></a><figcaption>{e(r["id"])} · {e(r["profile"])}</figcaption></figure>' for r in original if r['profile']=='desktop')
    doc='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matharia · presentation repair</title><style>*{box-sizing:border-box}body{margin:0;background:#091e27;color:#f2f1e8;font:16px/1.55 system-ui,sans-serif}main{max-width:1420px;padding:32px 24px 70px;margin:auto}h1{font-size:clamp(30px,4vw,46px);line-height:1.15}h2{margin-top:36px;color:#ffdc91}a{color:#a5e7e6}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:24px}figure{margin:0}img{display:block;width:100%;border-radius:10px}figcaption{padding-top:8px;color:#d8e9e9}p{max-width:100ch}button{background:#123c4b;border:1px solid #8ac7ce;color:#f4f4e9;border-radius:6px;padding:10px 15px;font:inherit;cursor:pointer}button[aria-pressed=true]{border-color:#ffe1a0;background:#65532e}nav{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}code{overflow-wrap:anywhere}li{margin:6px 0}[hidden]{display:none!important}</style><main><p>Matharia · presentation repair</p><h1>Fresh screenshots against the approved look</h1><p>The rich scenery, heroes and Core materials are retained. Diagrams now have a bounded canvas with space for the frame title, and construction controls sit in the response area.</p><p><a href="review.json">Changes and verification</a> · <a href="chromium-browser-checks.json">Desktop/phone checks</a> · <a href="webkit-browser-checks.json">Safari checks</a></p><h2>The reported fraction screen</h2><div class="shots"><figure><img src="before-fraction-shade.png" alt="Before: fraction diagram paints across the frame"><figcaption>Before · diagram overflow and title collision</figcaption></figure><figure><img src="desktop/revision-fraction-shade.png" alt="After: fraction diagram contained inside the frame"><figcaption>After · diagram contained, controls aligned</figcaption></figure></div><h2 id="screenshots">Current screenshots</h2><p>Click an image to inspect the full captured resolution.</p><nav aria-label="Screenshot size">FILTERS</nav><div class="shots" id="current-shots">CARDS</div><h2>Existing screens checked for regressions</h2><div class="shots">ORIGINALS</div><h2>Verification</h2><p>40 new-task cases across desktop and landscape phone sizes, 10 Safari/WebKit cases, 28 existing model-layout checks and 8 older construction answer flows passed. Checks include artwork escaping or being clipped by its frame, title collisions, HTML content containment and control overlaps. TypeScript checks and the production build passed.</p><p>Scope: affected Core screens and existing model samples, not a new whole-game gameplay certification. WebKit testing is not a physical iPhone test.</p><p>Assumptions: the attached gallery defines the look; desktop full-screen and iPhone landscape remain the target layouts. No external legacy assumptions were used.</p><details><summary>Changed files</summary><ul>FILES</ul></details></main><script>document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{const profile=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelectorAll('#current-shots figure').forEach(f=>f.hidden=profile!=='all'&&f.dataset.profile!==profile)}));</script></html>'''
    filters=''.join(f'<button type="button" data-filter="{p}" aria-pressed="{str(p=="all").lower()}">{label}</button>' for p,label in [('all','All'),('desktop','Desktop'),('compact','1280 × 720'),('large','1920 × 1080'),('phone','Landscape phone')])
    for token,value in [('FILTERS',filters),('CARDS',cards),('ORIGINALS',oldcards),('FILES',''.join('<li><code>'+e(p)+'</code></li>' for p in changes))]:doc=doc.replace(token,value)
    (OUT/'index.html').write_text(doc,encoding='utf-8')
    print(json.dumps(report['checks']))

if __name__=='__main__':main()
