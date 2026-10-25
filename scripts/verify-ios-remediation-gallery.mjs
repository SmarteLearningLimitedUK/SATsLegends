import {chromium,expect} from '@playwright/test';
import {access,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const root='qa-artifacts/ios-remediation';
const manifest=JSON.parse(await readFile(`${root}/gallery-manifest.json`,'utf8'));
for(const item of manifest)await access(path.join(root,item.file));
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  const response=await page.goto((process.env.LEGEND_GALLERY_URL||'http://127.0.0.1:3023')+'/qa-artifacts/ios-remediation/index.html');
  expect(response.status()).toBe(200);
  for(const group of ['Compact phone','Standard phone','Desktop']) {
    await page.locator('#group').selectOption(group);
    await expect(page.locator('.shot')).toHaveCount(37);
  }
  await page.locator('#group').selectOption('Compact phone');
  const first=page.locator('.image-open').first();
  await expect.poll(()=>first.locator('img').evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);
  await first.click();await expect(page.locator('#viewer')).toBeVisible();
  const before=await page.locator('#full').getAttribute('src');
  await page.getByRole('button',{name:'Next screenshot'}).click();
  expect(await page.locator('#full').getAttribute('src')).not.toBe(before);
  await page.keyboard.press('Escape');await expect(page.locator('#viewer')).not.toBeVisible();
  await page.screenshot({path:`${root}/gallery-preview.png`});
  await page.locator('#group').selectOption('Final comparisons');await expect(page.locator('.shot')).toHaveCount(6);
  await page.locator('#group').selectOption('All screenshots');await expect(page.locator('.shot')).toHaveCount(manifest.length);
  expect(errors).toEqual([]);
  await writeFile(`${root}/gallery-check.json`,JSON.stringify({passed:true,images:manifest.length,campaignsPerProfile:37,comparisonImages:6,allFilesExist:true,filtering:true,lightboxNavigation:true,escapeClose:true,errors},null,2));
  console.log('PASS gallery',manifest.length,'images; filters, files and lightbox');
}finally{await browser.close();}
