import {chromium} from '@playwright/test';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const b=await chromium.launch();
for(const [key,route,width,height] of [['prime','/game/1/39',390,844],['match','/game/2/20',390,844],['forge','/game/2/15',844,390]]){
 const c=await b.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});await installReleaseAccountFixture(c);const p=await c.newPage();await p.goto('http://127.0.0.1:3017'+route);await p.locator('[data-game-set]').waitFor();for(let i=0;i<6;i++){await p.waitForTimeout(100);const x=p.locator('[data-dialog-primary]:visible').last();if(!await x.count())break;await x.tap()}
 console.log(key,JSON.stringify(await p.locator('.legend-hud-bar').evaluate(e=>[e,...e.querySelectorAll('.legend-hud-title,.legend-hud-lives,.concept-clock-stack,.concept-clock-icon,.concept-clock-value')].map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return{class:n.getAttribute('class'),text:n.children.length?'':n.textContent,x:r.x,y:r.y,w:r.width,h:r.height,padding:s.padding,font:s.font,flex:s.flex,position:s.position,gap:s.gap,color:s.color,display:s.display}}))));await c.close();
}await b.close();
