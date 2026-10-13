import React, { useId } from 'react';

export function PotionShelfBottles() {
  const id = useId().replace(/:/g, '');
  return <svg className="potion-workshop-shelves" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    {['left', 'right'].map((side, sideIndex) => <g key={side}>
      {[0, 1, 2].map(index => {
        const color = ['#65dad9', '#b296e7', '#edc274', '#e79fbc', '#a3d186', '#80b6ed'][sideIndex * 3 + index];
        const key = `${id}-${side}-${index}`;
        const positions = sideIndex === 0 ? [[85, 171], [160, 184], [240, 199]] : [[1410, 207], [1495, 191], [1580, 177]];
        const [x, floor] = positions[index];
        return <g key={index} transform={`translate(${x - 36 * .85}, ${floor - 108 * .85}) scale(.85)`}><g className="potion-shelf-bottle" style={{ '--bottle-delay': `${-index * 1.6 - sideIndex}s` } as React.CSSProperties}>
          <defs>
            <linearGradient id={`${key}-glass`}><stop stopColor="#e9fafa70"/><stop offset=".3" stopColor="#d8f1ed30"/><stop offset="1" stopColor="#071c3060"/></linearGradient>
            <linearGradient id={`${key}-liquid`} x2="0" y2="1"><stop stopColor={color}/><stop offset="1" stopColor="#1c485b"/></linearGradient>
            <clipPath id={`${key}-clip`}><path d="M27 28H45V52Q62 62 63 84Q65 104 52 108H20Q7 104 9 84Q10 62 27 52Z"/></clipPath>
          </defs>
          <path d="M27 28H45V52Q62 62 63 84Q65 104 52 108H20Q7 104 9 84Q10 62 27 52Z" fill={`url(#${key}-glass)`} stroke="#203440" strokeWidth="3"/>
          <g clipPath={`url(#${key}-clip)`}>
            <path className="potion-bottle-liquid" d="M5 75Q22 66 36 75T67 75V112H5Z" fill={`url(#${key}-liquid)`}/>
            {[0, 1, 2].map(bubble => <circle key={bubble} className="potion-bottle-bubble" cx={25 + bubble * 12} cy="98" r={2 + bubble % 2} fill="#efffff" opacity=".65" style={{ animationDelay: `${-bubble * .85 - index}s` }}/>) }
          </g>
          <path d="M27 31V49M18 76Q14 89 18 98" fill="none" stroke="#e8f8f2" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round"/>
          <path d="M24 21H48V32H24Z" fill="#baa675" stroke="#423b35" strokeWidth="2.5"/>
          <path d="M27 11Q36 8 45 11V23H27Z" fill="#b48252" stroke="#563e2c" strokeWidth="2.5"/>
          <path d="M32 15H40" stroke="#e6bd82" strokeWidth="2"/>
        </g></g>;
      })}
    </g>)}
  </svg>;
}

export function PotionWorkbench() {
  const id = useId().replace(/:/g, '');
  return <svg className="potion-workbench" viewBox="0 0 520 180" preserveAspectRatio="none" aria-hidden="true" data-potion-workbench>
    <defs>
      <linearGradient id={`${id}-top`} x2="0" y2="1"><stop stopColor="#d5a56b"/><stop offset="1" stopColor="#916039"/></linearGradient>
      <linearGradient id={`${id}-front`} x2="0" y2="1"><stop stopColor="#a46e40"/><stop offset="1" stopColor="#503225"/></linearGradient>
    </defs>
    <path d="M37 58H76L66 173H36ZM444 58H483L484 173H454Z" fill="#573b2a" stroke="#2e2927" strokeWidth="5"/>
    <path d="M66 134H454V151H65Z" fill="#63462e" stroke="#342a24" strokeWidth="4"/>
    <path d="M35 12H485L515 47H5Z" fill={`url(#${id}-top)`} stroke="#513c2e" strokeWidth="5" strokeLinejoin="round"/>
    <path d="M5 47H515V72Q260 89 5 72Z" fill={`url(#${id}-front)`} stroke="#3e2f27" strokeWidth="5" strokeLinejoin="round"/>
    <path d="M22 46H497M63 30Q173 25 250 29T470 30M40 59Q220 65 480 59" fill="none" stroke="#e5bc7c" strokeOpacity=".55" strokeWidth="3"/>
    <path d="M67 20L57 44M184 17L178 45M336 17L340 45M445 19L457 44" fill="none" stroke="#744c30" strokeWidth="2"/>
    <ellipse cx="260" cy="29" rx="111" ry="16" fill="#14313a" stroke="#638482" strokeWidth="3"/>
    <ellipse cx="260" cy="29" rx="85" ry="10" fill="#183f49"/>
    <circle cx="24" cy="59" r="4" fill="#d9b474"/><circle cx="496" cy="59" r="4" fill="#d9b474"/>
  </svg>;
}
