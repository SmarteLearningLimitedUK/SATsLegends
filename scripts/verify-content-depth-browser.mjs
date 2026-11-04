import {chromium,webkit,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018',out=process.env.LEGEND_DEPTH_OUTPUT||'qa-artifacts/content-depth';await mkdir(out,{recursive:true});
const selected=new Set((process.env.LEGEND_DEPTH_KEYS||'').split(',').filter(Boolean));
const engine=process.env.LEGEND_DEPTH_ENGINE||'chromium';
const browser=engine==='webkit'?await webkit.launch({executablePath:resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')}):await chromium.launch(),rows=selected.size?JSON.parse(await readFile(out+'/browser-checks.json','utf8').catch(()=>'[]')).filter(r=>!selected.has(r.id)):[];
const dismiss=async p=>{for(let i=0;i<4;i++){await p.waitForTimeout(100);const d=p.locator('[role=dialog]:visible').last();if(!await d.count())break;const b=d.locator('[data-dialog-primary]');if(!await b.count())break;const h=await d.elementHandle();await b.click();await p.waitForFunction(n=>!n.isConnected,h);}};
async function worker(profile){
 const c=await browser.newContext({viewport:profile,reducedMotion:'reduce',hasTouch:profile.width<1000});await installReleaseAccountFixture(c);const p=await c.newPage();p.setDefaultTimeout(30000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  const keys={};for(const paper of [2,3]){await p.goto(base+`/game/8/${paper}`,{waitUntil:'domcontentloaded'});await p.locator('.sats-mock').waitFor();await dismiss(p);keys[paper]=await p.evaluate(paper=>Object.keys(sessionStorage).find(k=>k.startsWith(`sats-legends-mock-checkpoint-v4:${paper===2?'mirror_gate':'matrix_match'}:`)),paper);}
  const fixtures=await p.evaluate(async()=>{const {buildSatsPaper}=await import('/src/systems/content/satsAdventure.ts');const all=new Map();for(let seed=0;seed<300;seed++)for(const paper of [2,3]){const bank=buildSatsPaper(paper===2?'mirror_gate':'matrix_match',seed);bank.missions.forEach((q,index)=>{if(q.id.startsWith('depth-')&&!all.has(q.id))all.set(q.id,{seed,paper,index,q});});}return [...all.values()];});expect(fixtures.length).toBe(53);
  await mkdir(`${out}/${profile.name}`,{recursive:true});
  for(const fixture of fixtures.filter(f=>!selected.size||selected.has(f.q.id))){const {q,paper}=fixture,row={profile:profile.name,id:q.id,paper,passed:false};
   try{
    await p.evaluate(({key,seed,index})=>sessionStorage.setItem(key,JSON.stringify({version:1,seed,index,deadline:Date.now()+2400000,answers:{},workpad:{},draft:[],draftWorkpad:''})),{key:keys[paper],...fixture});
    await p.goto(base+`/game/8/${paper}`,{waitUntil:'domcontentloaded'});await p.locator('.sats-mock').waitFor();await dismiss(p);await p.evaluate(()=>document.fonts.ready);
    const m=q.visual.model;
    if(m&&['line-build','pie-build'].includes(m.kind)){
     const target=m.kind==='line-build'?m.readings:m.counts.map(n=>n*30),step=m.kind==='line-build'?m.step:15;
     for(let i=0;i<target.length;i++){await p.locator('.sats-depth-tabs button').nth(i).click();const range=p.locator('.sats-depth-construction input');await range.focus();await range.press('Home');for(let n=0;n<target[i]/step;n++)await range.press('ArrowRight');}
    }else if(m?.kind==='rectangle-build'){
     const dims=q.fields[0].answer.split(':').slice(1).map(Number);for(let i=0;i<2;i++){const range=p.locator('.sats-depth-construction input').nth(i);await range.focus();await range.press('Home');for(let n=1;n<dims[i];n++)await range.press('ArrowRight');}
    }else if(m?.kind==='angle-draw'){
     const range=p.locator('.sats-depth-construction input');await range.focus();await range.press('End');for(let n=0;n<180-m.target;n++)await range.press('ArrowLeft');
    }else if(m?.kind==='symmetry-axes'){
     for(const i of q.fields[0].answer.split(',').map(Number))await p.locator('.sats-depth-tabs button').nth(i).click();
    }else{
     const fields=p.locator('.sats-entered-fields fieldset');let visible=0;
     for(const field of q.fields){if(field.response==='working')continue;const f=fields.nth(visible++);if(field.options)await f.getByRole('button',{name:field.answer,exact:true}).click();else await f.locator('input').fill(field.answer);}
    }
    row.layout=await p.evaluate(auditLayout);expect(row.layout.issues).toEqual([]);expect(row.layout.overflow).toBe(false);
    row.file=`${profile.name}/${q.id}.png`;await p.screenshot({path:out+'/'+row.file});
    await p.getByRole('button',{name:'Save & continue',exact:true}).click();if(await p.getByRole('dialog',{name:'Mission list',exact:true}).count())await p.getByRole('button',{name:'Back to mission',exact:true}).click();await p.getByRole('button',{name:'Finish run',exact:true}).click();await p.getByRole('button',{name:'Finish and review',exact:true}).click();await expect(p.locator(`#sats-review-${q.id} summary`)).toContainText(`${q.marks}/${q.marks}`);row.passed=true;
   }catch(e){row.error=e.message;await p.screenshot({path:`${out}/${profile.name}/${q.id}-failure.png`}).catch(()=>{});}
   rows.push(row);await writeFile(out+'/browser-checks.json',JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',profile.name,q.id,row.error||'');
  }
 }finally{await c.close();}
 expect(errors).toEqual([]);
}
const profiles=engine==='webkit'?[{name:'webkit',width:844,height:390}]:[{name:'desktop',width:1440,height:900},{name:'phone',width:667,height:375}];
try{await Promise.all(profiles.map(worker));}finally{await browser.close();}
if(rows.some(r=>!r.passed))process.exitCode=1;
