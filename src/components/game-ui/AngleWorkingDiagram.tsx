/** Shows the supplied angle exactly. Reasoning tasks use an explicitly
 * unscaled unknown-angle sketch, without calculating or revealing the answer. */
export default function AngleWorkingDiagram({prompt,visible}:{prompt:string;visible:boolean}) {
 const known=prompt.match(/^One angle on a straight line is (\d+)°/);
 if(!visible)return null;
 const angle=(known?Number(known[1]):60)*Math.PI/180,cx=180,cy=170,radius=105;
 const point=(r:number,a:number)=>[cx+Math.cos(a)*r,cy-Math.sin(a)*r];
 const [rx,ry]=point(radius*1.2,angle),[ax,ay]=point(radius*.62,angle),[bx,by]=point(radius*.8,angle);
 const [lx,ly]=point(radius*.97,angle/2),[mx,my]=point(radius*1.04,(Math.PI+angle)/2);
 return <figure className="angle-working-board" aria-label={known?`Straight line with one supplied angle of ${known[1]} degrees and one unknown angle`:'Two adjacent unknown angles on a straight line. Diagram not to scale.'}>
  <svg viewBox="0 0 360 220" role="img" aria-label="Angle diagram">
   <path d={`M${cx-radius*1.2} ${cy}H${cx+radius*1.2}M${cx} ${cy}L${rx} ${ry}`} fill="none" stroke="#effbff" strokeWidth="4" strokeLinecap="round"/>
   <path d={`M${ax} ${ay}A${radius*.62} ${radius*.62} 0 0 1 ${cx+radius*.62} ${cy}`} fill="none" stroke="#8cecff" strokeWidth="3"/>
   <path d={`M${cx-radius*.8} ${cy}A${radius*.8} ${radius*.8} 0 0 1 ${bx} ${by}`} fill="none" stroke="#f3d58a" strokeWidth="3"/>
   <circle cx={cx} cy={cy} r="4" fill="#fff6de"/>
   <text x={lx} y={ly} fill="#8cecff">{known?`${known[1]}°`:'a'}</text><text x={mx} y={my} fill="#ffe29b">{known?'?':'b'}</text>
   {!known&&<text className="angle-not-to-scale" x="180" y="206" fill="#d3e6dc">Not to scale</text>}
  </svg>
 </figure>;
}
