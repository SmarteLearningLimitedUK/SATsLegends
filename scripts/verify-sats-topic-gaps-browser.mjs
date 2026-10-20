import {chromium,webkit,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
import {auditSatsModelContainment} from './qa/sats-model-containment.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out=process.env.LEGEND_GAPS_OUTPUT||'qa-artifacts/sats-topic-changes',base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018';
const engine=process.env.LEGEND_GAPS_ENGINE||'chromium';
await mkdir(out,{recursive:true});
const browser=engine==='webkit'?await webkit.launch({executablePath:resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')}):await chromium.launch();
const combinationsOnly=process.env.LEGEND_GAPS_COMBINATION_VARIANTS==='1';
const selected=new Set((process.env.LEGEND_GAPS_KEYS||'').split(',').filter(Boolean));
const reviewIds=(process.env.LEGEND_GAPS_REVIEW_IDS||'').split(',').filter(Boolean),layoutOnly=process.env.LEGEND_GAPS_LAYOUT_ONLY==='1';
const profileNames=(process.env.LEGEND_GAPS_PROFILES||'desktop,phone').split(',');
const rows=JSON.parse(await readFile(`${out}/${engine}-browser-checks.json`,'utf8').catch(()=>'[]')).filter(row=>!(engine==='webkit'||profileNames.includes(row.profile))||selected.size&&!selected.has(row.id));
async function dismiss(page){for(let i=0;i<4;i++){await page.waitForTimeout(100);const dialog=page.locator('[role=dialog]:visible').last();const button=dialog.locator('[data-dialog-primary]');if(!await button.count())break;const node=await dialog.elementHandle();try{await button.click({timeout:3000});}catch(error){if(await button.count())throw error;}if(node)await page.waitForFunction(n=>!n.isConnected,node).catch(()=>{});}}
async function worker(profile){
 const context=await browser.newContext({viewport:profile,reducedMotion:'reduce',hasTouch:profile.width<1000});await installReleaseAccountFixture(context);
 const page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const keys={};for(const paper of reviewIds.length?[1,2,3]:[2,3]){await page.goto(base+`/game/8/${paper}`,{waitUntil:'domcontentloaded'});await page.locator('.sats-mock').waitFor();await dismiss(page);keys[paper]=await page.evaluate(paper=>Object.keys(sessionStorage).find(k=>k.startsWith(`sats-legends-mock-checkpoint-v4:${paper===1?'crystal_core':paper===2?'mirror_gate':'matrix_match'}:`)),paper);}
  const fixtures=await page.evaluate(async ({reviewIds,combinationsOnly})=>{const {buildSatsPaper}=await import('/src/systems/content/satsAdventure.ts');const found=new Map();for(let seed=0;seed<1000&&found.size<(combinationsOnly?3:reviewIds.length||10);seed++)for(const paper of reviewIds.length?[1,2,3]:[2,3])buildSatsPaper(paper===1?'crystal_core':paper===2?'mirror_gate':'matrix_match',seed).missions.forEach((q,index)=>{const key=combinationsOnly?q.id+'-'+q.visual.model?.groups?.[0]?.label:q.id;if((combinationsOnly?q.id==='revision-combinations':reviewIds.length?reviewIds.includes(q.id):q.id.startsWith('revision-'))&&!found.has(key))found.set(key,{q,seed,index,paper});});return [...found.values()];},{reviewIds,combinationsOnly});
  expect(fixtures).toHaveLength(combinationsOnly?3:reviewIds.length||10);await mkdir(`${out}/${profile.name}`,{recursive:true});
  for(const fixture of fixtures.filter(f=>!selected.size||selected.has(f.q.id))){const {q,paper}=fixture,screenshotId=combinationsOnly?q.id+'-'+q.visual.model.groups[0].label.toLowerCase().replaceAll(' ','-'):q.id,row={profile:profile.name,id:q.id,passed:false};
   try{
    await page.evaluate(({key,seed,index})=>sessionStorage.setItem(key,JSON.stringify({version:1,seed,index,deadline:Date.now()+2400000,answers:{},workpad:{},draft:[],draftWorkpad:''})),{key:keys[paper],...fixture});
    await page.goto(base+`/game/8/${paper}`,{waitUntil:'domcontentloaded'});await page.locator('.sats-mock').waitFor({timeout:30000});await expect(page.locator('.sats-mock')).toHaveAttribute('data-sats-mission',q.id);await dismiss(page);
    const model=q.visual.model;
    if(layoutOnly){row.layout=await page.evaluate(auditLayout);expect(row.layout.issues).toEqual([]);expect(row.layout.overflow).toBe(false);row.model=await page.evaluate(auditSatsModelContainment);expect(row.model.issues).toEqual([]);row.file=`${profile.name}/${screenshotId}.png`;await page.screenshot({path:`${out}/${row.file}`});row.passed=true;rows.push(row);console.log('PASS',profile.name,q.id);continue;}
    if(q.id==='draw-rectangle'){
      for(let i=0;i<2;i++)await page.getByRole('button',{name:'Increase long side',exact:true}).click();
    }else if(q.id==='draw-angle'){
      for(let i=0;i<4;i++)await page.getByRole('button',{name:'Increase angle by five degrees',exact:true}).click();
    }else if(q.id==='construct-graph'){
      for(const [name,steps] of [['Red',2],['Blue',3],['Green',1]]){await page.getByRole('button',{name:`Choose ${name} bar`,exact:true}).click();for(let i=0;i<steps;i++)await page.getByRole('button',{name:`Increase ${name} bar by five`,exact:true}).click();}
    }else if(q.id==='ext-symmetry'){
      for(const pair of q.fields[0].answer.split(';')){const [x,y]=pair.split(',').map(Number);await page.getByRole('button',{name:`Column ${x+1}, row ${y+1}`,exact:true}).click();}
    }else if(q.id==='revision-fraction-shade'){
      const range=page.getByRole('slider',{name:'Shaded squares'});await range.focus();await range.press('Home');for(let i=0;i<Number(q.fields[0].answer.split(':')[1]);i++)await range.press('ArrowRight');
    }else if(model?.kind==='pictogram-build'){
      const halves=q.fields[0].answer.split(':').slice(1).map(Number);
      for(let i=0;i<halves.length;i++){await page.getByRole('button',{name:`Choose ${model.labels[i]} row`,exact:true}).click();for(let j=0;j<halves[i];j++)await page.getByRole('button',{name:`Add half symbol for ${model.labels[i]}`,exact:true}).click();}
    }else{
      for(const field of q.fields){
        if(field.options)await page.getByRole('button',{name:field.answer,exact:true}).click();
        else{
          await page.getByRole('button',{name:`Open answer pad for ${field.label}`,exact:true}).click();const pad=page.getByRole('dialog',{name:`Answer pad: ${field.label}`,exact:true});
          for(const char of field.answer)await pad.getByRole('button',{name:char,exact:true}).click();await pad.getByRole('button',{name:'Done',exact:true}).click();
        }
      }
    }
    row.layout=await page.evaluate(auditLayout);expect(row.layout.issues).toEqual([]);expect(row.layout.overflow).toBe(false);
    row.model=await page.evaluate(auditSatsModelContainment);expect(row.model.issues).toEqual([]);
    if(q.id==='revision-pictogram-build') {const save=await page.getByRole('button',{name:'Save & continue',exact:true}).boundingBox();expect(save.y+save.height).toBeLessThanOrEqual(profile.height-40);}
    row.file=`${profile.name}/${screenshotId}.png`;await page.screenshot({path:`${out}/${row.file}`});
    await page.getByRole('button',{name:'Save & continue',exact:true}).click();if(await page.getByRole('dialog',{name:'Mission list',exact:true}).count())await page.getByRole('button',{name:'Back to mission',exact:true}).click();
    await page.getByRole('button',{name:'Finish run',exact:true}).click();await page.getByRole('button',{name:'Finish and review',exact:true}).click();await expect(page.locator(`#sats-review-${q.id} summary`)).toContainText(`${q.marks}/${q.marks}`);
    row.passed=true;
   }catch(error){row.error=error.message;await page.screenshot({path:`${out}/${profile.name}/${q.id}-failure.png`}).catch(()=>{});}
   rows.push(row);console.log(row.passed?'PASS':'FAIL',profile.name,q.id,row.error||'');
  }
  expect(errors).toEqual([]);
 }finally{await context.close();}
}
const profiles=[{name:'desktop',width:1440,height:900},{name:'phone',width:667,height:375},{name:'compact',width:1280,height:720},{name:'large',width:1920,height:1080},{name:'iphone',width:844,height:390}];
try{await Promise.all((engine==='webkit'?[{name:'webkit',width:844,height:390}]:profiles.filter(p=>profileNames.includes(p.name))).map(worker));}finally{await browser.close();}
await writeFile(`${out}/${engine}-browser-checks.json`,JSON.stringify(rows,null,2));
if(rows.some(row=>!row.passed))process.exitCode=1;
