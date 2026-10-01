/** Small illustrated encounters sit in the open water, behind island targets. */
export default function MapSeaLife() {
  return <g className="legend-map-sea-life" stroke="#17394e" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
    {[{x:635,y:705,s:.75},{x:95,y:980,s:.7},{x:230,y:1535,s:.55},{x:650,y:2180,s:.75},{x:110,y:2070,s:.6}].map(({x,y,s},i)=><g key={`islet-${i}`} transform={`translate(${x} ${y}) scale(${s})`} data-sea-detail="palm-islet">
      <ellipse className="sea-wake" cx="32" cy="49" rx="59" ry="17" fill="none" stroke="#b3e8d4" />
      <path d="M-13 42Q4 19 31 22Q68 17 83 44L70 59L11 62Z" fill="#9b7650" />
      <ellipse cx="33" cy="37" rx="48" ry="20" fill="#ebce82" stroke="#b89a63" />
      <path d="M30 33Q46 0 34 -32" fill="none" stroke="#826041" strokeWidth="9" />
      <g className="sea-palm-fronds">
        <path d="M35 -29Q10 -61 -12 -32Q13 -42 35 -29Q9 -29 2 -9Q18 -23 35 -29Q51 -62 74 -44Q49 -41 35 -29Q68 -40 86 -13Q58 -27 35 -29Q45 -9 65 -2Q53 -32 35 -29Z" fill="#428b64" stroke="#235f50" />
      </g>
      <path d="M-3 41Q19 30 29 42" fill="none" stroke="#f7e3a2" strokeWidth="3" />
    </g>)}
    {[{x:80,y:325},{x:590,y:1550}].map(({x,y},i)=><g key={i} transform={`translate(${x} ${y})`} data-sea-creature="leviathan">
      <ellipse className="sea-wake" cx="62" cy="48" rx="76" ry="16" fill="none" stroke="#8bd2d1" />
      <g className="sea-swimmer" opacity=".58" style={{animationDelay:`${i*-4}s`}}>
        <path d="M-10 49Q25 15 73 28L85 11L89 31Q115 39 120 49L151 23L146 51L164 67L119 58Q85 82 45 65L11 82L26 59Z" fill="#16475d" stroke="#327e8a" />
        <path d="M10 46Q53 28 98 47M34 56L85 61" fill="none" stroke="#6cb1b6" strokeWidth="2" />
        <path d="M49 57L41 74L75 61" fill="#123e54" stroke="#286c7a" />
        <ellipse cx="8" cy="49" rx="2.5" ry="1.2" fill="#8edbd0" stroke="none" />
      </g>
    </g>)}
    <g transform="translate(510 1040)" data-sea-creature="ray">
      <ellipse className="sea-wake" cx="48" cy="45" rx="61" ry="26" fill="none" stroke="#8bd2d1" />
      <g className="sea-turtle" opacity=".64">
        <path d="M49 17Q34 33 -10 11Q3 54 35 63L49 83L62 62Q100 56 114 10Q73 33 49 17Z" fill="#164e64" stroke="#3b8592" />
        <path d="M49 26L49 70Q65 106 47 131" fill="none" stroke="#164e64" strokeWidth="5" />
        <path d="M10 29Q28 50 43 46M97 28Q80 50 58 46" fill="none" stroke="#73bfc0" strokeWidth="2" />
        <path d="M43 31L46 31M53 31L56 31" stroke="#8edbd0" strokeWidth="2" />
      </g>
    </g>
    <g transform="translate(110 1350)" data-sea-detail="shipwreck">
      <g className="sea-wreck">
        <ellipse cx="60" cy="80" rx="78" ry="27" fill="#176480" opacity=".45" stroke="none" />
        <path d="M-1 37L34 48L48 30L58 52L120 31L101 76L37 89L9 68Z" fill="#9a6545" />
        <path d="M13 56L107 49M24 72L101 65M55 45L49 81" fill="none" stroke="#563f36" />
        <path d="M62 49L48 -17" stroke="#61493a" strokeWidth="7" />
        <path d="M49 -12L80 5L68 13L88 29L59 30Z" fill="#e9d9b1" />
        <path d="M4 91Q16 73 11 52M115 88Q102 69 115 56" fill="none" stroke="#5dccab" strokeWidth="6" />
      </g>
      {[0,1,2].map(i=><circle key={i} className="sea-bubble" cx={35+i*25} cy={30-i*13} r={4+i} fill="none" stroke="#baf7f3" style={{animationDelay:`${i*-1.4}s`}} />)}
    </g>
  </g>;
}
