import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './ios-account.css';

export default function IOSAccountLayout({ title, children }: { title: string; children: ReactNode }) {
  return <main className="ios-account" id="app-account-main">
    <header className="ios-account-brand"><Link to="/parent" aria-label="SATs Legends account">SATs <span>Legends</span></Link><p>Matharia</p></header>
    <section className="ios-account-content"><h1>{title}</h1>{children}</section>
  </main>;
}
