import {ArrowRight} from 'lucide-react';
import SplashLogo from '../website/SplashLogo';
import portrait from '../assets/production-entry/welcome-portrait.webp';
import landscape from '../assets/production-entry/welcome-landscape.webp';
import '../design/production-entry.css';

/** A purpose-composed opening scene. Account and gameplay transitions remain with AppRouter. */
export default function AdventureWelcome({playerName,onStart}:{playerName:string;onStart:()=>void}){
  const returning=Boolean(playerName.trim());
  return <section className="production-welcome" aria-label="SATs Legends welcome">
    <picture className="production-welcome-scene" aria-hidden="true">
      <source media="(orientation:landscape)" srcSet={landscape}/>
      <img src={portrait} alt="" draggable={false} fetchPriority="high"/>
    </picture>
    <header className="production-welcome-brand">
      <h1 className="sr-only">SATs Legends</h1>
      <SplashLogo/>
      <p>Matharia</p>
    </header>
    <span className="production-welcome-mote" aria-hidden="true"/>
    <div className="production-welcome-action">
      <p>{returning?`Welcome back, ${playerName}.`:'Big adventures. Brilliant minds.'}</p>
      <button type="button" onClick={onStart} aria-label="Start" data-button-skin="none">
        {returning?'Continue adventure':'Start adventure'}<ArrowRight aria-hidden="true"/>
      </button>
    </div>
  </section>;
}
