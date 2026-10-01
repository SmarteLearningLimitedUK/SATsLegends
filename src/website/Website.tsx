import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, ChevronRight, Gamepad2, Menu, Play, Sparkles, Star, Video, X } from 'lucide-react';
import mochi from '../assets/characters/mobile/Mochi/mochi_happy.png';
import numberArt from '../assets/maps/premium/place-value-panic.webp';
import fractionArt from '../assets/maps/premium/fraction-forge.webp';
import angleArt from '../assets/maps/premium/angle-arena.webp';
import ratioArt from '../assets/maps/premium/potion-panic.webp';
import Revision from './Revision';
import Videos from './Videos';
import Account, { AuthCallback } from './ParentAccount';
import Subscriptions from './Subscriptions';
import { useFamily } from './FamilyAccount';
import AdventureArtwork, { AdventureBackdrop } from './AdventureArtwork';
import valley from '../assets/website/adventure-valley-v1.webp';
import SplashLogo from './SplashLogo';
import GameplayGallery from './GameplayGallery';

const ParentArea = lazy(() => import('./ParentArea'));
const ForParents = lazy(() => import('./ForParents'));
const ChildProgressPage = lazy(() => import('./ParentArea').then(module => ({ default: module.ChildProgressPage })));
const AdminDashboard = lazy(() => import('./AdminDashboard'));

export function Brand({ small = false }: { small?: boolean }) {
  return <Link to="/" className={`website-brand ${small ? 'website-brand-small' : ''}`} aria-label="SATs Legends home">
    <SplashLogo />
  </Link>;
}

const reveal = { initial: { opacity: 1, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.45 } };

function Home() {
  const adventures = [
    { name: 'Place Value Panic', subject: 'Number', image: numberArt, island: 1, color: 'mint' },
    { name: 'Fraction Forge', subject: 'Fractions', image: fractionArt, island: 2, color: 'cyan' },
    { name: 'Angle Arena', subject: 'Geometry', image: angleArt, island: 3, color: 'gold' },
    { name: 'Potion Panic', subject: 'Ratio', image: ratioArt, island: 7, color: 'purple' },
  ];

  return <main id="website-main">
    <section className="website-hero">
      <img className="website-hero-landscape" src={valley} alt="" aria-hidden="true" fetchPriority="high" />
      <div className="website-hero-glow" aria-hidden="true" />
      <div className="website-container website-hero-inner">
        <motion.div className="website-hero-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <p className="website-eyebrow"><span /> Big adventures. Brilliant brains.</p>
          <h1 className="website-splash-heading" aria-label="SATs Legends"><SplashLogo /></h1>
          <h2>Play. Learn. <span>Level up.</span></h2>
          <p className="website-hero-description">Follow forest trails. Face mischievous foes. Turn your maths skills into your next great adventure.</p>
          <div className="website-hero-actions">
            <Link className="website-button website-button-gold" to="/play"><Gamepad2 size={21} /> Let’s play <ArrowRight size={20} /></Link>
            <Link className="website-button website-button-outline" to="/revision"><BookOpen size={19} /> Explore revision</Link>
          </div>
          <p className="website-hero-note"><Check size={15} /> Matharia · From £4.99/month · One child profile</p>
        </motion.div>
        <AdventureArtwork />
      </div>
      <div className="website-hero-bottom" aria-hidden="true" />
    </section>

    <section className="website-paths website-container" aria-labelledby="website-paths-title">
      <motion.div {...reveal} className="website-section-heading website-heading-center"><p className="website-eyebrow">A little learning. A lot of adventure.</p><h2 id="website-paths-title">Choose your next move.</h2><p>However you like to learn, there’s a path for you.</p></motion.div>
      <div className="website-path-grid">
        {[
          { icon: Gamepad2, number: '01', title: 'Enter the adventure', description: 'Pick your hero. Explore the islands. Put your maths skills to the test.', label: 'Play the game', route: '/play', className: 'website-path-play' },
          { icon: BookOpen, number: '02', title: 'Build your brainpower', description: 'Break tricky topics into simple steps, then give a quick challenge a go.', label: 'Open revision guide', route: '/revision', className: 'website-path-learn' },
          { icon: Video, number: '03', title: 'See it. Get it.', description: 'Watch bite-sized visual lessons and make those “ohhh!” moments happen.', label: 'Explore videos', route: '/videos', className: 'website-path-watch' },
        ].map(({ icon: Icon, ...path }, index) => <motion.div {...reveal} transition={{ duration: 0.45, delay: index * 0.08 }} key={path.number}>
          <Link className={`website-path ${path.className}`} to={path.route}><div className="website-path-top"><span className="website-path-icon"><Icon size={26} /></span><span className="website-path-number">{path.number}</span></div><h3>{path.title}</h3><p>{path.description}</p><span className="website-path-link">{path.label}<ArrowRight size={19} /></span></Link>
        </motion.div>)}
      </div>
    </section>

    <section className="website-adventures website-container" aria-labelledby="website-adventure-title">
      <motion.div {...reveal} className="website-section-heading"><div><p className="website-eyebrow"><Sparkles size={15} /> Inside the game</p><h2 id="website-adventure-title">Maths skills. Epic worlds.</h2><p>Every challenge is a new chance to get stronger.</p></div><Link className="website-text-link" to="/map">Explore the world map <ArrowRight size={18} /></Link></motion.div>
      <div className="website-adventure-grid">{adventures.map((adventure, index) => <motion.div {...reveal} transition={{ duration: 0.4, delay: index * 0.07 }} key={adventure.name}>
        <Link to={`/island/${adventure.island}`} className="website-adventure"><div className="website-adventure-image"><img src={adventure.image} alt={`${adventure.name} game environment`} loading="lazy" /><span className={`website-subject website-subject-${adventure.color}`}>{adventure.subject}</span><span className="website-adventure-play"><Play size={20} fill="currentColor" /></span></div><div className="website-adventure-title"><h3>{adventure.name}</h3><ChevronRight size={19} /></div></Link>
      </motion.div>)}</div>
    </section>

    <GameplayGallery />

    <motion.section {...reveal} className="website-parent-intro website-container">
      <div><p className="website-eyebrow">For parents & carers</p><h2>Support every step of their adventure.</h2><p>Explore maths revision, progress reports and moments of calm inside Matharia.</p></div>
      <Link className="website-text-link" to="/for-parents">Meet the parent guide <ArrowRight size={18} /></Link>
    </motion.section>
    <motion.section {...reveal} className="website-final-cta website-container">
      <img src={mochi} alt="Mochi, the panda hero" loading="lazy" />
      <div><p className="website-eyebrow"><Star size={16} /> Every legend starts somewhere</p><h2>Your next level starts here.</h2><p>One challenge. One new skill. One step closer.</p></div>
      <Link className="website-button website-button-gold" to="/play">Start your adventure <ArrowRight size={19} /></Link>
    </motion.section>
  </main>;
}

export default function Website() {
  const [menuOpen, setMenuOpen] = useState(false);
  const family = useFamily();
  const [accountError, setAccountError] = useState('');
  const logout = () => { setAccountError(''); void family.signOut().catch(error => setAccountError(error.message)); };
  const { pathname } = useLocation();
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const page = pathname.startsWith('/parent/progress') ? 'Child progress' : pathname.startsWith('/parent') ? 'Parent account' : pathname === '/admin' ? 'Admin' : pathname === '/for-parents' ? 'For parents' : pathname === '/subscriptions' ? 'Matharia subscriptions' : pathname === '/revision' ? 'Revision Guide' : pathname === '/videos' ? 'Videos' : pathname === '/signup' ? 'Sign up' : pathname === '/login' ? 'Log in' : pathname.includes('password') ? 'Reset password' : 'Play. Learn. Level up.';
    document.title = `SATs Legends · ${page}`;
  }, [pathname]);

  return <div className="legends-website">
    <AdventureBackdrop />
    <a className="website-skip-link" href="#website-main">Skip to content</a>
    <header className="website-header"><div className="website-container website-header-inner">
      <Brand />
      <nav className="website-desktop-nav" aria-label="Main navigation"><NavLink to="/" end>Home</NavLink><Link to="/play">Matharia</Link><NavLink to="/subscriptions">Subscriptions</NavLink><NavLink to="/for-parents">For parents</NavLink><NavLink to="/revision">Revision guide</NavLink><NavLink to="/videos">Videos</NavLink></nav>
      <div className="website-header-actions">{family.session ? <>{family.isAdmin && <Link className="website-login" to="/admin">Admin</Link>}<Link className="website-button website-button-gold website-button-small" to="/parent">Parent account</Link><button className="website-login" onClick={logout}>Log out</button></> : family.configured ? <><Link to="/login" className="website-login">Log in</Link><Link className="website-button website-button-gold website-button-small" to="/signup">Sign up <ArrowRight size={16} /></Link></> : <Link className="website-button website-button-gold website-button-small" to="/subscriptions">Explore plans <ArrowRight size={16} /></Link>}
      <button className="website-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="website-mobile-nav" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button></div>
    </div>{menuOpen && <nav id="website-mobile-nav" className="website-mobile-nav" aria-label="Mobile navigation"><NavLink to="/" end>Home</NavLink><Link to="/play">The game</Link><NavLink to="/subscriptions">Subscriptions</NavLink><NavLink to="/for-parents">For parents</NavLink><NavLink to="/revision">Revision guide</NavLink><NavLink to="/videos">Videos</NavLink>{family.session ? <>{family.isAdmin && <Link to="/admin">Admin</Link>}<Link to="/parent">Parent account</Link><button onClick={logout}>Log out</button></> : family.configured ? <><Link to="/login">Log in</Link><Link to="/signup">Sign up</Link></> : null}</nav>}</header>
    {accountError && <p className="family-error website-container" role="alert">{accountError}</p>}
<Suspense fallback={<main id="website-main" className="website-container family-main"><p role="status">Loading…</p></main>}><Routes><Route path="/" element={<Home />} /><Route path="/revision" element={<Revision />} /><Route path="/videos" element={<Videos />} /><Route path="/signup" element={<Account mode="signup" />} /><Route path="/login" element={<Account mode="login" />} /><Route path="/forgot-password" element={<Account mode="forgot" />} /><Route path="/reset-password" element={<Account mode="reset" />} /><Route path="/auth/callback" element={<AuthCallback />} /><Route path="/subscriptions" element={<Subscriptions />} /><Route path="/for-parents" element={<ForParents />} /><Route path="/parent" element={<ParentArea />} /><Route path="/parent/progress/:childId" element={<ChildProgressPage />} /><Route path="/admin" element={<AdminDashboard />} /></Routes></Suspense>
    <footer className="website-footer"><div className="website-container website-footer-top"><Brand small /><p>Small steps. Big adventures.</p><nav aria-label="Footer navigation"><Link to="/for-parents">For parents</Link><Link to="/play">Play</Link><Link to="/revision">Revision guide</Link><Link to="/videos">Videos</Link></nav></div><div className="website-container website-footer-bottom"><span>© {new Date().getFullYear()} SATs Legends</span><span>Made for curious minds.</span></div></footer>
  </div>;
}
