import {webkit,expect} from '@playwright/test';
import {readFile,access,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve('qa-artifacts/release-readiness-2026-11-04');
const html=await readFile(path.join(root,'index.html'),'utf8');
const sources=[...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m=>m[1]);
for(const source of sources)await access(path.join(root,source));
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);
 await page.getByRole('searchbox').fill('prime_pop');
 await expect.poll(()=>page.locator('figure:not([hidden])').count()).toBeGreaterThan(10);
 await page.waitForFunction(()=>[...document.querySelectorAll('figure:not([hidden]) img')].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).every(i=>i.complete&&i.naturalWidth>0));
 expect(errors).toEqual([]);await page.screenshot({path:path.join(root,'gallery-preview.png')});
 await writeFile(path.join(root,'gallery-check.json'),JSON.stringify({passed:true,localImageLinksVerified:sources.length,searchFilterPassed:true,errors},null,2));console.log(`PASS: ${sources.length} gallery image links, visible images and search.`);
}finally{await browser.close();}
