// Browser-side geometry audit shared by game, screen, and dialog sweeps.
export const auditLayout = (options = {}) => {
  const stage = document.querySelector(options.rootSelector || '[data-game-set]');
  const box = n => {const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const intersection = (a,b) => ({width:Math.min(a.right,b.right)-Math.max(a.left,b.left),height:Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)});
  const meets = (a,b) => {const r=intersection(a,b);return r.width>2&&r.height>2;};
  const visible = n => {
    if(!n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return false;
    const r=box(n);if(r.width<1||r.height<1||r.right<=0||r.bottom<=0||r.left>=innerWidth||r.top>=innerHeight)return false;
    for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a);if(/hidden|clip|auto|scroll/.test(s.overflowX+s.overflowY)&&!meets(r,box(a)))return false;}
    return true;
  };
  const clippedBox = (n, initial=box(n)) => {
    const r={...initial};
    let start=n.parentElement;
    if(getComputedStyle(n).position==='fixed'){
      while(start){const s=getComputedStyle(start);if(s.transform!=='none'||s.perspective!=='none'||s.filter!=='none'||/paint|layout|strict|content/.test(s.contain))break;start=start.parentElement;}
    }
    for(let a=start;a;a=a.parentElement){const s=getComputedStyle(a),b=box(a);
      if(/hidden|clip|auto|scroll/.test(s.overflowX)){r.left=Math.max(r.left,b.left);r.right=Math.min(r.right,b.right);}
      if(/hidden|clip|auto|scroll/.test(s.overflowY)){r.top=Math.max(r.top,b.top);r.bottom=Math.min(r.bottom,b.bottom);}
    }
    return {...r,width:r.right-r.left,height:r.bottom-r.top};
  };
  const name = n => (n.getAttribute('aria-label')||n.textContent||n.className?.baseVal||n.className||n.tagName).trim().replace(/\s+/g,' ').slice(0,85);
  const controls = [...stage.querySelectorAll('button,input,select,summary,[role="button"]'+(options.includeLinks?',a[href]':''))].filter(visible).map(n=>({n,label:name(n),rect:clippedBox(n)}));
  const chrome = options.includeChrome === false ? [] : [...document.querySelectorAll('[data-testid="shared-top-hud"],[data-testid="shared-bottom-hud"]')].filter(visible).map(n=>({n,label:n.dataset.testid,rect:box(n)}));
  const question = [...stage.querySelectorAll('[data-game-question]')].filter(visible).map(n=>({n,label:'question',rect:box(n)}));
  const issues = [];
  const add = (kind,a,b) => issues.push({kind,a:a.label,b:b.label,aRect:a.rect,bRect:b.rect});
  const dynamic = n => n.matches('.zombies-target,[aria-label^="Pop number"]');
  if(stage.dataset.gameSet==='prime_pop'){
    const actors=[...stage.querySelectorAll('.vision-companion--stage .vision-character-breath')].filter(visible).map(n=>({n,label:'Prime Pop helper',rect:box(n)}));
    for(const actor of actors)for(const control of controls.filter(c=>c.n.matches('[aria-label^="Pop number"]'))){
      if(meets(actor.rect,control.rect))add('actor-control',actor,control);
    }
  }
  for(let i=0;i<controls.length;i++){
    const a=controls[i];
    for(const b of [...controls.slice(i+1),...chrome,...question]){
      if(a.n.contains(b.n)||b.n.contains(a.n))continue;
      if(a.n.matches('.legend-map-hotspot')&&b.n.matches('.legend-map-hotspot')){
        // Map hit surfaces are rounded islands; empty rectangle corners do not
        // belong to either selectable ellipse.
        const dx=(a.rect.left+a.rect.right-b.rect.left-b.rect.right)/(a.rect.width+b.rect.width);
        const dy=(a.rect.top+a.rect.bottom-b.rect.top-b.rect.bottom)/(a.rect.height+b.rect.height);
        if(Math.hypot(dx,dy)>=1)continue;
      }
      if(dynamic(a.n)&&dynamic(b.n)){
        // Round targets may intersect at rectangle corners without touching.
        if(a.n.matches('[aria-label^="Pop number"]')&&b.n.matches('[aria-label^="Pop number"]')){
          const radius=(a.rect.width+b.rect.width)/2;
          const distance=Math.hypot((a.rect.left+a.rect.right-b.rect.left-b.rect.right)/2,(a.rect.top+a.rect.bottom-b.rect.top-b.rect.bottom)/2);
          if(distance<radius-1)add('bubble-collision',a,b);
        }
        continue;
      }
      if(meets(a.rect,b.rect))add('control-overlap',a,b);
    }
  }
  for(const a of question)for(const b of chrome)if(meets(a.rect,b.rect))add('question-chrome',a,b);
  const models=[...stage.querySelectorAll('.pyramid-number-block,[data-line-marker]>div>*')].filter(visible).map(n=>({n,label:name(n),rect:box(n)}));
  for(let i=0;i<models.length;i++){
    const a=models[i];
    for(const b of [...models.slice(i+1),...controls,...question,...chrome])if(!a.n.contains(b.n)&&!b.n.contains(a.n)&&meets(a.rect,b.rect))add('model-overlap',a,b);
  }
  const texts=[];
  const walker=document.createTreeWalker(stage,NodeFilter.SHOW_TEXT);
  let node;
  while(node=walker.nextNode()){
    const n=node.parentElement;
    if(!node.textContent.trim()||!visible(n)||n.closest('svg,.sr-only'))continue;
    const range=document.createRange();range.selectNodeContents(node);
    for(const r of range.getClientRects())if(r.width>1&&r.height>1){
      const rect={left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      // A scrollable local workpad may contain additional, intentionally offscreen content.
      let shown=true;
      for(let a=n;a&&a!==stage;a=a.parentElement){const s=getComputedStyle(a);if(/hidden|clip|auto|scroll/.test(s.overflowX+s.overflowY)&&!meets(rect,box(a))){shown=false;break;}}
      if(shown)texts.push({n,textNode:node,label:node.textContent.trim().slice(0,85),rect:clippedBox(n,rect),rawRect:rect});
    }
  }
  // Ellipsis can expose two ranges on the same baseline for one text node.
  for(let i=0;i<texts.length;i++)for(const b of texts.slice(i+1))if(texts[i].textNode===b.textNode&&Math.abs(texts[i].rect.top-b.rect.top)>1&&meets(texts[i].rect,b.rect))add('text-line-overlap',texts[i],b);
  for(const a of texts){
    for(const b of [...controls,...chrome]){
      if(a.n.contains(b.n)||b.n.contains(a.n)||a.n.closest('button,input,select,summary,[role="button"]')===b.n)continue;
      if(dynamic(a.n.closest('button')||a.n)&&dynamic(b.n))continue;
      if(meets(a.rect,b.rect))add('label-control',a,b);
    }
    const owner=a.n.closest('button,summary,[data-game-question]');
    if(owner){const r=box(owner),t=a.rawRect;if(t.left<r.left-2||t.right>r.right+2||t.top<r.top-2||t.bottom>r.bottom+2)issues.push({kind:'label-outside-owner',a:a.label,aRect:t,b:name(owner),bRect:r});}
  }
  return {controlCount:controls.length,textCount:texts.length,issues,overflow:document.documentElement.scrollWidth>innerWidth+1};
};
