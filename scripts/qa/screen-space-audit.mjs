// Geometry and legibility signals for review, not a blanket accessibility certification.
export function auditScreenSpace() {
 const stage=document.querySelector('[data-game-set]');
 const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const visible=n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&n.getBoundingClientRect().width>1&&n.getBoundingClientRect().height>1;
 const label=n=>(n.getAttribute('aria-label')||n.textContent||'').trim().replace(/\s+/g,' ').slice(0,100);
 const controls=[...stage.querySelectorAll('button,input,select,summary,[role="button"]')].filter(visible).map(n=>{
  const r=rect(n);let clip={...r};
  for(let p=n.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=rect(p);if(/hidden|clip|auto|scroll/.test(s.overflowX)){clip.x=Math.max(clip.x,b.x);clip.right=Math.min(clip.right,b.right);}if(/hidden|clip|auto|scroll/.test(s.overflowY)){clip.y=Math.max(clip.y,b.y);clip.bottom=Math.min(clip.bottom,b.bottom);}}
  clip.x=Math.max(0,clip.x);clip.y=Math.max(0,clip.y);clip.right=Math.min(innerWidth,clip.right);clip.bottom=Math.min(innerHeight,clip.bottom);
  const ratio=Math.max(0,clip.right-clip.x)*Math.max(0,clip.bottom-clip.y)/(r.width*r.height);
  const points=[[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]];
  const hits=points.map(([x,y])=>{const top=document.elementFromPoint(r.x+r.width*x,r.y+r.height*y);return Boolean(top&&(top===n||n.contains(top)));});
  return {label:label(n),className:n.className,rect:r,disabled:n.disabled||false,visibleFraction:ratio,centreHit:hits[0],hitFraction:hits.filter(Boolean).length/points.length,below44:r.width<43.5||r.height<43.5};
 });
 const text=[];const walker=document.createTreeWalker(stage,NodeFilter.SHOW_TEXT);let t;
 while(t=walker.nextNode()){
  const n=t.parentElement;if(!t.textContent.trim()||!visible(n)||n.closest('svg,.sr-only'))continue;
  const range=document.createRange();range.selectNodeContents(t);const boxes=[...range.getClientRects()];if(!boxes.length)continue;
  const s=getComputedStyle(n),r=rect(n),scale=n.offsetHeight?r.height/n.offsetHeight:1;
  text.push({text:t.textContent.trim().slice(0,90),font:parseFloat(s.fontSize)*scale,inControl:Boolean(n.closest('button,summary,input,select')),rect:{x:boxes[0].x,y:boxes[0].y,width:boxes[0].width,height:boxes[0].height}});
 }
 const svgText=[...stage.querySelectorAll('svg text')].filter(visible).map(n=>{const m=n.getScreenCTM();return {text:n.textContent.trim().slice(0,90),font:parseFloat(getComputedStyle(n).fontSize)*(m?Math.hypot(m.c,m.d):1),rect:rect(n)};});
 const actorFeet=[...stage.querySelectorAll('.vision-character--original-hero .vision-character-breath')].filter(visible).map(n=>{const r=rect(n),point={x:r.x+r.width/2,y:r.bottom-r.height*.05};return {identity:n.closest('[data-vision-character]')?.dataset.visionCharacter,point,controlsAtFeet:controls.filter(c=>!c.disabled&&point.x>c.rect.x&&point.x<c.rect.right&&point.y>c.rect.y&&point.y<c.rect.bottom).map(c=>c.label)};});
 const questions=[...document.querySelectorAll('[data-game-question]')].filter(visible).map(n=>({text:label(n),rect:rect(n)}));
 const scrollAreas=[...stage.querySelectorAll('*')].filter(n=>visible(n)&&/auto|scroll/.test(getComputedStyle(n).overflowY)&&n.scrollHeight>n.clientHeight+2).map(n=>({className:n.className,rect:rect(n),extraHeight:n.scrollHeight-n.clientHeight}));
 return {viewport:{width:innerWidth,height:innerHeight},activeGame:document.querySelector('[data-active-game]')?.dataset.activeGame,dialogs:[...document.querySelectorAll('[role="dialog"]')].filter(visible).map(label),stage:rect(stage),questions,controls,text,svgText,actorFeet,scrollAreas,overflow:document.documentElement.scrollWidth>innerWidth+1};
}
