import React from 'react';
import graph from '../../assets/reference-batch-three/reference-6.jpg';
import line from '../../assets/reference-batch-three/reference-7.jpg';
import detective from '../../assets/reference-batch-three/reference-8.jpg';
import pond from '../../assets/reference-batch-three/reference-1.jpg';
const frames={graph:{photo:graph,box:[289,174,714,314],inside:[317,211,658,255]},line:{photo:line,box:[309,211,605,367],inside:[335,238,550,312]},detective:{photo:detective,box:[296,201,576,371],inside:[319,226,527,320]}};
/** The supplied frame ornament surrounds a fresh opaque chart canvas. */
export function ReferenceChartFrame({kind}:{kind:keyof typeof frames}){
 const frame=frames[kind];return <svg className="reference-chart-ornament" viewBox={frame.box.join(' ')} preserveAspectRatio="none" aria-hidden="true" focusable="false"><image href={frame.photo} width="1280" height="720"/><rect x={frame.inside[0]} y={frame.inside[1]} width={frame.inside[2]} height={frame.inside[3]} fill="#032d3c"/>{kind==='graph'&&<rect x="473" y="183" width="309" height="24" fill="#e4ba79"/>}</svg>;
}
export function PondAvatar(){return <svg viewBox="361 17 61 53" aria-hidden="true"><image href={pond} width="1280" height="720"/></svg>;}
