import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const output='qa-artifacts/layout-overlaps';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const rows=[];
const measure=()=>{
  const labels=[...document.querySelectorAll('[data-line-marker]>div>*')].map(n=>({text:n.textContent,rect:n.getBoundingClientRect().toJSON()}));
  const answers=[...document.querySelectorAll('[data-number-line-answer]')].map(n=>({text:n.textContent,rect:n.getBoundingClientRect().toJSON()}));
  return labels.flatMap(a=>answers.map(b=>({a:a.text,b:b.text,dx:Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left),gap:b.rect.top-a.rect.bottom}))).filter(x=>x.dx>0);
};
try{
  for(const viewport of [{width:568,height:320},{width:667,height:375}]){
    const context=await browser.newContext({viewport,hasTouch:true,reducedMotion:'no-preference'});
    await installReleaseAccountFixture(context);
    const page=await context.newPage();
    await page.goto(base+'/game/1/2',{waitUntil:'domcontentloaded'});
    await page.locator('[data-number-line-answers]').waitFor();
    for(let i=0;i<4;i++){const intro=(await page.locator('[data-dialog-primary]:visible').elementHandles())[0];if(intro)await intro.click().catch(()=>{});await page.waitForTimeout(160);}
    await page.evaluate(()=>document.fonts.ready);
    const row={...viewport,regressionDetected:false,minGap:Infinity,samples:0,passed:false};
    const broken=await page.addStyleTag({content:`#root#root [data-vision-game='number_line_ninja'] .qa-number-line{bottom:20%!important}#root#root [data-line-marker]{top:66px!important}#root#root [data-line-marker]>div{height:48px!important}#root#root [data-number-line-missing]{width:52px!important;height:52px!important;font-size:36px!important}`});
    const regression=await page.evaluate(measure);
    row.regressionDetected=regression.some(x=>x.gap<0);
    assert(row.regressionDetected,'The test must detect the original overlapping layout');
    await broken.evaluate(n=>n.remove());
    const check=async()=>{const gaps=await page.evaluate(measure);row.minGap=Math.min(row.minGap,...gaps.map(x=>x.gap));row.samples++;assert(gaps.every(x=>x.gap>=2),'Labels and answers must remain separate during animation: '+JSON.stringify(gaps));};
    await check();
    const expected=await page.evaluate(()=>{
      const labels=[...document.querySelectorAll('[data-line-marker]')].map(n=>n.textContent.trim());
      const missing=labels.findIndex(x=>x==='?');
      const known=labels.map((x,i)=>({value:Number(x),i})).filter(x=>Number.isFinite(x.value));
      const step=(known[1].value-known[0].value)/(known[1].i-known[0].i);
      return known[0].value+(missing-known[0].i)*step;
    });
    await page.locator(`[data-number-line-answer="${expected}"]`).click();
    for(let i=0;i<24;i++){await page.waitForTimeout(80);await check();}
    await page.screenshot({path:`${output}/number-line-animated-${viewport.width}.png`});
    row.passed=true;rows.push(row);console.log(JSON.stringify(row));
    await context.close();
  }
}finally{await browser.close();await writeFile(output+'/number-line-clearance.json',JSON.stringify(rows,null,2));}
