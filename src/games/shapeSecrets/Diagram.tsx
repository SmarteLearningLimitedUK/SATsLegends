import {useLayoutEffect,useRef,useState} from 'react';
import {secretGeometry,shapeDescription,cm,type Point,type ShapeSecretQuestion} from './engine';
/** Pixel-sized labels and exact mathematical vertices share one responsive SVG. */
export default function SecretDiagram({question:q}:{question:ShapeSecretQuestion}){
 const node=useRef<SVGSVGElement>(null),[size,setSize]=useState({w:400,h:260});
 useLayoutEffect(()=>{const element=node.current!;const fit=()=>{const b=element.getBoundingClientRect();setSize(old=>Math.abs(old.w-b.width)+Math.abs(old.h-b.height)<.5?old:{w:Math.max(1,b.width),h:Math.max(1,b.height)})};fit();const r=new ResizeObserver(fit);r.observe(element);return()=>r.disconnect()},[]);
 const model=secretGeometry(q),points=[...model.a,...model.b],minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
 const right=model.rectangle?68:16,padding=12,scale=Math.min((size.w-padding-right)/(maxX-minX),(size.h-12)/(maxY-minY)),left=padding+(size.w-padding-right-(maxX-minX)*scale)/2,top=6+(size.h-12-(maxY-minY)*scale)/2;
 const project=(p:Point)=>({x:left+(p.x-minX)*scale,y:top+(p.y-minY)*scale}),a=model.a.map(project),b=model.b.map(project),shared=model.shared.map(project),polygon=(p:Point[])=>p.map(p=>`${p.x},${p.y}`).join(' ');
 return <figure className="secret-figure"><figcaption><span><i data-shape-colour="inner"/>{shapeDescription(q.inner)}</span><span><i data-shape-colour="outer"/>{model.rectangle?'Rectangle':shapeDescription(q.outer)}</span></figcaption>
  <svg ref={node} className="secret-diagram" viewBox={`0 0 ${size.w} ${size.h}`} role="img" aria-label={`${shapeDescription(q.inner)} and ${model.rectangle?'rectangle':shapeDescription(q.outer)}. ${q.relationship} ${q.prompt}`} data-secret-diagram data-secret-kind={q.kind}>
   <polygon points={polygon(b)} fill="#133e58" stroke="#eaf8ef" strokeWidth="3" strokeLinejoin="round" data-secret-polygon="outer"/>
   <polygon points={polygon(a)} fill="#2ebee64d" stroke="#77e2f0" strokeWidth="3" strokeLinejoin="round" data-secret-polygon="inner"/>
   <path d={`M${shared[0].x} ${shared[0].y}L${shared[1].x} ${shared[1].y}`} fill="none" stroke="#ffda72" strokeWidth="5" strokeLinecap="round" data-secret-shared-side/>
   {(q.kind==='scaled-side'||model.rectangle)&&Array.from({length:q.scale+1},(_,i)=>{
    const first=model.rectangle?{x:-.5+i,y:0}:{x:-.5+i/q.scale,y:0},p=project(first);return <path key={i} d={`M${p.x} ${p.y-5}v10`} stroke="#ffda72" strokeWidth="2"/>;
   })}
   {model.rectangle&&<text x={b[1].x+8} y={(b[1].y+b[2].y)/2} dominantBaseline="middle" fill="#fff8df" fontSize="14" data-secret-height-label>{cm(q.heightCenti)} cm</text>}
  </svg>
  <span className="secret-diagram-note">Gold marks the shared length · Not to scale</span>
 </figure>;
}
