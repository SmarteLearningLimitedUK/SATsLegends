import {readFile,writeFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';

const root='qa-artifacts/ios-remediation';
const catalog=JSON.parse(await readFile('qa-artifacts/game-dock-clearance/catalog.json','utf8'));
const entries=[];
const exists=async p=>{try{await access(p);return true;}catch{return false;}};
for(const [folder,label] of [['final-compact','Compact phone'],['final-default','Standard phone'],['final-desktop','Desktop']]) {
  for(const game of catalog) {
    const correction=`${root}/final-corrections/${folder.replace('final-','')}/${game.key}-play.png`;
    const corrected=await exists(correction);
    const file=corrected?correction:`${root}/${folder}/${game.key}-play.png`;
    if(await exists(file))entries.push({title:game.name||game.title||game.key.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),group:label,file,detail:corrected?'Final correction after the full campaign sweep; focused bounds and interaction checks repeated.':'Seeded opening gameplay; Start, Tips, pause, focus and screen bounds checked.'});
  }
}
const stateFolders=[
  ['qa-artifacts/ios-core-responses','Assessment',n=>/^\d+-.+-after\.png$/.test(n)],
  ['qa-artifacts/ios-calm-remediation/compiled-2026-10-23','Calm activities',n=>n.startsWith('375-')&&n.endsWith('.png')],
  ['qa-artifacts/ios-instruments','Instruments',n=>n.startsWith('final-')&&n.endsWith('-667.png')],
  ['qa-artifacts/ios-scene-remediation','Scene states',n=>/^(rocket-390|zombies-667)-no-preference-(opening|half-built|launch|orbit|cast)\.png$/.test(n)],
  ['qa-artifacts/ios-working-surfaces','Working surfaces',n=>n.includes('-667-')&&/(ready|incorrect|correct|carry)\.png$/.test(n)],
  ['qa-artifacts/ios-data-touch','Data and chart states',n=>/^667-.*after\.png$/.test(n)&&!n.includes('failure')],
  ['qa-artifacts/graph-grabber-axis/compiled-tooltip-mouse','Data and chart states',n=>/^667-/.test(n)&&n.endsWith('.png')&&!n.includes('failure')],
  [`${root}/polygon-actions`,'Selections and feedback',n=>n.startsWith('667-')&&n.endsWith('.png')],
  ['qa-artifacts/ios-perimeter-edge-checks/compiled-2026-10-23','Selections and feedback',n=>n.includes('667')&&n.endsWith('.png')],
];
for(const key of ['coordinates_quest','graph_grabber','data_detective']) {
  const after=`${root}/final-corrections/compact/${key}-play.png`;
  if(!await exists(after))continue;
  for(const [file,phase]of [[`${root}/final-compact/${key}-play.png`,'Before'],[after,'After']])entries.push({title:`${phase} · ${key.replaceAll('_',' ')}`,group:'Final comparisons',file,detail:phase==='Before'?'Retained visual or touch failure from the wider sweep; superseded by the after capture.':'Compiled correction; targeted presentation and interaction checks repeated.'});
}
for(const [folder,group,include]of stateFolders) {
  if(!await exists(folder))continue;
  for(const name of (await readdir(folder)).filter(include).sort())entries.push({title:name.replace(/\.png$/,'').replaceAll('-',' '),group,file:`${folder}/${name}`,detail:'Targeted interaction or presentation state. Exact assertions are recorded in the linked QA report.'});
}
const data=entries.map(e=>({...e,file:path.relative(root,e.file).replaceAll('\\','/')}));
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SATs Legends · local iOS review</title>
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#081923;color:#f4f7f7}*{box-sizing:border-box}body{margin:0}header,main{max-width:1540px;margin:auto;padding:28px}header{border-bottom:1px solid #36505c}small{color:#efcb79;letter-spacing:.09em;text-transform:uppercase}h1{font-size:clamp(26px,4vw,44px);margin:12px 0}p{max-width:900px;line-height:1.55;color:#bfced2}a{color:#ffd77b}nav{display:flex;gap:18px;flex-wrap:wrap}button,select{font:inherit;min-height:44px;padding:8px 14px;color:#f4f7f7;background:#13313f;border:1px solid #55737f;border-radius:8px;cursor:pointer}button:focus-visible,select:focus-visible{outline:3px solid #ffd77b;outline-offset:3px}.toolbar{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:24px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:30px}.shot{margin:0}.image-open{width:100%;padding:0;background:#061018;border:1px solid #45606c;overflow:hidden}.image-open img{display:block;width:100%;height:320px;object-fit:contain}figcaption{padding:12px 0}h2{font-size:19px;margin:0 0 6px}figcaption p{font-size:14px;margin:4px 0}.meta{color:#edc97f;font-size:13px}dialog{width:98vw;max-width:1600px;border:1px solid #7b94a1;border-radius:12px;background:#081923;color:white;padding:14px}dialog::backdrop{background:#000d}.viewer-bar{display:flex;gap:12px;align-items:center;margin-bottom:14px}.viewer-bar strong{flex:1}dialog img{display:block;max-width:100%;max-height:80vh;margin:auto}.note{font-size:14px}@media(max-width:760px){header,main{padding:18px}.grid{grid-template-columns:1fr}.image-open img{height:auto;max-height:520px}.viewer-bar{flex-wrap:wrap}}
</style><header><small>Local review · 23 October 2026 · no TestFlight upload</small><h1>SATs Legends iOS presentation</h1><p>Current game screens and selected interaction states after the layout, touch, instrument and scene repairs. The existing fantasy artwork and mathematical content are preserved.</p><nav><a href="../../native/IOS_REMEDIATION_PROGRESS.md">Changes and verification</a><a href="../../native/IOS_QA_TEST_PLAN.md">Native testing still required</a><a href="../ios-aaa-audit/index.html">Historical audit baseline</a></nav><p class="note">These are compiled iOS-mode browser captures. They do not certify physical iPhone safe areas, VoiceOver, StoreKit, audio interruptions or sustained device performance. Portrait games use portrait captures; landscape games use landscape captures.</p></header><main><div class="toolbar"><label for="group">Show</label><select id="group"></select><span id="count" aria-live="polite"></span></div><div class="grid" id="grid"></div></main><dialog id="viewer"><div class="viewer-bar"><button id="previous" aria-label="Previous screenshot">←</button><strong id="caption"></strong><button id="next" aria-label="Next screenshot">→</button><button id="close">Close</button></div><img id="full" alt=""></dialog><script>
const entries=${JSON.stringify(data).replaceAll('<','\\u003c')};const groups=[...new Set(entries.map(e=>e.group))];const filter=document.querySelector('#group'),grid=document.querySelector('#grid'),dialog=document.querySelector('#viewer');let visible=[],selected=0;for(const group of [...groups,'All screenshots'])filter.add(new Option(group,group));function show(){const e=visible[selected];document.querySelector('#full').src=e.file;document.querySelector('#full').alt=e.title;document.querySelector('#caption').textContent=e.title+' · '+e.group;}function render(){visible=entries.filter(e=>filter.value==='All screenshots'||e.group===filter.value);grid.replaceChildren();document.querySelector('#count').textContent=visible.length+' screenshots';visible.forEach((e,i)=>{const fig=document.createElement('figure');fig.className='shot';const button=document.createElement('button');button.className='image-open';button.setAttribute('aria-label','Open '+e.title);const img=document.createElement('img');img.src=e.file;img.alt=e.title;img.loading='lazy';button.append(img);button.onclick=()=>{selected=i;show();dialog.showModal();};const caption=document.createElement('figcaption'),title=document.createElement('h2'),meta=document.createElement('div'),detail=document.createElement('p');title.textContent=e.title;meta.className='meta';meta.textContent=e.group;detail.textContent=e.detail;caption.append(title,meta,detail);fig.append(button,caption);grid.append(fig);});}filter.onchange=render;document.querySelector('#close').onclick=()=>dialog.close();document.querySelector('#previous').onclick=()=>{selected=(selected+visible.length-1)%visible.length;show();};document.querySelector('#next').onclick=()=>{selected=(selected+1)%visible.length;show();};dialog.onkeydown=e=>{if(e.key==='ArrowRight')document.querySelector('#next').click();if(e.key==='ArrowLeft')document.querySelector('#previous').click();};render();
</script></html>`;
await writeFile(`${root}/index.html`,html);
await writeFile(`${root}/gallery-manifest.json`,JSON.stringify(data,null,2));
console.log(`Gallery: ${entries.length} screenshots across ${new Set(entries.map(e=>e.group)).size} groups`);
