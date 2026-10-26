import {useLayoutEffect,useRef,type ReactNode} from 'react';
import { Link } from 'react-router-dom';
import SplashLogo from '../../website/SplashLogo';
import './ios-account.css';

export default function IOSAccountLayout({ title, children, variant='account' }: { title: string; children: ReactNode; variant?:'account'|'learners' }) {
  const root=useRef<HTMLElement>(null);
  useLayoutEffect(()=>{
    const update=()=>root.current?.style.setProperty('--account-viewport-height',`${window.visualViewport?.height??window.innerHeight}px`);
    const viewport=window.visualViewport;
    update();viewport?.addEventListener('resize',update);window.addEventListener('resize',update);
    return()=>{viewport?.removeEventListener('resize',update);window.removeEventListener('resize',update);};
  },[]);
  return <main ref={root} className="ios-account" id="app-account-main" data-account-variant={variant}>
    <header className="ios-account-brand"><Link to="/parent" aria-label="SATs Legends account"><SplashLogo /></Link><p>Matharia</p></header>
    <section className="ios-account-content"><h1>{title}</h1>{children}</section>
  </main>;
}
