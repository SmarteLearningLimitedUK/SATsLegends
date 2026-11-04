import {readFile,mkdir,writeFile} from 'node:fs/promises';
const out='qa-artifacts/matharia-review';await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/current-game-screenshots/catalog.json','utf8'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profiles=[667,844,768,1024];
let selected=[];
try{selected=JSON.parse(await readFile('qa-artifacts/matharia-visual-final/verification-chromium.json','utf8'));}catch{}
const images=catalog.flatMap(game=>profiles.map(width=>{
 const updated=selected.find(row=>row.key===game.key&&row.width===width&&row.passed);
 const folder=updated?'matharia-visual-final':'matharia-release';
 const file=updated?.file||`${game.key}-chromium-${width}.png`;
 return `<figure data-width="${width}"><a href="../${folder}/${file}" target="_blank"><img loading="lazy" src="../${folder}/${file}" alt="${escape(game.title)} at ${width} pixels"/></a><figcaption>${escape(game.title)} · ${width}px</figcaption></figure>`;
})).join('');
await writeFile(`${out}/index.html`,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matharia review</title><style>
*{box-sizing:border-box}body{margin:0;background:#03172e;color:#fff3cd;font:16px/1.5 system-ui,sans-serif}header{padding:32px clamp(20px,5vw,80px);border-bottom:1px solid #c39438}h1{font:700 38px Georgia,serif;margin:0}p{max-width:80ch;color:#bdd7e9}main{padding:24px clamp(20px,5vw,80px)}select{background:#072c51;color:#fff3cd;border:1px solid #ffd45e;border-radius:8px;padding:10px;font:inherit}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:24px}figure{margin:0;background:#072c51;padding:8px;border-radius:12px}img{display:block;width:100%;height:auto}figcaption{padding:8px}a{color:#ffd45e}.map img{max-height:600px;object-fit:contain}figure[hidden]{display:none}</style></head><body>
<header><h1>Matharia</h1><p>Separate iOS presentation using the current SATs Legends learning engine. Click any capture to inspect it at full resolution. Screenshots are browser viewport checks, not physical-device certification.</p><label>Viewport <select id="width"><option value="844">iPhone · 844 × 390</option><option value="667">Compact iPhone · 667 × 375</option><option value="768">iPad · 768 × 1024</option><option value="1024">iPad · 1024 × 768</option></select></label></header>
<main><h2>Vertical world map</h2><section><figure class="map"><a href="../matharia-release/map-chromium-390.png"><img src="../matharia-release/map-chromium-390.png" alt="Matharia vertical map on iPhone"/></a><figcaption>One island page at a time · 390 × 844</figcaption></figure></section><h2>All 37 activities</h2><section>${images}</section></main>
<script>const select=document.querySelector('select');function update(){document.querySelectorAll('[data-width]').forEach(n=>n.hidden=n.dataset.width!==select.value)}select.addEventListener('change',update);update();</script></body></html>`);
console.log(`${out}/index.html`);
