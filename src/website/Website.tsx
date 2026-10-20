import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, ChevronRight, Gamepad2, Menu, Play, Sparkles, Star, X } from 'lucide-react';
import PremiumArtwork from './PremiumArtwork';
import numberArt from '../assets/website/premium/place_value_panic-world.webp';
import fractionArt from '../assets/website/premium/fraction_forge-world.webp';
import angleArt from '../assets/website/premium/angle_arena-world.webp';
import ratioArt from '../assets/website/premium/potion_panic-world.webp';
import Revision from './Revision';
import Videos from './Videos';
import Account, { AuthCallback } from './ParentAccount';
import Subscriptions from './Subscriptions';
import { useFamily } from './FamilyAccount';
import { AdventureBackdrop } from './AdventureArtwork';
import heroActionWide from '../assets/website/premium/hero-cinematic-wide.webp';
import heroActionMobile from '../assets/website/premium/hero-cinematic-mobile.webp';
import SplashLogo from './SplashLogo';
import GameplayGallery from './GameplayGallery';
import { RevisionOverview, RevisionBenefits, RevisionCoverage } from './RevisionContent';
import EnglishLanding from './EnglishLanding';

const ParentArea = lazy(() => import('./ParentArea'));
const ForParents = lazy(() => import('./ForParents'));
const ChildProgressPage = lazy(() => import('./ParentArea').then(module => ({ default: module.ChildProgressPage })));
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const Journal = lazy(() => import('./Journal'));
const JournalArticle = lazy(() => import('./Journal').then(module => ({ default: module.JournalArticle })));
const JournalEditor = lazy(() => import('./JournalEditor'));

export function Brand({ small = false }: { small?: boolean }) {
  return <Link to="/" className={`website-brand ${small ? 'website-brand-small' : ''}`} aria-label="SATs Legends home">
    <SplashLogo />
  </Link>;
}

const reveal = { initial: { opacity: 1, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.45 } };

function Home() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!['#what-is-sats-legends', '#revision-subjects', '#why-sats-legends'].includes(hash)) return;
    // React renders these targets after the browser's initial fragment lookup.
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  const adventures = [
    { name: 'Place Value Panic', subject: 'Number', image: numberArt, island: 1, color: 'mint' },
    { name: 'Fraction Forge', subject: 'Fractions', image: fractionArt, island: 2, color: 'cyan' },
    { name: 'Angle Arena', subject: 'Geometry', image: angleArt, island: 3, color: 'gold' },
    { name: 'Potion Panic', subject: 'Ratio', image: ratioArt, island: 7, color: 'purple' },
  ];

  return <main id="website-main">
    <section className="website-hero">
      <picture className="website-hero-action-art">
        <source media="(max-width: 580px)" srcSet={heroActionMobile} />
        <img src={heroActionWide} alt="Barratt, Mochi, Bran and Vex explore the stone paths and waterfalls of Matharia" fetchPriority="high" decoding="async" />
      </picture>
      <div className="website-hero-glow" aria-hidden="true" />
      <div className="website-container website-hero-inner">
        <motion.div className="website-hero-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <p className="website-eyebrow"><span /> KS2 SATs revision for Years 5 & 6</p>
          <h1 className="website-splash-heading" aria-label="SATs Legends"><SplashLogo /></h1>
          <h2>Build maths skills.<br /><span>Grow SATs confidence.</span></h2>
          <p className="website-hero-description">Support your child’s maths revision with interactive challenges, clear explanations and visual lessons. Follow their practice in your parent dashboard and find the topics that need another look.</p>
          <div className="website-hero-actions">
            <Link className="website-button website-button-gold" to="/play"><Gamepad2 size={21} /> Explore Matharia <ArrowRight size={20} /></Link>
            <Link className="website-button website-button-outline" to="/for-parents"><BookOpen size={19} /> For parents</Link>
          </div>
          <p className="website-school-note">Made to support what they learn at school.</p>
          <p className="website-hero-note"><Check size={15} /> Matharia · From £4.99/month · One child profile</p>
        </motion.div>
      </div>
      <div className="website-hero-bottom" aria-hidden="true" />
    </section>

    <RevisionOverview />
    <RevisionCoverage />
    <RevisionBenefits />

    <section className="website-adventures website-container" aria-labelledby="website-adventure-title">
      <motion.div {...reveal} className="website-section-heading"><div><p className="website-eyebrow"><Sparkles size={15} /> Inside the game</p><h2 id="website-adventure-title">Maths skills. Epic worlds.</h2><p>Explore number, fractions, geometry and ratio through distinct game challenges.</p></div><Link className="website-text-link" to="/map">Explore the world map <ArrowRight size={18} /></Link></motion.div>
      <div className="website-adventure-grid">{adventures.map((adventure, index) => <motion.div {...reveal} transition={{ duration: 0.4, delay: index * 0.07 }} key={adventure.name}>
        <Link to={`/island/${adventure.island}`} className="website-adventure"><div className="website-adventure-image"><img src={adventure.image} alt={`${adventure.name} game environment`} loading="lazy" /><span className={`website-subject website-subject-${adventure.color}`}>{adventure.subject}</span><span className="website-adventure-play"><Play size={20} fill="currentColor" /></span></div><div className="website-adventure-title"><h3>{adventure.name}</h3><ChevronRight size={19} /></div></Link>
      </motion.div>)}</div>
    </section>

    <GameplayGallery />
    <motion.section {...reveal} className="website-parent-intro website-container">
      <div><p className="website-eyebrow">For parents & carers</p><h2>See what clicked. Know what to revisit.</h2><p>Open your private dashboard to see saved activity, answer accuracy and topics to revisit. Use it to choose one useful focus for the next session, with optional progress emails to keep you informed.</p></div>
      <Link className="website-text-link" to="/for-parents">See how you can support them <ArrowRight size={18} /></Link>
    </motion.section>
    <motion.section {...reveal} className="website-final-cta website-container">
      <PremiumArtwork hero="mochi" className="website-final-character" sizes="180px" />
      <div><p className="website-eyebrow"><Star size={16} /> Practice with purpose</p><h2>Give their next practice a purpose.</h2><p>One child profile. Their saved progress. A clearer picture for you.</p></div>
      <Link className="website-button website-button-gold" to="/subscriptions">See Matharia plans <ArrowRight size={19} /></Link>
    </motion.section>
  </main>;
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
    const page = pathname.startsWith('/journal') ? 'The Legends Journal' : pathname === '/admin/journal' ? 'Journal publishing studio' : pathname.startsWith('/parent/progress') ? 'Child progress' : pathname.startsWith('/parent') ? 'Parent account' : pathname === '/admin' ? 'Admin' : pathname === '/for-parents' ? 'For parents' : pathname === '/english' ? 'Lexcoria' : pathname === '/subscriptions' ? 'Subscriptions' : pathname === '/revision' ? 'Revision Guide' : pathname === '/videos' ? 'Videos' : pathname === '/signup' ? 'Sign up' : pathname === '/login' ? 'Log in' : pathname.includes('password') ? 'Reset password' : 'KS2 SATs revision';
    document.title = `SATs Legends · ${page}`;
  }, [pathname]);

  return <div className="legends-website">
    <AdventureBackdrop />
    <a className="website-skip-link" href="#website-main">Skip to content</a>
    <header className="website-header"><div className="website-container website-header-inner">
      <Brand />
      <nav className="website-desktop-nav" aria-label="Main navigation"><NavLink to="/" end>Home</NavLink><Link to="/play">Matharia</Link><NavLink to="/english">Lexcoria</NavLink><NavLink to="/subscriptions">Subscriptions</NavLink><NavLink to="/for-parents">For parents</NavLink><NavLink to="/revision">Revision guide</NavLink><NavLink to="/videos">Videos</NavLink><NavLink to="/journal">Journal</NavLink></nav>
      <div className="website-header-actions">{family.session ? <>{family.isAdmin && <Link className="website-login" to="/admin">Admin</Link>}<Link className="website-button website-button-gold website-button-small" to="/parent">Parent account</Link><button className="website-login" onClick={logout}>Log out</button></> : <><Link to="/login" className="website-login">Log in</Link><Link className="website-button website-button-gold website-button-small" to="/signup">Sign up <ArrowRight size={16} /></Link></>}
      <button ref={menuButton} className="website-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="website-mobile-nav" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button></div>
    </div>{menuOpen && <nav id="website-mobile-nav" className="website-mobile-nav" aria-label="Mobile navigation"><NavLink to="/" end>Home</NavLink><Link to="/play">Matharia</Link><NavLink to="/english">Lexcoria</NavLink><NavLink to="/subscriptions">Subscriptions</NavLink><NavLink to="/for-parents">For parents</NavLink><NavLink to="/revision">Revision guide</NavLink><NavLink to="/videos">Videos</NavLink><NavLink to="/journal">Journal</NavLink>{family.session ? <>{family.isAdmin && <Link to="/admin">Admin</Link>}<Link to="/parent">Parent account</Link><button onClick={logout}>Log out</button></> : <><Link to="/login">Log in</Link><Link to="/signup">Sign up</Link></>}</nav>}</header>
    {accountError && <p className="family-error website-container" role="alert">{accountError}</p>}
<Suspense fallback={<main id="website-main" className="website-container family-main"><p role="status">Loading…</p></main>}><Routes><Route path="/" element={<Home />} /><Route path="/english" element={<EnglishLanding />} /><Route path="/revision" element={<Revision />} /><Route path="/videos" element={<Videos />} /><Route path="/signup" element={<Account mode="signup" />} /><Route path="/login" element={<Account mode="login" />} /><Route path="/forgot-password" element={<Account mode="forgot" />} /><Route path="/reset-password" element={<Account mode="reset" />} /><Route path="/auth/callback" element={<AuthCallback />} /><Route path="/subscriptions" element={<Subscriptions />} /><Route path="/for-parents" element={<ForParents />} /><Route path="/parent" element={<ParentArea />} /><Route path="/parent/progress/:childId" element={<ChildProgressPage />} /><Route path="/admin" element={<AdminDashboard />} /><Route path="/journal" element={<Journal />} /><Route path="/journal/:slug" element={<JournalArticle />} /><Route path="/admin/journal" element={<JournalEditor />} /></Routes></Suspense>
    <footer className="website-footer"><div className="website-container website-footer-top"><Brand small /><p>Big challenges. Brilliant minds.</p><nav aria-label="Footer navigation"><Link to="/for-parents">For parents</Link><Link to="/play">Matharia</Link><Link to="/english">Lexcoria</Link><Link to="/revision">Revision guide</Link><Link to="/videos">Videos</Link><Link to="/journal">The Legends Journal</Link></nav></div><div className="website-container website-footer-bottom"><span>© {new Date().getFullYear()} SATs Legends</span><span>Made for curious minds.</span></div></footer>
  </div>;
}
