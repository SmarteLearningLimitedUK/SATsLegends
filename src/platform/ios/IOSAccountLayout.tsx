import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import SplashLogo from '../../website/SplashLogo';
import './ios-account.css';

export default function IOSAccountLayout({ title, children, variant='account' }: { title: string; children: ReactNode; variant?:'account'|'learners' }) {
  return <main className="ios-account" id="app-account-main" data-account-variant={variant}>
    <header className="ios-account-brand"><Link to="/parent" aria-label="SATs Legends account"><SplashLogo /></Link><p>Matharia</p></header>
    <section className="ios-account-content"><h1>{title}</h1>{children}</section>
  </main>;
}
