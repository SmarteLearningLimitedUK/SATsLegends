import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import Revision from './Revision';
import Videos from './Videos';
import Account, { AuthCallback } from './ParentAccount';
import Subscriptions from './Subscriptions';
import { useFamily } from './FamilyAccount';
import { AdventureBackdrop } from './AdventureArtwork';
import SplashLogo from './SplashLogo';
import EnglishLanding from './EnglishLanding';
import Home from './HomePage';

const ParentArea = lazy(() => import('./ParentArea'));
const ForParents = lazy(() => import('./ForParents'));
const ChildProgressPage = lazy(() => import('./ParentArea').then(module => ({ default: module.ChildProgressPage })));
const AdminDashboard = lazy(() => import('./AdminDashboard'));

export function Brand({ small = false }: { small?: boolean }) {
  return <Link to="/" className={`website-brand ${small ? 'website-brand-small' : ''}`} aria-label="SATs Legends home">
    <SplashLogo />
  </Link>;
}

export default function Website() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const family = useFamily();
  const [accountError, setAccountError] = useState('');
  const logout = () => { setAccountError(''); void family.signOut().catch(error => setAccountError(error.message)); };
  const { pathname } = useLocation();
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener('keydown', closeWithEscape);
    return () => document.removeEventListener('keydown', closeWithEscape);
  }, [menuOpen]);
  useEffect(() => {
    const page = pathname.startsWith('/parent/progress') ? 'Child progress' : pathname.startsWith('/parent') ? 'Parent account' : pathname === '/admin' ? 'Admin' : pathname === '/for-parents' ? 'For parents' : pathname === '/english' ? 'Lexcoria' : pathname === '/subscriptions' ? 'Subscriptions' : pathname === '/revision' ? 'Revision Guide' : pathname === '/videos' ? 'Videos' : pathname === '/signup' ? 'Sign up' : pathname === '/login' ? 'Log in' : pathname.includes('password') ? 'Reset password' : 'KS2 SATs revision';
    document.title = `SATs Legends · ${page}`;
  }, [pathname]);

  return <div className={`legends-website${pathname === "/" ? " homepage-refresh" : ""}`}>
    {pathname !== "/" && <AdventureBackdrop />}
    <a className="website-skip-link" href="#website-main">Skip to content</a>
    <header className="website-header"><div className="website-container website-header-inner">
      <Brand />
      <nav className="website-desktop-nav" aria-label="Main navigation"><NavLink to="/" end>Home</NavLink><Link to="/play">Matharia</Link><NavLink to="/english">Lexcoria</NavLink><NavLink to="/subscriptions">Subscriptions</NavLink><NavLink to="/for-parents">For parents</NavLink><NavLink to="/revision">Revision guide</NavLink><NavLink to="/videos">Videos</NavLink></nav>
      <div className="website-header-actions">{family.session ? <>{family.isAdmin && <Link className="website-login" to="/admin">Admin</Link>}<Link className="website-button website-button-gold website-button-small" to="/parent">Parent account</Link><button className="website-login" onClick={logout}>Log out</button></> : <><Link to="/login" className="website-login">Log in</Link><Link className="website-button website-button-gold website-button-small" to="/signup">Sign up <ArrowRight size={16} /></Link></>}
      <button ref={menuButton} className="website-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="website-mobile-nav" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button></div>
    </div>{menuOpen && <nav id="website-mobile-nav" className="website-mobile-nav" aria-label="Mobile navigation"><NavLink to="/" end>Home</NavLink><Link to="/play">Matharia</Link><NavLink to="/english">Lexcoria</NavLink><NavLink to="/subscriptions">Subscriptions</NavLink><NavLink to="/for-parents">For parents</NavLink><NavLink to="/revision">Revision guide</NavLink><NavLink to="/videos">Videos</NavLink>{family.session ? <>{family.isAdmin && <Link to="/admin">Admin</Link>}<Link to="/parent">Parent account</Link><button onClick={logout}>Log out</button></> : <><Link to="/login">Log in</Link><Link to="/signup">Sign up</Link></>}</nav>}</header>
    {accountError && <p className="family-error website-container" role="alert">{accountError}</p>}
<Suspense fallback={<main id="website-main" className="website-container family-main"><p role="status">Loading…</p></main>}><Routes><Route path="/" element={<Home />} /><Route path="/english" element={<EnglishLanding />} /><Route path="/revision" element={<Revision />} /><Route path="/videos" element={<Videos />} /><Route path="/signup" element={<Account mode="signup" />} /><Route path="/login" element={<Account mode="login" />} /><Route path="/forgot-password" element={<Account mode="forgot" />} /><Route path="/reset-password" element={<Account mode="reset" />} /><Route path="/auth/callback" element={<AuthCallback />} /><Route path="/subscriptions" element={<Subscriptions />} /><Route path="/for-parents" element={<ForParents />} /><Route path="/parent" element={<ParentArea />} /><Route path="/parent/progress/:childId" element={<ChildProgressPage />} /><Route path="/admin" element={<AdminDashboard />} /></Routes></Suspense>
    <footer className="website-footer"><div className="website-container website-footer-top"><Brand small /><p>Big challenges. Brilliant minds.</p><nav aria-label="Footer navigation"><Link to="/for-parents">For parents</Link><Link to="/play">Matharia</Link><Link to="/english">Lexcoria</Link><Link to="/revision">Revision guide</Link><Link to="/videos">Videos</Link></nav></div><div className="website-container website-footer-bottom"><span>© {new Date().getFullYear()} SATs Legends</span><span>Made for curious minds.</span></div></footer>
  </div>;
}
