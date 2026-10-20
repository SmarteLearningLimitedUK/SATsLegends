import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out=process.env.LEGEND_REVIEW_OUTPUT||'qa-artifacts/whole-game-review',base='http://127.0.0.1:3012';await mkdir(out,{recursive:true});
const profiles=[{name:'desktop',width:1187,height:884},{name:'portrait-phone',width:390,height:844}];
const routes=[['play','/play'],['world-map','/map'],...Array.from({length:8},(_,i)=>[`island-${i+1}`,`/island/${i+1}`]),['heroes','/avatar'],['shop','/shop'],['achievements','/achievements'],['profile','/profile'],['settings','/settings'],['progress','/results'],['wellbeing','/wellbeing']];
const catalog=JSON.parse(await readFile('qa-artifacts/current-game-screenshots/catalog.json','utf8'));
const jobs=profiles.flatMap(profile=>routes.map(([key,route])=>({kind:'navigation',key,route,profile})))
 .concat(Array.from({length:8},(_,i)=>catalog.find(g=>g.island===i+1)).flatMap(game=>['victory','gameover'].flatMap(outcome=>[{name:'desktop',width:1187,height:884},{name:'phone',width:844,height:390}].map(profile=>({kind:'result-preview',key:`${game.key}-${outcome}`,route:`/qa-artifacts/level-result-themes/index.html?game=${game.key}&outcome=${outcome}`,profile,title:game.title,island:game.island,outcome})))));
const browser=await chromium.launch(),results=[];
if(process.env.LEGEND_REVIEW_KIND){
 const kind=process.env.LEGEND_REVIEW_KIND;
 const previous=JSON.parse(await readFile(`${out}/supplemental-manifest.json`,'utf8'));
 results.push(...previous.results.filter(row=>row.kind!==kind));
 for(let index=jobs.length-1;index>=0;index--)if(jobs[index].kind!==kind)jobs.splice(index,1);
}
async function worker(){while(jobs.length){const job=jobs.shift(),context=await browser.newContext({viewport:job.profile,reducedMotion:'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'Screenshot reviewer'}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const row={...job,captured:false};
 try{
  if(job.kind==='navigation'){
   await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
   await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},job.route);
   await page.waitForTimeout(500);
  }else{await page.goto(base+job.route);await page.getByRole('dialog',{name:'Mission results'}).waitFor();}
  await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(n=>n.complete),null,{timeout:12000});await page.waitForTimeout(300);
  row.state=await page.evaluate(()=>({screen:document.querySelector('[data-qa-screen]')?.getAttribute('data-qa-screen'),actualPath:location.pathname,bodyText:document.body.innerText.slice(0,500),overflow:document.documentElement.scrollWidth>innerWidth+1,dialogs:[...document.querySelectorAll('[role="dialog"]')].filter(n=>n.checkVisibility()).map(n=>n.getAttribute('aria-label')||n.innerText.slice(0,70))}));
  const folder=`${out}/${job.kind}/${job.profile.name}`;await mkdir(folder,{recursive:true});row.file=`${job.kind}/${job.profile.name}/${job.key}.png`;await page.screenshot({path:`${out}/${row.file}`});row.captured=true;row.capturedAt=new Date().toISOString();console.log('CAPTURED',job.kind,job.profile.name,job.key);
 }catch(e){row.error=e.message;console.log('FAILED',job.kind,job.key,e.message);}
 finally{row.runtimeErrors=errors;results.push(row);await context.close();await writeFile(`${out}/supplemental-manifest.json`,JSON.stringify({results},null,2));}
}}
try{await Promise.all([worker(),worker()]);}finally{await browser.close();}
console.log(JSON.stringify({screens:results.length,captured:results.filter(r=>r.captured).length}));
