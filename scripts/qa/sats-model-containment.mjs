// Audit actual SVG artwork, not just the outer SVG or clickable controls.
export function auditSatsModelContainment() {
 const model=document.querySelector('.sats-model');if(!model)return {issues:[],graphics:0};
 const box=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const visible=node=>{const s=getComputedStyle(node),r=box(node);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
 const frame=box(model),inscription=model.querySelector('.core-paper-inscription'),title=inscription&&visible(inscription)?box(inscription):null;
 const issues=[],graphics=[...model.querySelectorAll('svg.sats-diagram :is(text,rect,circle,path,line,polygon,polyline)')].filter(visible);
 for(const node of graphics){const r=box(node),label=node.tagName+':'+(node.textContent||'').slice(0,60);
  if(r.left<frame.left+5||r.right>frame.right-5||r.top<frame.top+5||r.bottom>frame.bottom-5)issues.push({kind:'art-outside-frame',label,art:r,frame});
  if(title&&Math.min(r.right,title.right)-Math.max(r.left,title.left)>1&&Math.min(r.bottom,title.bottom)-Math.max(r.top,title.top)>1)issues.push({kind:'art-over-inscription',label,art:r,title});
  const svg=box(node.closest('svg'));
  if(r.left<svg.left-1||r.right>svg.right+1||r.top<svg.top-1||r.bottom>svg.bottom+1)issues.push({kind:'clipped-svg-art',label,art:r,svg});
 }
 const canvas=model.querySelector('.sats-model-canvas');
 if(canvas){const bounds=box(canvas);for(const node of [...canvas.querySelectorAll('.sats-table,.sats-equation,.sats-fractions,.sats-ratio,.sats-construction button')].filter(visible)){const r=box(node);if(r.left<bounds.left-1||r.right>bounds.right+1||r.top<bounds.top-1||r.bottom>bounds.bottom+1)issues.push({kind:'clipped-model-content',label:node.className||node.tagName,art:r,canvas:bounds});}}
 const question=document.querySelector('.sats-mission-strip'),response=document.querySelector('.sats-response');
 for(const node of [question,response].filter(Boolean)){const r=box(node);if(Math.min(r.right,frame.right)-Math.max(r.left,frame.left)>2&&Math.min(r.bottom,frame.bottom)-Math.max(r.top,frame.top)>2)issues.push({kind:'model-zone-overlap',with:node.className});}
 return {issues,graphics:graphics.length,frame};
}
