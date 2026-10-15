import React, {useId} from 'react';
interface Props {mode:string;scanning:boolean;repaired:boolean;fault:boolean;paused:boolean;}
export default function MeanPowerEngine({mode,scanning,repaired,fault,paused}:Props){
 const id=useId().replace(/:/g,'');
 return <svg className="mean-power-engine" viewBox="0 0 400 500" aria-hidden="true" data-scanning={scanning} data-repaired={repaired} data-fault={fault} data-paused={paused}>
  <defs>
   <linearGradient id={`${id}-metal`} x2="1" y2="1"><stop stopColor="#d2e7e9"/><stop offset=".3" stopColor="#417d92"/><stop offset=".7" stopColor="#1c405c"/><stop offset="1" stopColor="#6498a7"/></linearGradient>
   <linearGradient id={`${id}-brass`} x2="0" y2="1"><stop stopColor="#ffdf91"/><stop offset=".35" stopColor="#d3a448"/><stop offset="1" stopColor="#785124"/></linearGradient>
   <linearGradient id={`${id}-glass`}><stop stopColor="#092f4d"/><stop offset=".5" stopColor="#33a7b0"/><stop offset="1" stopColor="#0b354d"/></linearGradient>
  </defs>
  <ellipse cx="200" cy="479" rx="182" ry="17" fill="#071a2b" opacity=".35"/>
  <path d="M40 444 L28 476 Q200 492 372 476 L360 444Z" fill="#243c4c" stroke="#091d30" strokeWidth="5"/>
  <path d="M40 444 Q200 425 360 444 L372 458 Q200 478 28 458Z" fill="#84a1a5" stroke="#203c4e" strokeWidth="4"/>
  <path d="M98 422 L90 447 M298 422 L306 447" stroke="#142d43" strokeWidth="20"/>
  <path d="M74 159H45V117H84 M324 159H355V117H314" fill="none" stroke="#253546" strokeWidth="20"/>
  <path d="M74 159H45V117H84 M324 159H355V117H314" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="12"/>
  {[45,355].map((x,i)=><g key={x}>
   <rect x={x-14} y="155" width="28" height="178" rx="12" fill={`url(#${id}-glass)`} stroke="#d8be74" strokeWidth="4"/>
   {[0,1,2].map(n=><circle key={n} className="mean-coil-bubble" cx={x} cy={315-n*45} r={4+n} fill="#9affdf" style={{animationDelay:`${i*.4+n*.7}s`}}/>)}
   <path d={`M${x-19} 178h38 m-38 35h38 m-38 35h38 m-38 35h38 m-38 35h38`} stroke="#d9af5d" strokeWidth="7"/>
  </g>)}
  <path d="M84 400H52Q28 400 28 364V338 M316 400H348Q372 400 372 364V338" fill="none" stroke="#102b3c" strokeWidth="12"/>
  <path d="M84 400H52Q28 400 28 364V338 M316 400H348Q372 400 372 364V338" fill="none" stroke="#53c8c3" strokeWidth="4" className="mean-power-cable"/>
  <rect x="70" y="136" width="260" height="299" rx="34" fill={`url(#${id}-metal)`} stroke="#09283b" strokeWidth="7"/>
  <rect x="78" y="148" width="244" height="273" rx="27" fill="none" stroke="#badade" strokeWidth="3" opacity=".6"/>
  <path d="M94 177V91Q200 40 306 91V177Z" fill={`url(#${id}-brass)`} stroke="#143246" strokeWidth="6"/>
  <rect x="109" y="143" width="183" height="35" rx="10" fill="#112e48" stroke="#e6c67a" strokeWidth="2"/>
  <text x="200" y="167" textAnchor="middle" fill="#fff2c5" fontSize="25" fontWeight="750" fontFamily="var(--font-fredoka)">{mode.toUpperCase()}</text>
  <circle cx="200" cy="104" r="30" fill="#0b2a42" stroke="#f2d28a" strokeWidth="5"/>
  <circle cx="200" cy="104" r="21" fill={fault?'#c45365':'#4baeb4'} className="mean-core-light"/>
  <path d="M200 84l-12 23h12l-4 17 18-26h-13l5-14z" fill="#fff2b8"/>
  <rect x="87" y="188" width="213" height="156" rx="13" fill="#061d31" stroke="#e8c77b" strokeWidth="6"/>
  <rect x="91" y="193" width="205" height="146" rx="9" fill="#0a2439"/>
  <rect className="mean-scan-beam" x="92" y="195" width="203" height="4" rx="2" fill="#afffe5"/>
  {[99,299].map(x=><g key={x} className="mean-engine-fan" style={{transformOrigin:`${x}px 369px`}}>
   <circle cx={x} cy="369" r="21" fill="#0b2b42" stroke="#d6b267" strokeWidth="4"/>
   {[0,90,180,270].map(a=><path key={a} d={`M${x} 369q-6 -16 6 -16l3 12z`} transform={`rotate(${a} ${x} 369)`} fill="#76c2c6"/>)}
   <circle cx={x} cy="369" r="5" fill="#f3d395"/>
  </g>)}
  <rect x="126" y="356" width="142" height="24" rx="8" fill="#0d283c" stroke="#7aaab2" strokeWidth="2"/>
  {[0,1,2,3,4,5].map(i=><rect key={i} className="mean-status-light" x={133+i*22} y="363" width="15" height="10" rx="3" fill={fault?'#fc9290':repaired?'#87ffd1':'#68c6d8'} style={{animationDelay:`${i*.3}s`}}/>)}
  <rect x="123" y="391" width="132" height="47" rx="13" fill={`url(#${id}-brass)`} stroke="#13324b" strokeWidth="4"/>
  <rect x="129" y="397" width="120" height="35" rx="9" fill="#174b68"/>
  {[88,312].flatMap(x=>[164,406].map(y=><circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#dfe4c5" stroke="#203c4c" strokeWidth="2"/>))}
 </svg>;
}
