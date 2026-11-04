import React, {useId} from 'react';

/** A live, independent vector object. Its air and inflation follow the original choices. */
export default function ThoughtBalloon({selected,balanced,finished}:{selected:string[];balanced:string|null;finished:boolean}) {
 const id=useId(),fill=Math.round(((selected.length?35:0)+(balanced?40:0))/75*100);
 const body='M150 12C77 12 27 64 27 130c0 64 42 112 105 143l18 16 18-16c63-31 105-79 105-143C273 64 223 12 150 12Z';
 return <div className="thought-balloon" data-balloon-fill={fill} data-balloon-released={finished} role="img" aria-label={`Balloon${selected.length?` holding ${selected.join(' and ')}`:', ready to fill'}${fill===100?'. Ready to release.':''}`}>
  <div className="thought-balloon-float"><div className="thought-balloon-inflate" style={{scale:String(.9+fill/100*.1)}}>
   <svg className="balloon-shape" viewBox="0 0 300 320" aria-hidden="true">
    <defs>
     <radialGradient id={`${id}-silk`} cx="30%" cy="22%" r="85%"><stop stopColor="#b7f9f3"/><stop offset=".35" stopColor="#28a6b3"/><stop offset=".75" stopColor="#07556f"/><stop offset="1" stopColor="#04344e"/></radialGradient>
     <linearGradient id={`${id}-air`} x1="0" y1="0" x2="0" y2="1"><stop offset={Math.max(0,100-fill-12)+'%'} stopColor="#ffe4a2" stopOpacity="0"/><stop offset={Math.min(100,100-fill+12)+'%'} stopColor="#87fff0" stopOpacity={fill?'.65':'0'}/><stop offset="1" stopColor="#fff0b3" stopOpacity={fill?'.9':'0'}/></linearGradient>
     <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0b0"/><stop offset=".45" stopColor="#dcad4a"/><stop offset=".7" stopColor="#fff3bf"/><stop offset="1" stopColor="#ae7327"/></linearGradient>
    </defs>
    <path d={body} fill={`url(#${id}-silk)`} stroke={`url(#${id}-gold)`} strokeWidth="3"/>
    <path d={body} fill={`url(#${id}-air)`}/>
    <path d="M62 133C52 84 81 46 119 34" fill="none" stroke="#edfffa" strokeWidth="13" strokeLinecap="round" opacity=".37"/>
    <path d="M232 119c4 55-24 103-64 132" fill="none" stroke="#012f49" strokeWidth="6" opacity=".2"/>
    <path d="m144 284-8 14q14-4 28 0l-8-14" fill={`url(#${id}-gold)`}/>
    <path d="M150 297c-10 7 12 12 1 22" fill="none" stroke="#fff0c0" strokeWidth="2" strokeLinecap="round"/>
    <path d="m142 279 8 8 8-8" fill="#fff4c3" opacity=".9"/>
   </svg>
   <div className="thought-balloon-label" aria-hidden="true">{selected.length?selected.map(word=><span key={word}>{word}</span>):<span>Your feelings</span>}</div>
  </div></div>
 </div>;
}
