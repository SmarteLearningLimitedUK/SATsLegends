import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const source = process.env.LEGEND_REVIEW_SOURCE_URL || 'http://127.0.0.1:4187';
const base = process.env.LEGEND_REVIEW_URL || 'http://127.0.0.1:4188';
const out = process.env.LEGEND_REVIEW_OUTPUT || 'qa-artifacts/website-refinement-2026-10-28';
await mkdir(out, { recursive: true });
const baseline = JSON.parse(await readFile('docs/website-refinement/baseline.json', 'utf8'));
const buildHash = createHash('sha256').update(await readFile('dist/index.html')).digest('hex');
const report = { capturedAt: new Date().toISOString(), target: 'web', account: 'isolated browser fixture; no real account or live progress writes', base, checkpoint: baseline.checkpointCommit, buildHash, captures: [], checks: [], runtimeErrors: [] };
const browser = await chromium.launch();
const profiles = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'short-desktop', width: 1280, height: 720 }];
async function context(profile) {
  const c = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, reducedMotion: 'no-preference' });
  await installReleaseAccountFixture(c);
  await c.addInitScript(() => {
    localStorage.setItem('maths_quest_player_v2', JSON.stringify({ avatarId: 'barratt', level: 100, playerName: 'Website review' }));
    localStorage.setItem('__release_qa_api_state__', JSON.stringify({ revision: 1, saved: { player: { avatarId: 'barratt', level: 100 }, revision: 1 }, requests: {} }));
  });
  return c;
}
async function settle(p) {
  await p.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 12000 }).catch(() => {});
  await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 20000 });
  await p.waitForTimeout(300);
}
async function dismiss(p) {
  for (let n = 0; n < 6; n++) {
    await p.waitForTimeout(160);
    const button = await p.$('[role="dialog"] [data-dialog-primary]');
    if (!button) break;
    await button.click();
    await p.waitForFunction(el => !el.isConnected, button, { timeout: 5000 }).catch(() => {});
  }
}
async function open(p, route) {
  await p.bringToFront();
  await p.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.locator('[data-game-set]').waitFor({ timeout: 45000 });
  assert.notEqual(await p.locator('html').getAttribute('data-app-target'), 'ios');
}
async function capture(p, profile, state, route) {
  const file = `${profile}-${state}.png`;
  await p.screenshot({ path: `${out}/${file}`, timeout: 10000 });
  report.captures.push({ profile, state, route, file, capturedAt: new Date().toISOString() });
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log('CAPTURED', profile, state);
}
async function digits(p) {
  const text = (await p.locator('.pvp-prompt-compact').textContent()).toLowerCase();
  const words = text.replace(/^.*?(?:rebuild|write)\s+/, '').replace(/in digits.*$/, '').replace(/[.\-]/g, ' ').trim().split(/\s+/);
  const names = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = { twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90 };
  let sum=0, group=0;
  for(const word of words){if(names.includes(word))group+=names.indexOf(word);else if(tens[word])group+=tens[word];else if(word==='hundred')group*=100;else if(word==='thousand'||word==='million'){sum+=group*(word==='million'?1000000:1000);group=0;}}
  const count=await p.locator('[data-pvp-location="target"]').count();
  return String(sum+group).padStart(count,'0').split('');
}
async function answer(p, correct=true) {
  await p.waitForFunction(() => {
    const targets = [...document.querySelectorAll('[data-pvp-location="target"]')];
    return targets.length > 0 && targets.every(b => !b.disabled && !b.classList.contains('is-filled'));
  }, null, { timeout: 10000 });
  const expected=await digits(p);
  if(!correct){
    const choices=await p.locator('[data-pvp-location="source"][aria-label^="Digit"]').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-label').match(/Digit (\d)/)?.[1]));
    const wrong=choices.find(n=>n!==expected[0]);
    assert.ok(wrong,'A wrong first digit must be available');
    await p.locator(`[data-pvp-location="source"][aria-label="Digit ${wrong}"]`).first().press('Enter');
    for(let i=1;i<expected.length;i++)await p.locator('[data-pvp-location="source"][aria-label^="Digit"]').first().press('Enter');
  }else for(const digit of expected)await p.locator(`[data-pvp-location="source"][aria-label="Digit ${digit}"]`).first().press('Enter');
  const submit=p.getByRole('button',{name:'Submit',exact:true});await submit.click();
  return expected.join('');
}
try {
  const catalogContext=await context(profiles[0]), catalogPage=await catalogContext.newPage();
  await catalogPage.goto(source+'/map',{waitUntil:'domcontentloaded'});await catalogPage.locator('[data-qa-screen="world_map"]').waitFor({timeout:45000});
  const catalog=await catalogPage.evaluate(async()=>{
    const {ISLANDS}=await import('/src/constants.ts');
    return ISLANDS.flatMap(island=>island.levels.map(level=>({key:level.blueprintKey||level.miniGameKey||level.gameType,island:island.id,islandName:island.name,title:level.displayName,route:`/game/${island.id}/${level.id}`,practice:Boolean(level.isPractice),tier:level.isPractice?0:level.miniGameLevel||level.difficultyTier||1})));
  });await catalogContext.close();
  const inventory=[];for(const row of catalog){let group=inventory.find(g=>g.key===row.key);if(!group){group={key:row.key,title:row.title.replace(/ L\d+$/,''),island:row.island,islandName:row.islandName,status:row.key==='place_value_panic'?'awaiting-current-screen-review':'not-reviewed',approved:false,routes:[]};inventory.push(group);}group.routes.push(row);}
  const previous = await readFile('docs/website-refinement/review-inventory.json', 'utf8').then(JSON.parse).catch(() => null);
  for (const game of inventory) {
    const prior = previous?.games?.find(entry => entry.key === game.key);
    if (!prior) continue;
    game.approved = prior.approved && previous.baseline.buildHash === buildHash;
    game.status = prior.approved && !game.approved ? 'requires-review-after-build-change' : prior.status;
    if (prior.reviewNotes) game.reviewNotes = prior.reviewNotes;
    if (prior.approval) game.approval = prior.approval;
    if (prior.proposedRevision) game.proposedRevision = prior.proposedRevision;
  }
  const record={phase:'website refinement',date:'2026-10-28',baseline:{branch:baseline.refinementBranch,checkpointRef:baseline.checkpointRef,commit:baseline.checkpointCommit,buildHash},decisions:{baseline:'current project',order:'games in island/catalogue order, starting Place Value Panic',review:'one screen at a time; user approves before advancing',desktop:[{width:1440,height:900},{width:1280,height:720}],websiteGameplay:'landscape',native:'deferred until web approval and freeze',payments:'deferred'},games:inventory,surroundingJourney:{status:'deferred until games and papers reviewed'},mobileWebsite:{status:'deferred until desktop review'},freeze:{status:'not-approved'},notes:'No game changes or approvals implied by successful captures. Existing native source preserved.'};
  await writeFile('docs/website-refinement/review-inventory.json',JSON.stringify(record,null,2)+'\n');
  const routes=catalog.filter(x=>x.key==='place_value_panic').sort((a,b)=>a.tier-b.tier);
  report.catalogGames=inventory.length;report.placeValueRoutes=routes;
  for(const profile of profiles){
    const c=await context(profile),p=await c.newPage();p.on('pageerror',e=>report.runtimeErrors.push({profile:profile.name,error:e.message}));
    await open(p,routes[0].route);await settle(p);await capture(p,profile.name,'introduction',routes[0].route);
    await dismiss(p);await settle(p);await capture(p,profile.name,'practice',routes[0].route);
    const layout=await p.evaluate(auditLayout);report.checks.push({profile:profile.name,case:'practice-layout',result:layout});
    await c.close();
    for(const route of routes.filter(r=>!r.practice)){
      const tierContext = await context(profile), tierPage = await tierContext.newPage();
      tierPage.on('pageerror',e=>report.runtimeErrors.push({profile:profile.name,tier:route.tier,error:e.message}));
      try {
        await open(tierPage,route.route);await dismiss(tierPage);await settle(tierPage);await capture(tierPage,profile.name,`level-${route.tier}`,route.route);
        report.checks.push({profile:profile.name,tier:route.tier,case:'initial-layout',result:await tierPage.evaluate(auditLayout)});
      } finally { await tierContext.close(); }
    }
  }
  const c=await context(profiles[0]),p=await c.newPage();p.on('pageerror',e=>report.runtimeErrors.push({profile:'interaction',error:e.message}));const route=routes.find(r=>r.tier===1);
  await open(p,route.route);await dismiss(p);await settle(p);
  await p.getByRole('button',{name:'How to play',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));
  await capture(p,'desktop','help-paused',route.route);const held=await p.locator('[data-vision-character="rhino"]').getAttribute('data-vision-frame');await p.waitForTimeout(400);assert.equal(await p.locator('[data-vision-character="rhino"]').getAttribute('data-vision-frame'),held);await dismiss(p);
  report.checks.push({case:'help-pauses-and-resumes',passed:true});
  await answer(p,false);await capture(p,'desktop','incorrect-answer',route.route);await p.waitForTimeout(750);
  const before=Number(await p.locator('[data-pvp-health]').getAttribute('data-pvp-health'));await answer(p,true);await capture(p,'desktop','correct-answer',route.route);await p.waitForTimeout(850);assert.equal(Number(await p.locator('[data-pvp-health]').getAttribute('data-pvp-health')),before-1);report.checks.push({case:'incorrect-answer-then-correct-native-keyboard-and-submit',passed:true});
  for(let i=0;i<9;i++){await answer(p,true);await p.waitForTimeout(850);}
  await p.locator('[data-result-outcome="victory"]').waitFor({timeout:10000});await capture(p,'desktop','completion',route.route);report.checks.push({case:'level-1-full-completion',passed:true});
  await c.close();
  const failureContext = await context(profiles[0]), failurePage = await failureContext.newPage();
  await open(failurePage,route.route);await dismiss(failurePage);
  for(let i=0;i<3;i++){await answer(failurePage,false);await failurePage.waitForTimeout(750);}
  await failurePage.locator('[data-result-outcome]').waitFor({timeout:10000});
  assert.notEqual(await failurePage.locator('[data-result-outcome]').getAttribute('data-result-outcome'), 'victory');
  await capture(failurePage,'desktop','failure',route.route);report.checks.push({case:'three-errors-result',outcome:await failurePage.locator('[data-result-outcome]').getAttribute('data-result-outcome')});
  await failurePage.getByRole('button',{name:'Retry',exact:true}).click();await dismiss(failurePage);await failurePage.locator('[data-pvp-health="10"]').waitFor();await capture(failurePage,'desktop','retry',route.route);report.checks.push({case:'retry-resets-monster-health',passed:true});
  await failureContext.close();
} catch(error){report.error=error.stack;process.exitCode=1;console.error(error);}finally{await browser.close();await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));}
