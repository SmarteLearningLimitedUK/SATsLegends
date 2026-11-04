export function inspectText(){
 const issues=[],small=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&s.visibility!=='hidden'&&s.display!=='none'&&+s.opacity>.01&&r.width>2&&r.height>2&&!e.closest('.sr-only,[aria-hidden="true"],svg,script,style')};
 while(walker.nextNode()){
  const node=walker.currentNode,e=node.parentElement;
  if(!node.textContent.trim()||!visible(e))continue;
  let intentionallyHidden=false;for(let p=e;p;p=p.parentElement){const r=p.getBoundingClientRect(),s=getComputedStyle(p);if(s.clipPath==='inset(50%)'||r.width<=1.1&&r.height<=1.1&&/hidden|clip/.test(s.overflow)){intentionallyHidden=true;break}}if(intentionallyHidden)continue;
  const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();if(r.width<1||r.height<1)continue;
  const text=node.textContent.trim().replace(/\s+/g,' ').slice(0,150),s=getComputedStyle(e),font=parseFloat(s.fontSize);
  let reason='',container=null;
  for(let p=e;p&&!reason;p=p.parentElement){if([...p.children].some(c=>c.classList.contains('artwork-frame'))){const b=p.getBoundingClientRect();if(r.left<b.left+8-1||r.right>b.right-8+1||r.top<b.top+4-1||r.bottom>b.bottom-4+1){reason='frame padding';container=p.className}break}}
  const control=e.closest('button,input,select,textarea,[data-concept-panel],.mean-question,.mean-feedback');
  if(control){const b=control.getBoundingClientRect();if(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1){reason='outside container';container=control.className}}
  for(let p=e;p&&!reason;p=p.parentElement){const style=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll/.test(style.overflowY+style.overflowX))break;if(/hidden|clip/.test(style.overflowX)&& (r.left<b.left-1||r.right>b.right+1)||/hidden|clip/.test(style.overflowY)&&(r.top<b.top-1||r.bottom>b.bottom+1)){reason='clipped';container=p.className}}
  if((r.left<0||r.right>innerWidth+1||r.top<0||r.bottom>innerHeight+1)&&!reason){let scroll=false;for(let p=e;p;p=p.parentElement)if(/auto|scroll/.test(getComputedStyle(p).overflowY+getComputedStyle(p).overflowX))scroll=true;if(!scroll)reason='outside viewport'}
  const item={text,class:e.className,font,reason,container,rect:r.toJSON()};
  if(reason)issues.push(item);else if(font<14)small.push(item);
 }
 return {issues,small,overflow:document.documentElement.scrollWidth>innerWidth+1};
}
