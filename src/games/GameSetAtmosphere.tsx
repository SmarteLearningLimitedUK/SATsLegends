import React,{useId} from 'react';
import {GameSet} from './gameStaging';
/** Peripheral equipment builds a setting without competing with questions or controls. */
export default function GameSetAtmosphere({set}:{set:GameSet}){
 const id=useId().replace(/:/g,'');
 return <div className={`game-set-atmosphere game-set-atmosphere-${set.material}`} aria-hidden="true" data-stage-atmosphere={set.material}>
 {[false,true].map(right=>{const brass=`url(#${id}-${right}-brass)`;return <svg key={String(right)} className={right?'set-prop-right':'set-prop-left'} viewBox="0 0 150 240">
  <defs><linearGradient id={`${id}-${right}-brass`} x2="0" y2="1"><stop stopColor="#f0d18c"/><stop offset="1" stopColor="#6c4c31"/></linearGradient></defs>
  <ellipse cx="75" cy="222" rx="65" ry="12" fill="#041a28" opacity=".4"/>
  {(set.material==='bench'||set.material==='archive')&&<g>
   <path d="M18 151H132V209H18Z" fill="#694d36" stroke="#243143" strokeWidth="4"/><path d="M25 163H124M25 193H124" stroke="#ac8656" strokeWidth="3"/>
   {[0,1,2].map(i=><g key={i}><rect x={26+i*8} y={132-i*19} width={91-i*10} height="18" rx="4" fill={['#284d66','#855947','#36666a'][i]} stroke="#09263c" strokeWidth="3"/><path d={`M${40+i*8} ${142-i*19}H${105-i*2}`} stroke="#ddc78d" strokeWidth="4"/></g>)}
   <path d="M52 113L56 61Q82 47 108 61L105 108Z" fill="#e4d4ab" stroke="#71573a" strokeWidth="3"/><path d="M61 72q18 -9 37 0m-37 12h30m-30 12h24" fill="none" stroke="#5b8190" strokeWidth="3"/>
  </g>}
  {set.material==='stone'&&<g>
   <path d="M31 214L37 114H112L119 214Z" fill="#506e7c" stroke="#223849" strokeWidth="5"/><path d="M36 130H113M35 186H116M75 132V185" stroke="#a7bfc4" strokeWidth="3"/>
   <path d="M23 108H127L119 128H31Z" fill="#7c9293" stroke="#233b4d" strokeWidth="4"/>
   <path d="M37 108Q17 74 49 60Q43 45 67 32Q61 70 89 62Q107 74 108 108Z" fill="#ffcf71" stroke="#a15a39" strokeWidth="3" className="game-set-flame"/>
   <path d="M52 109Q38 87 65 72Q59 94 90 98L91 110Z" fill="#fff1b0"/>
  </g>}
  {set.material==='instrument'&&<g>
   <path d="M73 113L29 221M76 113L122 221M76 113V222" stroke="#b8a77d" strokeWidth="8"/>
   <g transform="rotate(-25 75 90)"><path d="M19 66H118V106H19Z" fill="#284f67" stroke="#172f42" strokeWidth="4"/><ellipse cx="118" cy="86" rx="13" ry="23" fill={brass}/><ellipse cx="120" cy="86" rx="8" ry="16" fill="#a5e9ed"/><path d="M34 67V104M99 67V104" stroke="#e3c47a" strokeWidth="9"/></g><circle cx="77" cy="120" r="11" fill={brass}/>
  </g>}
  {set.material==='gallery'&&<g>
   <path d="M28 205H122V222H28Z M44 62H106V205H44Z M26 46H124V68H26Z" fill="#648497" stroke="#233c52" strokeWidth="5"/>
   <path d="M57 80V191M77 80V191M96 80V191" stroke="#b3cbd1" strokeWidth="4"/>
   <path d="M51 40L75 11 101 40Z" fill={set.accent} stroke="#476273" strokeWidth="4" className="game-set-signal"/>
  </g>}
  {(set.material==='reactor'||set.material==='mine')&&<g>
   <path d="M31 52H119V201H31Z" fill="#244c61" stroke="#132e45" strokeWidth="5"/><path d="M37 66H113V184H37Z" fill="#0d3545" stroke={brass} strokeWidth="7"/>
   <path d="M48 174V101H102V174Z" fill={set.accent} opacity=".5"/>
   {[73,108,146,182].map(y=><path key={y} d={`M23 ${y}h104`} stroke="#d2b97c" strokeWidth="7"/>)}
   {[0,1,2].map(i=><circle key={i} cx={63+i*12} cy={156-i*23} r={5+i} fill="#d6ffed" className="game-set-signal" style={{animationDelay:`${i*.9}s`}}/>)}
   <path d="M20 201H131L127 219H24Z" fill="#374c5b" stroke="#193247" strokeWidth="5"/>
  </g>}
  {set.material==='dock'&&<g>
   {[0,1].map(i=><g key={i} transform={`translate(${i*13} ${-i*51})`}><path d="M23 159H115V213H23Z" fill="#9b734a" stroke="#30414a" strokeWidth="4"/><path d="M30 168H109M30 204H109M35 168L104 204M104 168L35 204" stroke="#dcba7c" strokeWidth="5"/></g>)}
   <circle cx="78" cy="101" r="22" fill="#dc9861" stroke="#5c5b48" strokeWidth="5"/><circle cx="78" cy="101" r="12" fill="#164a5c"/>
  </g>}
 </svg>;})}
 </div>;
}
