import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const {games}=JSON.parse(await readFile('qa-artifacts/aaa-game-visions/manifest.json','utf8'));
const out='qa-artifacts/vision-implementation';
const revision=Date.now();
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const cards=games.map(g=>`<article id="${g.key}"><h2>${escape(g.title)}</h2><div class="pair"><figure><img loading="lazy" decoding="async" src="../aaa-game-visions/${escape(g.image)}" alt="Approved ${escape(g.title)} concept"><figcaption>Approved concept</figcaption></figure><figure><img loading="lazy" decoding="async" data-live="${g.key}" src="live-landscape-${g.key}.png?v=${revision}" alt="Captured ${escape(g.title)} gameplay"><figcaption>Actual gameplay · <a href="${g.route}" target="_blank" rel="noopener">Play</a></figcaption></figure></div></article>`).join('');
await writeFile(out+'/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Game vision comparison</title><style>body{margin:0;background:#071622;color:#f5f1e6;font:16px system-ui}header{padding:24px;position:sticky;top:0;background:#071622f5;z-index:2;border-bottom:1px solid #385064}h1{font-size:24px;margin:0 0 8px}p{margin:8px 0;color:#bed0dc}select{padding:8px;background:#163445;color:inherit;border:1px solid #a58f58;border-radius:8px}main{max-width:1600px;margin:auto;padding:20px}article{margin-bottom:30px}h2{font-size:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;background:#0e2738;border-radius:8px;overflow:hidden}img{display:block;width:100%;height:auto}figcaption{padding:10px;color:#bed0dc}a{color:#f5ce79}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style><header><h1>Approved concepts and playable games</h1><p>Reference on the left, captured gameplay on the right. These are separate images; the gameplay capture contains the real controls and live maths.</p><label>Gameplay size <select id="profile"><option value="landscape">Phone · 667 × 375</option><option value="desktop">Desktop · 1440 × 900</option></select></label></header><main>${cards}</main><script>document.querySelector('#profile').addEventListener('change',e=>document.querySelectorAll('[data-live]').forEach(img=>img.src='live-'+e.target.value+'-'+img.dataset.live+'.png?v=${revision}'))</script></html>`);
if(process.env.LEGEND_QA_CONTACTS==='1'){
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});
 for(let offset=0;offset<games.length;offset+=9){
  const contents=games.slice(offset,offset+9).map(g=>`<figure><figcaption>${escape(g.title)}</figcaption><img src="http://127.0.0.1:3012/${out}/live-landscape-${g.key}.png"></figure>`).join('');
  await page.setContent(`<body style="margin:0;background:#101c28;color:white;font:16px system-ui;display:grid;grid-template-columns:repeat(3,1fr);gap:8px"><style>figure{margin:0}figcaption{padding:6px}img{width:100%}</style>${contents}</body>`);
  await page.locator('img').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode().catch(()=>{}))));
  await page.screenshot({path:out+`/contact-${offset/9+1}.png`,fullPage:true});
 }
 await browser.close();
}
