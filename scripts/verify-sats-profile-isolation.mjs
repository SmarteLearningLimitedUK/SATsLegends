import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await page.goto(process.env.LEGEND_QA_URL||'http://127.0.0.1:4183/for-parents',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const ReactModule=await import('/node_modules/.vite/deps/react.js');
  const React=ReactModule.default||ReactModule;
  const ReactDOM=await import('/node_modules/.vite/deps/react-dom_client.js');
  const createRoot=ReactDOM.createRoot||ReactDOM.default.createRoot;
  const {default:Paper}=await import('/src/games/BossEncounterGame.tsx');
  const {GameSaveContext}=await import('/src/website/GameSaveContext.ts');
  document.getElementById('root').style.display='none';
  const mount=document.createElement('div');mount.style.cssText='position:fixed;inset:0;height:100vh;background:#11243a';document.body.append(mount);
  const root=createRoot(mount);
  window.mountPaperOwner=owner=>root.render(React.createElement(GameSaveContext.Provider,{value:owner?{storageKey:owner,initialPlayer:{},queue:()=>{}}:null},React.createElement(Paper,{key:owner||'guest',gameType:'crystal_core',levelId:1,avatarId:'bran',onVictory:()=>{},onGameOver:()=>{},onBack:()=>{}})));
  window.mountPaperOwner('child-a');
 });
 const start=async()=>{await page.getByRole('button',{name:'Launch mock adventure',exact:true}).click();};
 const finish=async()=>{await page.getByRole('button',{name:'Finish run',exact:true}).click();await page.getByRole('button',{name:'Finish and review',exact:true}).click();await expect(page.getByRole('heading',{name:'Core run complete'})).toBeVisible();};
 await start();await page.locator('.sats-answer-options button').first().click();await page.getByRole('button',{name:'Save & continue',exact:true}).click();
 await page.evaluate(()=>window.mountPaperOwner('child-b'));
 await expect(page.locator('.sats-mock')).toHaveAttribute('data-sats-phase','intro');
 await page.evaluate(()=>window.mountPaperOwner('child-a'));
 await expect(page.locator('.sats-mock')).toHaveAttribute('data-sats-phase','play');
 await page.getByRole('button',{name:'Mission list',exact:true}).click();await page.getByRole('button',{name:'Mission 1, saved',exact:true}).click();
 await expect(page.locator('.sats-answer-options button').first()).toHaveAttribute('aria-pressed','true');
 await finish();
 const a=await page.evaluate(()=>localStorage.getItem('sats-legends-mock-results-v1:child-a'));assert(a);
 await page.evaluate(()=>window.mountPaperOwner('child-b'));await start();await page.locator('.sats-answer-options button').nth(1).click();await finish();
 assert.equal(await page.evaluate(()=>localStorage.getItem('sats-legends-mock-results-v1:child-a')),a);
 assert(await page.evaluate(()=>localStorage.getItem('sats-legends-mock-results-v1:child-b')));
 await expect(page.getByRole('region',{name:'Previous Core runs'})).toHaveCount(0);
 console.log('PASS child B cannot resume A; A resumes its own answer; completed histories remain separate');
}finally{await browser.close()}
