import {expect} from '@playwright/test';

export const constructionIds=new Set(['draw-rectangle','draw-angle','construct-graph','ext-symmetry','depth-line-build','depth-pie-build','depth-angle-draw','depth-symmetry-axes','depth-rectangle-build','revision-fraction-shade','revision-pictogram-build']);

export async function startCore(page,base,paper){
  await page.goto(`${base}/game/8/${paper}`,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Start',exact:true}).click({timeout:60000});
  await page.locator('.sats-mock').waitFor();
  for(let i=0;i<5;i++){if(await page.locator('.sats-mock').getAttribute('data-sats-phase')==='play')break;const b=page.locator('[data-dialog-primary]:visible').first();if(!await b.count())break;const node=await b.elementHandle();await b.click();if(node)await node.waitForElementState('hidden');}
  await expect(page.locator('.sats-mock')).toHaveAttribute('data-sats-phase','play');
}

async function rangeTo(input,target){
  const min=Number(await input.getAttribute('min')||0),max=Number(await input.getAttribute('max')||100),step=Number(await input.getAttribute('step')||1);
  expect(target).toBeGreaterThanOrEqual(min);expect(target).toBeLessThanOrEqual(max);
  await input.focus();await input.press('Home');
  const steps=Math.round((target-min)/step);
  if(!steps){await input.press('End');await input.press('Home');}
  else for(let n=0;n<steps;n++)await input.press('ArrowRight');
  await expect(input).toHaveValue(String(target));
}

export async function answerCore(page,q,{usePad=false}={}){
  const response=page.locator('.sats-response');
  const answer=q.fields[0].answer,m=q.visual.type==='depth'?q.visual.model:null;
  if(constructionIds.has(q.id)){
    if(m?.kind==='fraction-grid')await rangeTo(response.getByRole('slider',{name:'Shaded squares'}),Number(answer.split(':')[1]));
    else if(m?.kind==='pictogram-build'){
      const counts=answer.split(':').slice(1).map(Number);
      for(let i=0;i<counts.length;i++){
        await response.getByRole('button',{name:`Choose ${m.labels[i]} row`,exact:true}).click();
        if(counts[i]===0){await response.getByRole('button',{name:`Add half symbol for ${m.labels[i]}`,exact:true}).click();await response.getByRole('button',{name:`Remove half symbol for ${m.labels[i]}`,exact:true}).click();}
        else for(let n=0;n<counts[i];n++)await response.getByRole('button',{name:`Add half symbol for ${m.labels[i]}`,exact:true}).click();
      }
    }else if(m?.kind==='rectangle-build'){
      const dims=answer.split(':').slice(1).map(Number);
      await rangeTo(response.getByRole('slider',{name:'Length',exact:true}),dims[0]);
      await rangeTo(response.getByRole('slider',{name:'Width',exact:true}),dims[1]);
    }else if(m?.kind==='angle-draw')await rangeTo(response.getByRole('slider',{name:'Ray angle'}),Number(answer.split(':')[1]));
    else if(m?.kind==='symmetry-axes'){
      for(const n of answer.split(',').filter(Boolean).map(Number))await response.getByRole('button',{name:`Line ${'ABCD'[n]}`,exact:true}).click();
    }else if(m?.kind==='line-build'||m?.kind==='pie-build'){
      const values=answer.split(':').slice(1).map(Number);
      for(let i=0;i<values.length;i++){
        await response.locator('.sats-depth-tabs button').nth(i).click();
        await rangeTo(response.getByRole('slider',{name:m.kind==='line-build'?'Plot reading':'Sector angle'}),values[i]);
      }
    }else if(q.id==='ext-symmetry'){
      for(const item of answer.split(';').filter(Boolean)){const [x,y]=item.split(',').map(Number);await page.getByRole('button',{name:`Column ${x+1}, row ${y+1}`,exact:true}).click();}
    }else if(q.id==='draw-rectangle'){
      const [length,width]=answer.match(/\d+/g).map(Number);
      for(const [name,target]of [['long side',length],['short side',width]])for(let n=0;n<Math.abs(target-4);n++)await response.getByRole('button',{name:`${target>=4?'Increase':'Decrease'} ${name}`,exact:true}).click();
    }else if(q.id==='draw-angle'){
      const target=Number(answer.replace('°',''));
      for(let n=0;n<Math.abs(target-45)/5;n++)await response.getByRole('button',{name:`${target>=45?'Increase':'Decrease'} angle by five degrees`,exact:true}).click();
    }else if(q.id==='construct-graph'){
      const values=[...answer.matchAll(/(Red|Blue|Green) (\d+)/g)];
      for(const [,name,value]of values){await response.getByRole('button',{name:`Choose ${name} bar`,exact:true}).click();for(let n=0;n<Number(value)/5;n++)await response.getByRole('button',{name:`Increase ${name} bar by five`,exact:true}).click();}
    }else throw Error('Unimplemented actual-UI construction '+q.id);
    return;
  }
  let visibleIndex=0;
  for(let i=0;i<q.fields.length;i++){
    const field=q.fields[i];
    if(field.response==='working'||(/^ar-long-(mult|div)-/.test(q.id)&&i===0))continue;
    const box=response.locator('.sats-entered-fields fieldset').nth(visibleIndex++);
    const options=box.locator('.sats-answer-options button');
    if(await options.count())await box.getByRole('button',{name:field.answer,exact:true}).click();
    else if(usePad&&/^[\d./,;:+() −-]+$/.test(field.answer)){
      await box.getByRole('button',{name:/Open answer pad/}).click();
      const dialog=page.getByRole('dialog',{name:`Answer pad: ${field.label}`,exact:true});
      await dialog.getByRole('button',{name:'Clear',exact:true}).click();
      for(const symbol of field.answer){const label=symbol===' '?'Space':symbol==='-'?'−':symbol;await dialog.getByRole('button',{name:label,exact:true}).click();}
      await dialog.getByRole('button',{name:'Done',exact:true}).click();
      await expect(box.locator('input')).toHaveValue(field.answer.replaceAll('-','−'));
    }else await box.locator('input').fill(field.answer);
  }
}

export async function finishCore(page){
  const back=page.getByRole('button',{name:'Back to mission',exact:true});if(await back.isVisible())await back.click();
  await page.getByRole('button',{name:'Finish run',exact:true}).click();
  await page.getByRole('button',{name:'Finish and review',exact:true}).click();
  await expect(page.locator('.sats-mock')).toHaveAttribute('data-sats-phase','review');
}
