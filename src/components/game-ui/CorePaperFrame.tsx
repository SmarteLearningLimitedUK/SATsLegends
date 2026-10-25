interface Props {
  paper: number;
  title: string;
  charged: number;
}

/** Shared Core materials, with a different instrument silhouette for each paper. */
export default function CorePaperFrame({ paper, title, charged }: Props) {
  const outline = paper === 1
    ? 'M48 16H712L744 48V312L712 344H48L16 312V48Z'
    : paper === 2
      ? 'M28 76Q28 16 88 16H672Q732 16 732 76V284Q732 344 672 344H88Q28 344 28 284Z'
      : 'M16 44L44 16H716L744 44V316L716 344H44L16 316Z';
  return <>
    <span className="core-paper-inscription">Paper {paper} · {title}</span>
    <svg className="core-mission-frame" viewBox="0 0 760 360" preserveAspectRatio="none" aria-hidden="true">
      <path className="core-frame-metal" d={outline} fill="none" strokeWidth="3" />
      {paper === 1 ? <g className="core-frame-detail" fill="none" strokeWidth="2">
        <path d="M62 30H698M62 330H698M30 66V294M730 66V294" />
        <path d="M52 24V36M90 24V36M128 24V36M632 324V336M670 324V336M708 324V336" />
      </g> : paper === 2 ? <g className="core-frame-detail" fill="none" strokeWidth="2">
        <path d="M46 92Q46 36 102 36H658Q714 36 714 92M46 268Q46 324 102 324H658Q714 324 714 268" />
        <path d="M28 110L46 128L28 146M732 110L714 128L732 146M28 214L46 232L28 250M732 214L714 232L732 250" />
      </g> : <g className="core-frame-detail" fill="none" strokeWidth="2">
        <path d="M54 30H706M54 330H706M30 54V306M730 54V306" />
        {[80, 120, 160, 600, 640, 680].map(x => <path key={x} d={`M${x} 16V42M${x} 318V344`} />)}
      </g>}
      {[0, 1, 2, 3, 4, 5].map(i => <path key={i} className={`core-frame-crystal${charged > i / 6 ? ' is-charged' : ''}`}
        d={`M${i < 3 ? 16 : 728} ${88 + i % 3 * 92}l8 -12 8 12 -8 12Z`} strokeWidth="2" />)}
    </svg>
  </>;
}
