import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit, expect } from '@playwright/test';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';
import { clockRoman, clockLabels, clockQuestion } from '../src/games/chronoDashQuestions';

function decode(roman: string) {
  const values: Record<string, number> = {I:1,V:5,X:10,L:50};
  return [...roman].reduce((sum, symbol, i) => sum + (values[symbol] < (values[roman[i+1]] || 0) ? -values[symbol] : values[symbol]), 0);
}
assert.deepEqual(clockLabels('roman'), ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI']);
assert.equal(clockRoman(49), 'XLIX');
assert.throws(() => clockRoman(0));
for (let hours=1;hours<=12;hours++) for(let minutes=0;minutes<60;minutes++) {
  const text=clockQuestion({hours,minutes},'roman');
  const symbols=text.match(/\b[IVXL]+\b/g)!;
  assert.equal(decode(symbols[0]),hours);
  if(minutes===0)assert.ok(text.includes('o’clock'));
  else assert.equal(decode(symbols[1]),minutes);
}
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/chrono-roman'; await mkdir(out,{recursive:true});
const rows:any[]=[];
const profiles=[{name:'desktop',width:1440,height:900},{name:'phone',width:667,height:375},{name:'iphone-webkit',width:844,height:390}];
for(const profile of profiles){
  const browser=profile.name==='iphone-webkit' ? await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}) : await chromium.launch();
  try { for(const tier of [1,5]) {
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.width<1000,reducedMotion:'reduce'});
    await installReleaseAccountFixture(context);
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    try {
      await page.goto(`http://127.0.0.1:3018/game/6/${tier===1?5:9}`,{waitUntil:'domcontentloaded'});
      await page.locator('[data-chrono-game]').waitFor();
      for(let i=0;i<5;i++) {await page.waitForTimeout(120);const intro=page.locator('[data-dialog-primary]:visible').first();const button=await intro.count()?await intro.elementHandle():null;if(button)try{await button.click({timeout:3000});}catch(error){if(await button.isVisible().catch(()=>false))throw error;}}
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>[...document.querySelectorAll('.vision-companion--stage [data-vision-character]')].every((n:any)=>n.dataset.visionReady==='true'));
      const modes=new Set<string>();
      for(let round=0;round<4;round++) {
        const game=page.locator('[data-chrono-game]'),face=page.locator('[data-clock-face]');
        const target=(await game.getAttribute('data-clock-target'))!;
        const [hour,minute]=target.split(':').map(Number);
        const format=await game.getAttribute('data-clock-question-format');
        const numerals=await face.getAttribute('data-clock-numerals');
        const mode=`${numerals}-${format}`;modes.add(mode);
        const question=page.locator('[data-game-question]');
        const copy=await question.innerText();
        if(format==='roman') {
          const symbols=copy.match(/\b[IVXL]+\b/g)!;assert.equal(decode(symbols[0]),hour);
          if(minute)assert.equal(decode(symbols[1]),minute);else assert.ok(copy.includes('o’clock'));
        } else assert.ok(copy.includes(target));
        const labels=await face.locator('svg text').allTextContents();assert.equal(labels.length,12);
        if(numerals==='roman')assert.deepEqual(labels,['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI']);
        else assert.deepEqual(labels,['12','1','2','3','4','5','6','7','8','9','10','11']);
        const labelIssues=await face.locator('svg[role=img]').evaluate(svg=>{
          const rects=[...svg.querySelectorAll('text')].map(n=>n.getBoundingClientRect());
          const bounds=svg.getBoundingClientRect();
          return rects.some((a,i)=>a.left<bounds.left||a.right>bounds.right||a.top<bounds.top||a.bottom>bounds.bottom||rects.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));
        });assert.equal(labelIssues,false);
        const audit=await page.evaluate(auditLayout,{});expect(audit.issues).toEqual([]);assert.equal(audit.overflow,false);
        assert.equal(await question.evaluate(n=>n.scrollHeight>n.clientHeight+2),false);
        const file=`${profile.name}-tier${tier}-${mode}.png`;await page.screenshot({path:`${out}/${file}`});
        // An incorrect attempt must retain both the target and its notation.
        if(round===0) {await page.getByRole('button',{name:'Increase hour',exact:true}).click();
        if(target==='01:00')await page.getByRole('button',{name:'Increase hour',exact:true}).click();
        await page.getByRole('button',{name:'RESTORE TIME',exact:true}).click();
        await expect(page.getByRole('status').filter({hasText:'Still out of sync'})).toBeVisible();
        assert.equal(await game.getAttribute('data-clock-target'),target);
        assert.equal(await game.getAttribute('data-clock-question-format'),format);}
        const [currentHour,currentMinute]=(await face.getAttribute('data-clock-current'))!.split(':').map(Number);
        let hourSteps=(hour-currentHour+12)%12;
        const hourButton=hourSteps>6?'Decrease hour':'Increase hour';if(hourSteps>6)hourSteps=12-hourSteps;
        for(let i=0;i<hourSteps;i++)await page.getByRole('button',{name:hourButton,exact:true}).click();
        let minuteSteps=(minute-currentMinute+60)%60;
        const minuteButton=minuteSteps>30?'Decrease minutes':'Increase minutes';if(minuteSteps>30)minuteSteps=60-minuteSteps;
        const step=tier===5?1:5;
        for(let i=0;i<minuteSteps/step;i++)await page.getByRole('button',{name:minuteButton,exact:true}).click();
        assert.equal(await face.getAttribute('data-clock-current'),target);
        await page.getByRole('button',{name:'RESTORE TIME',exact:true}).click();
        await page.waitForFunction(previous=>{
          const g=document.querySelector('[data-chrono-game]');const f=document.querySelector('[data-clock-face]');
          return `${f?.getAttribute('data-clock-numerals')}-${g?.getAttribute('data-clock-question-format')}`!==previous;
        },mode);
        rows.push({profile:profile.name,tier,mode,target,file,passed:true});console.log('PASS',profile.name,tier,mode,target);
      }
      assert.equal(modes.size,4);assert.deepEqual(errors,[]);
      await page.getByRole('button',{name:'RESET TIMEKEEPER'}).click();
      assert.equal(await page.locator('[data-clock-face]').getAttribute('data-clock-current'),'12:00');
    } finally {await context.close();}
  }} finally {await browser.close();}
}
await writeFile(`${out}/checks.json`,JSON.stringify(rows,null,2));
await writeFile(`${out}/index.html`,`<!doctype html><meta name="viewport" content="width=device-width"><title>Chrono Dash · Roman numerals</title><style>body{background:#081e28;color:#edf8f5;font:17px system-ui;margin:30px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px}img{width:100%;border-radius:12px}a{color:#ffdb85}h2{font-size:17px}</style><h1>Chrono Dash · Roman numerals</h1><p>Four rotating combinations: standard or Roman clock faces, with standard or Roman questions. 24 played rounds passed across desktop, landscape phone and Windows WebKit, at the first and highest time tiers. Every round was checked for correct-answer progression, numeral clearance and layout overlap. Six additional incorrect-answer checks confirmed that the target and question notation stay unchanged. All 720 hour/minute combinations passed Roman question conversion checks.</p><p>Assumption: mix these formats in normal play, preserving time difficulty and controls. Windows WebKit is a browser check, not a physical iPhone test.</p><p>Changed source: src/games/ChronoDashGame.tsx and src/games/chronoDashQuestions.ts. Verification: scripts/verify-chrono-roman.ts. No external legacy assumptions were used.</p><main>${rows.map(r=>`<article><h2>${r.profile} · Tier ${r.tier} · Face: ${r.mode.split('-')[0]} / Question: ${r.mode.split('-')[1]}</h2><a href="${r.file}"><img src="${r.file}" loading="lazy"></a></article>`).join('')}</main>`);
