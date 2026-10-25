import assert from 'node:assert/strict';
export function assertShipmentRound(q){
 const value=name=>{const b=q.bars.find(b=>b.label===name.trim());assert(b,`Unknown boat ${name}`);return b.value;},total=q.bars.reduce((n,b)=>n+b.value,0),p=q.prompt;let answer,m;
 if(m=p.match(/^Which boat delivered the (most|fewest) crates\?$/)){const t=(m[1]==='most'?Math.max:Math.min)(...q.bars.map(b=>b.value));answer=q.bars.find(b=>b.value===t).label;}
 else if(m=p.match(/^How many crates did (.+) deliver\?$/))answer=value(m[1]);
 else if(m=p.match(/^How many more crates did (.+) deliver together than (.+) together\?$/)){const group=s=>s.split(' and ').reduce((n,name)=>n+value(name),0);answer=group(m[1])-group(m[2]);}
 else if(m=p.match(/^How many more crates did (.+) deliver than (.+)\?$/))answer=value(m[1])-value(m[2]);
 else if(p.includes('all four boats'))answer=total;
 else if(m=p.match(/^How many crates did (.+) and (.+) deliver altogether\?$/))answer=value(m[1])+value(m[2]);
 else if(m=p.match(/^The harbour needs (\d+) crates\./))answer=+m[1]-total;
 else assert.fail('Unrecognised shipment question: '+p);
 const correct=q.options.filter(o=>o.label===String(answer));assert.equal(correct.length,1,p);assert.deepEqual([...q.correctAnswers],[correct[0].id]);assert.equal(new Set(q.options.map(o=>o.label)).size,q.options.length);return answer;
}
export function assertLineRound(q){
 let answer;const p=q.question;
 if(q.plotIndex!==undefined)answer=String((q.graph[q.plotIndex-1].value+q.graph[q.plotIndex+1].value)/2);
 else if(q.highlightIndex!==undefined)answer=`(${q.graph[q.highlightIndex].label}, ${q.graph[q.highlightIndex].value})`;
 else if(p.startsWith('What is the water temperature after')){const t=p.match(/after (\d+)/)[1];answer=String(q.graph.find(p=>p.label===t).value);}
 else if(p.startsWith('After how many')){const n=+p.match(/temperature (\d+)/)[1],points=q.graph.filter(x=>x.value===n);assert.equal(points.length,1);answer=points[0].label;}
 else if(p.includes('halfway between')||p.includes('By how many')){const n=[...p.matchAll(/\d+/g)].map(m=>+m[0]),a=q.graph.find(p=>+p.label===n[0]).value,b=q.graph.find(p=>+p.label===n[1]).value;answer=String(p.includes('halfway')?(a+b)/2:Math.abs(a-b));}
 else{const d=q.graph.slice(1).map((p,i)=>p.value-q.graph[i].value),max=Math.max(...d);assert.equal(d.filter(v=>v===max).length,1);const i=d.indexOf(max);answer=`${q.graph[i].label} to ${q.graph[i+1].label}`;}
 assert.equal(q.correctAnswer,answer,p);assert.equal(q.options.filter(x=>x===answer).length,1);return answer;
}
