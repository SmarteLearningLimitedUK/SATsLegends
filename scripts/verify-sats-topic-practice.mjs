import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const browser=await chromium.launch(),rows=[];
const games=[['time_keeper_cove','6/9','How many days are there in'],['match3_equivalence','2/20','Shade the same fraction'],['unit_mixer','6/19','A ribbon is'],['scale_builder','7/24','These rectangles are similar'],['graph_grabber','4/18','Complete the pictogram'],['multiplication_mine','5/19','How many different'],['conversion_canyon','3/37','Which is the best estimate']];
try{
 for(const profile of [{name:'desktop',width:1440,height:900},{name:'phone',width:667,height:375}]){
  const context=await browser.newContext({viewport:profile,reducedMotion:'reduce',hasTouch:profile.width<1000});await installReleaseAccountFixture(context);const page=await context.newPage();page.setDefaultTimeout(30000);
  for(const [game,route,prompt] of games){const row={profile:profile.name,game,passed:false};try{
   await page.goto('http://127.0.0.1:3018/game/'+route,{waitUntil:'domcontentloaded'});await page.locator('[data-game-set]').first().waitFor();
   for(let i=0;i<4;i++){await page.waitForTimeout(150);const button=page.locator('[role=dialog]:visible [data-dialog-primary]').last();if(!await button.count())break;await button.click({timeout:3000}).catch(()=>{});}
   await page.getByRole('button',{name:'How to play',exact:true}).click();const workshop=page.locator('.revision-workshop');await workshop.waitFor();
   const picker=workshop.getByLabel('Choose a practice question');const options=await picker.locator('option').allTextContents();const index=options.findIndex(text=>text.includes(prompt));expect(index).toBeGreaterThanOrEqual(0);await picker.selectOption(String(index));await expect(workshop).toContainText(prompt);
   if(game==='match3_equivalence')await expect(workshop.getByRole('slider',{name:'Shaded squares'})).toBeVisible();
   if(game==='graph_grabber')await expect(workshop.getByRole('button',{name:'Add half symbol for Books',exact:true})).toBeVisible();
   row.passed=true;
  }catch(error){row.error=error.message;}rows.push(row);console.log(row.passed?'PASS':'FAIL',profile.name,game,row.error||'');}
  await context.close();
 }
}finally{await browser.close();}
await writeFile('qa-artifacts/sats-topic-changes/practice-access.json',JSON.stringify(rows,null,2));if(rows.some(row=>!row.passed))process.exitCode=1;
