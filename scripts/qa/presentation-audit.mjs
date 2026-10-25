// Measurable checks supplement the visual review; they do not infer floors from artwork.
export function auditPresentation() {
  const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
  const visible=n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&n.getBoundingClientRect().width>0;
  const actors=[...document.querySelectorAll('.vision-character--original-hero')].filter(visible).map(n=>{
    const r=box(n),surface=n.querySelector('.vision-character-breath'),shadow=n.querySelector('.vision-character-contact');
    const b=surface&&box(surface),s=shadow&&box(shadow);
    return {identity:n.dataset.visionCharacter,activity:n.dataset.visionActivity,playback:n.dataset.visionPlayback,rect:r,
      drawing:b,footY:b?b.bottom-b.height*.05:null,shadowError:b&&s?Math.abs(b.bottom-b.height*.05-(s.y+s.height/2)):null,
      heightFraction:b?b.height*.88/innerHeight:0,ready:n.dataset.visionReady,time:Number(n.dataset.visionTime??0),
      inViewport:r.right>0&&r.x<innerWidth&&r.bottom>0&&r.y<innerHeight};
  });
  const rack=document.querySelector('.ff-tray');
  const angle=document.querySelector('[data-angle-enemy-frame]');
  const angleActor=angle?.querySelector('.vision-character-breath');
  const angleGround=angle&&angleActor?{footY:box(angleActor).bottom-box(angleActor).height*.05,podiumY:box(angle.parentElement).y+box(angle.parentElement).height*Number(angle.dataset.groundY)/100}:null;
  const contained=rack?[...rack.querySelectorAll('button,.ff-feedback')].filter(visible).every(n=>{const a=box(rack),b=box(n);return b.x>=a.x-1&&b.right<=a.right+1&&b.y>=a.y-1&&b.bottom<=a.bottom+1;}):null;
  const controls=[...document.querySelectorAll('[data-game-set] button')].filter(n=>visible(n)&&!n.disabled).map(n=>{const r=box(n);const p=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {name:n.getAttribute('aria-label')??n.textContent?.trim().slice(0,60),rect:r,hit:n===p||n.contains(p)};});
  const animations=document.getAnimations().filter(a=>a.effect?.target instanceof Element&&visible(a.effect.target));
  return {actors,angleGround,rackContained:contained,controls,ambientAnimations:animations.filter(a=>a.effect.target.closest('.scene-effects')).map(a=>({name:a.animationName,state:a.playState,time:Number(a.currentTime)})),overflow:document.documentElement.scrollWidth>innerWidth+1};
}

export async function samplePresentationMotion(page) {
  const sample=()=>({actors:[...document.querySelectorAll('.vision-character--original-hero')].filter(n=>n.checkVisibility({checkVisibilityCSS:true})).map(n=>({id:n.dataset.visionCharacter,time:Number(n.dataset.visionTime??0)})),ambient:document.getAnimations().filter(a=>a.effect?.target instanceof Element&&a.effect.target.closest('.scene-effects')).map(a=>({name:a.animationName,time:Number(a.currentTime)}))});
  const before=await page.evaluate(sample);await page.waitForTimeout(220);const after=await page.evaluate(sample);
  const advances=before.actors.map((a,i)=>({id:a.id,delta:(after.actors[i]?.time??a.time)-a.time}));
  const help=page.getByRole('button',{name:'How to play',exact:true});
  let pause=null;
  if(await help.isVisible().catch(()=>false)) {
    await help.click();
    await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]')&&document.getAnimations().filter(a=>a.effect?.target instanceof Element&&a.effect.target.closest('.scene-effects')).every(a=>a.playState==='paused'&&!a.pending),null,{timeout:3000});
    await page.waitForTimeout(100);
    // Keep object identities: CSS may reorder/recreate animations as Help mounts.
    pause=await page.evaluate(async()=>{
      const actors=[...document.querySelectorAll('.vision-character--original-hero')].map(n=>({n,time:Number(n.dataset.visionTime??0)}));
      const animations=document.getAnimations().filter(a=>a.effect?.target instanceof Element&&a.effect.target.closest('.scene-effects')).map(a=>({a,time:Number(a.currentTime)}));
      await new Promise(resolve=>setTimeout(resolve,180));
      return {actorsHeld:actors.every(({n,time})=>!n.isConnected||Math.abs(time-Number(n.dataset.visionTime??0))<.001),ambientHeld:animations.every(({a,time})=>a.playState==='idle'||a.playState==='paused'&&Math.abs(time-Number(a.currentTime))<1)};
    });
    const close=page.getByRole('button',{name:'Close help',exact:true});
    if(await close.isVisible().catch(()=>false)){
      await close.click({timeout:2500}).catch(async error=>{if(await close.isVisible().catch(()=>false))throw error;});
      await page.waitForTimeout(180);
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.vision-character--original-hero')].every(n=>Number(n.dataset.visionTime??0)===0),null,{timeout:3000});
  const reducedA=await page.evaluate(sample);await page.waitForTimeout(160);const reducedB=await page.evaluate(sample);
  return {advances,ambientAdvances:before.ambient.some((a,i)=>(after.ambient[i]?.time??0)>a.time+1),pause,reducedMotionHeld:reducedA.actors.every((a,i)=>Math.abs(a.time-(reducedB.actors[i]?.time??-1))<.001)};
}
