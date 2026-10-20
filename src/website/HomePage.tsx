import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, Gamepad2, Video } from 'lucide-react';
import hero from '../assets/website/premium/hero-cinematic-wide.webp';
import matharia from '../assets/website/premium/place_value_panic-world.webp';
import PremiumArtwork from './PremiumArtwork';
import GameplayGallery from './GameplayGallery';
import ParentQuestions from './ParentQuestions';
import { englishReleased, englishTesting } from './englishRelease';

const reveal = { initial: { y: 14 }, whileInView: { y: 0 }, viewport: { once: true, amount: .15 }, transition: { duration: .45 } };

export default function HomePage() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!['#what-is-sats-legends', '#revision-subjects', '#why-sats-legends'].includes(hash)) return;
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  return <main id="website-main" className="home-refresh">
    <section className="home-opening" aria-labelledby="home-title">
      <img className="home-opening-art" src={hero} alt="The SATs Legends adventurers explore Matharia’s sunlit stone paths and waterfalls" fetchPriority="high" decoding="async" />
      <div className="website-container home-opening-inner"><motion.div className="home-opening-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
        <p className="website-eyebrow">SATs Legends · Years 5 & 6</p>
        <h1 id="home-title">Big challenges.<br /><span>Brilliant minds.</span></h1>
        <p className="home-opening-description">Turn maths revision into an adventure. Build skills through game challenges, revisit tricky topics and see their progress as they practise.</p>
        <div className="home-actions"><Link className="website-button website-button-gold" to="/play"><Gamepad2 size={20} /> Explore Matharia <ArrowRight size={19} /></Link><Link className="home-secondary-link" to="/for-parents">How it works for parents <ArrowRight size={18} /></Link></div>
        <p className="home-opening-note"><Check size={16} /> From £4.99/month · One child profile</p>
      </motion.div></div>
    </section>
    <div className="home-facts"><div className="website-container"><span>KS2 maths revision</span><span>Arithmetic & reasoning</span><span>Private parent progress</span><span>Phone, tablet & desktop</span></div></div>

    <section id="what-is-sats-legends" className="home-overview home-paper" aria-labelledby="home-overview-title"><div className="website-container">
      <motion.div {...reveal} className="home-section-intro"><div><p className="website-eyebrow">What is SATs Legends?</p><h2 id="home-overview-title">A fresh way to revisit<br />what they learn at school.</h2></div><p>A revision companion for home, bringing interactive maths practice, clear explanations and your child’s progress together. Choose one useful focus, give it a go and build from there.</p></motion.div>
      <ol className="home-practice-steps">{[
        { number: '01', icon: BookOpen, title: 'Find their focus.', text: 'Choose a topic from school or revisit something that needs another look.', label: 'Browse revision guides', route: '/revision' },
        { number: '02', icon: Video, title: 'Make the method click.', text: 'Use worked examples and visual lessons to explore how a method works.', label: 'Explore visual lessons', route: '/videos' },
        { number: '03', icon: Gamepad2, title: 'Put it into play.', text: 'Apply the skill in a challenge, get feedback and return for another try.', label: 'Step into Matharia', route: '/play' },
      ].map(({ number, icon: Icon, title, text, label, route }) => <li key={number}><div><span>{number}</span><Icon size={25} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p><Link to={route}>{label}<ArrowRight size={17} /></Link></li>)}</ol>
    </div></section>

    <section id="revision-subjects" className="home-worlds website-container" aria-labelledby="home-worlds-title">
      <motion.div {...reveal} className="home-section-intro"><div><p className="website-eyebrow">Meet the adventures</p><h2 id="home-worlds-title">Maths and English.<br /><span>A world for each.</span></h2></div><p>Matharia is our maths revision adventure. Its English sister, Lexcoria, is the next chapter in the SATs Legends family.</p></motion.div>
      <div className="home-world-list">
        <article className="home-world"><Link className="home-world-art" to="/play" aria-label="Explore Matharia maths revision"><img src={matharia} alt="The detailed stone terraces, crystals and waterfalls of Matharia" loading="lazy" /><span>Maths adventure</span></Link><div className="home-world-copy"><p className="website-eyebrow">Matharia · Available now</p><h3>Make maths an adventure.</h3><p>Practise number, calculations, fractions, geometry, ratio and reasoning across distinct game challenges.</p><Link className="website-button website-button-gold" to="/play">Explore Matharia <ArrowRight size={18} /></Link><small>Maths revision for one child profile.</small></div></article>
        <article className="home-world"><Link className="home-world-art home-world-english" to="/english" aria-label="Explore Lexcoria English revision"><PremiumArtwork hero="vex" sizes="(max-width: 760px) 250px, 320px" /><span>English adventure</span></Link><div className="home-world-copy"><p className="website-eyebrow">Lexcoria · {englishReleased ? 'Available now' : englishTesting ? 'Gated playtest' : 'In development'}</p><h3>Discover the power of words.</h3><p>A sister adventure for reading comprehension, grammar, punctuation and spelling, with its own access and progress.</p><Link className="website-button website-button-outline" to="/english">Discover Lexcoria <ArrowRight size={18} /></Link><small>{englishReleased ? 'An English or combined plan is required.' : 'English plans are not on sale yet. Not included in Matharia plans.'}</small></div></article>
      </div>
    </section>

    <div className="home-gameplay"><GameplayGallery /></div>

    <section id="why-sats-legends" className="home-parent home-paper" aria-labelledby="home-parent-title"><div className="website-container home-parent-layout"><motion.div {...reveal}>
      <p className="website-eyebrow">For the adventure. For the progress.</p><h2 id="home-parent-title">Their adventure.<br /><span>Your window into progress.</span></h2><p>You don’t have to watch every game to stay involved. Your private parent account helps you see what they’ve practised and decide what to revisit together.</p>
      <ul>{[
        ['See their practice', 'Follow saved activity and answer accuracy for your child’s profile.'],
        ['Find a useful next step', 'Look at stronger topics and areas to revisit, then choose the next focus.'],
        ['Stay in the loop', 'Check the dashboard when it suits you, or opt into progress emails.'],
      ].map(([title, text]) => <li key={title}><Check size={20} /><div><h3>{title}</h3><p>{text}</p></div></li>)}</ul>
      <Link className="website-button website-button-gold" to="/for-parents">Explore the parent experience <ArrowRight size={18} /></Link>
    </motion.div><figure><PremiumArtwork hero="mochi" sizes="(max-width: 760px) 240px, 350px" /><figcaption>More purpose in their practice. More insight for you.</figcaption></figure></div></section>

    <ParentQuestions />
    <section className="home-close"><div className="website-container"><p className="website-eyebrow">Their next challenge starts here</p><h2>Give revision<br />a new sense of adventure.</h2><p>Matharia from £4.99/month or £49.99/year.<br />One child profile, saved progress and a private parent dashboard.</p><Link className="website-button website-button-gold" to="/subscriptions">See Matharia plans <ArrowRight size={19} /></Link><small>A companion to classroom learning, written practice and past papers.</small></div></section>
  </main>;
}
