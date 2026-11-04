import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_REVIEW_URL||'http://127.0.0.1:4188';
const out='qa-artifacts/website-refinement-2026-10-28/grounding-checks';await mkdir(out,{recursive:true});
const inventory=JSON.parse(await readFile('docs/website-refinement/review-inventory.json','utf8'));
const routes=inventory.games.find(g=>g.key==='place_value_panic').routes;
const b=await chromium.launch(),rows=[];
try{for(const profile of [{name:'desktop',width:1440,height:900},{name:'short-desktop',width:1280,height:720},{name:'phone-preservation',width:390,height:844}]){
 const selected=profile.name==='phone-preservation'?routes.filter(r=>r.tier===1):routes;
 for(const route of selected){const c=await b.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:'reduce'});await installReleaseAccountFixture(c);const p=await c.newPage();const row={profile:profile.name,tier:route.tier,route:route.route};try{
 await p.goto(base+route.route,{waitUntil:'domcontentloaded'});await p.locator('[data-pvp-reviewed-scene]').waitFor({timeout:45000});for(let i=0;i<6;i++){await p.waitForTimeout(120);const n=await p.$('[data-dialog-primary]');if(!n)break;await n.click();}
 await p.waitForFunction(()=>document.querySelector('[data-vision-character="rhino"][data-vision-ready="true"]'));await p.waitForTimeout(250);
 row.geometry=await p.evaluate(()=>{const actor=document.querySelector('[data-vision-character="rhino"]'),ledge=document.querySelector('[data-pvp-ground-ledge]'),a=actor.getBoundingClientRect(),l=ledge.getBoundingClientRect(),targets=[...document.querySelectorAll('[data-pvp-location="target"]')],sources=[...document.querySelectorAll('[data-pvp-location="source"]')];return{actor:a.toJSON(),ledge:l.toJSON(),foot:a.top+a.height*.95,surface:l.top+l.height*.11,ledgeVisible:ledge.checkVisibility(),sceneSource:document.querySelector('[data-vision-environment]').currentSrc,ledgeSource:ledge.querySelector('image').getAttribute('href'),targetHits:targets.every(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return n===hit||n.contains(hit)}),sourceHits:sources.every(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return n===hit||n.contains(hit)}),overflow:document.documentElement.scrollWidth>innerWidth+1};});
 if(profile.name!=='phone-preservation'){assert(row.geometry.ledgeVisible);assert(Math.abs(row.geometry.foot-row.geometry.surface)<1,'Feet and foreground ledge must share one ground plane');assert.notEqual(row.geometry.sceneSource,row.geometry.ledgeSource);assert(row.geometry.targetHits,'All slots remain reachable');assert(row.geometry.sourceHits,'All digits remain reachable');}
 else assert(!row.geometry.ledgeVisible,'Desktop revision does not add a ledge to the existing portrait layout');
 assert(!row.geometry.overflow);row.passed=true;console.log('PASS',profile.name,route.tier);await p.screenshot({path:`${out}/${profile.name}-${route.tier}.png`});
 }catch(e){row.passed=false;row.error=e.message;console.log('FAIL',profile.name,route.tier,e.message);}finally{rows.push(row);await c.close();await writeFile(out+'/report.json',JSON.stringify(rows,null,2));}
 }}}finally{await b.close();}assert(rows.every(r=>r.passed),'Grounding/reachability check failed; see report');
