/** Compare the main question panel with the full gameplay viewport, not a character-offset column. */
export function auditQuestionAlignment(){
 const viewport=document.querySelector('.app-viewport'),root=document.querySelector('[data-game-set]');
 if(!viewport||!root)return {error:'Missing gameplay viewport'};
 const v=viewport.getBoundingClientRect();
 const cards=[...root.querySelectorAll('[data-game-question="true"]')].filter(n=>n.checkVisibility()&&n.getBoundingClientRect().height>0);
 return {viewportCentre:v.left+v.width/2,cards:cards.map(n=>{const r=n.getBoundingClientRect();return {className:n.className,text:n.innerText.slice(0,180),left:r.left,top:r.top,width:r.width,height:r.height,offset:r.left+r.width/2-(v.left+v.width/2)};})};
}
