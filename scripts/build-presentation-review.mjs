import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out='qa-artifacts/deployment-presentation';
const source=await readFile('qa-artifacts/approved-concept-look/index.html','utf8');
for(const engine of ['chromium','webkit']){
 const root=engine==='webkit'?out+'/webkit':out; const m=JSON.parse(await readFile(root+'/manifest.json','utf8'));
 let html=source.replace('Approved concept look — current gameplay',`Presentation QA · ${engine==='webkit'?'WebKit landscape':'Desktop and landscape'}`);
 const p=html.indexOf('<p>Fresh captures'),end=html.indexOf('</p>',p)+4;
 html=html.slice(0,p)+`<p>37 game types reviewed for actor scale, grounded placement, screen use and motion. ${m.results.length} current ${engine} captures. The high-resolution concept art is retained.</p>`+html.slice(end);
 html=html.replace('<nav><a href="../concept-cast/index.html">Approved reference gallery</a></nav>',`<nav><a href="${engine==='webkit'?'../':''}report.md">Findings, changes and release limits</a><a href="${engine==='webkit'?'../index.html':'webkit/index.html'}">${engine==='webkit'?'Chromium desktop and phone':'WebKit landscape phones'}</a><a href="${engine==='webkit'?'../':''}quality-summary.json">Measured checks</a></nav>`);
 const profiles=html.indexOf('profiles=['),profilesEnd=html.indexOf('];let profile=',profiles);
 html=html.slice(0,profiles)+'profiles='+JSON.stringify(m.profiles)+html.slice(profilesEnd+1);
 if(engine==='webkit')html=html.replace("let profile='desktop'","let profile='phone'");
 html=html.replace('<main></main>',`<section style="padding:20px 4vw;border-bottom:1px solid #365563"><h2>Changes made</h2><p>Larger arena combatants and graph helpers · grounded podium feet and contact shadows · seated banquet guests · contained forge controls · a more legible multiplication workspace · layered light, haze and water highlights.</p><p>Use the viewport buttons below to inspect every game. Captures cover one representative level per game type. Browser checks do not certify physical iPhone performance or every question/state.</p></section><main></main>`);
 await writeFile(root+'/index.html',html);
}
console.log('Presentation galleries written');
