const fs=require('node:fs');
const postcss=require('postcss');
const path='variants/matharia/src/screens/match-scene.css';
const tree=postcss.parse(fs.readFileSync(path,'utf8'));
const prefix="html[data-presentation='matharia'] #root .screen-gameplay[data-active-game='match3_equivalence']";
const shared=prefix.replace("[data-active-game='match3_equivalence']",":is([data-active-game='match3_equivalence'],[data-active-game='prime_pop'])");
const common=postcss.root(),specific=postcss.root();
for(const node of tree.nodes){
 if(node.type==='comment')continue;
 if(node.type==='rule'&&node.selector===prefix){
  const c=node.clone({nodes:[]}),m=node.clone({nodes:[]});c.selector=shared;
  for(const child of node.nodes){
   const matchOnly=child.type==='rule'&&(child.selector.includes('.match')||child.selector.startsWith('.concept-hero'));
   if(child.type==='decl'&&['--match-ui-scale','--match-panel','--match-hud'].includes(child.prop))continue;
   (matchOnly?m:c).append(child.clone());
  }
  if(c.nodes.length)common.append(c);
  if(m.nodes.length)specific.append(m);
 }else if(node.type==='atrule'){
  specific.append(node.clone());
 }else{
  const c=node.clone();if(c.selector)c.selector=c.selector.split(prefix).join(shared);common.append(c);
 }
}
fs.writeFileSync('variants/matharia/src/measured-game-shell.css','/* Shared portrait scene and HUD regions; each activity owns its playfield. */\n'+common.toString().split('--match-plane').join('--concept-plane'));
fs.writeFileSync(path,'/* Match Mastery: measured 6 × 5 board, guide and status regions. */\n'+specific.toString().split('--match-plane').join('--concept-plane'));
