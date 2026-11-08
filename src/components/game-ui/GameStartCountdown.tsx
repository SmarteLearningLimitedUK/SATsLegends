import React from 'react';
import './game-start-countdown.css';

export default function GameStartCountdown({value}:{value:number|null}){
 if(value===null)return null;
 return <div className="game-start-countdown" data-game-start-countdown={value} role="status" aria-live="assertive" aria-atomic="true">
  <span className="game-start-countdown-label">Get ready</span>
  <strong>{value}</strong>
 </div>;
}
