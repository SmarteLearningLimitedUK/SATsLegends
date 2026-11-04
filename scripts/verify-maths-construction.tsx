import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SatsConstructionControl from '../src/components/game-ui/SatsConstructionControl';
import {reasoningMissions,markMission} from '../src/systems/content/satsAdventure';
const mission=reasoningMissions().find(q=>q.id==='draw-rectangle')!;
let value='';
function nodes(node:React.ReactNode):React.ReactElement<any>[] {
 if(!React.isValidElement(node))return [];
 return [node,...React.Children.toArray((node.props as any).children).flatMap(nodes)];
}
function control(){return SatsConstructionControl({mission,value,onChange:next=>{value=next;}});}
for(const initial of ['', 'rect:4:4:2','rect:6:3:2']){
 value=initial;const tree=control(),markup=renderToStaticMarkup(tree);
 assert(markup.includes('4 right angles'),'Every depicted rectangle has four right angles');
 assert(!markup.includes('2 right angles'),'A rectangle must never be described with two right angles');
 assert(!nodes(tree).some(n=>n.type==='button'&&String(n.props.children).includes('right angles')),'Right-angle count is a property, not a toggle');
}
value='';
for(let i=0;i<2;i++)nodes(control()).find(n=>n.props['aria-label']==='Increase long side')!.props.onClick();
assert.equal(value,mission.fields[0].answer);assert.equal(markMission(mission,[value]),1);
nodes(control()).find(n=>n.props['aria-label']==='Decrease short side')!.props.onClick();assert.equal(markMission(mission,[value]),0);
console.log('PASS: rectangle geometry, migrated state, resizing, correct construction and rejected wrong dimensions');
