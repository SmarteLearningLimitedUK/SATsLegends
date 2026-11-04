import React from 'react';

/** Board points describe the round; progression XP is shown in the reward panel. */
export default function MatchResultSummary({score}: {score?: number}) {
 return <span className="match-result-summary">
  {Number.isFinite(score)&&<strong>{Math.round(score!).toLocaleString()} board points</strong>}
  <span>3 tokens: 100%, no tips · 2 tokens: 80%+</span>
 </span>;
}
