import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Feather, Sparkles, SpellCheck2 } from 'lucide-react';
import { englishPlayable, englishReleased, englishTesting } from './englishRelease';

const strands = [
  { icon: BookOpen, title: 'Reading', copy: 'Find evidence, explore meaning and compare ideas across stories and information texts.' },
  { icon: Feather, title: 'Grammar', copy: 'Build accurate sentences, clauses and noun phrases through short challenges.' },
  { icon: SpellCheck2, title: 'Spelling & punctuation', copy: 'Practise careful spelling and punctuation choices as part of the adventure.' },
];

export default function EnglishLanding() {
  return <main id="website-main" className="english-landing">
    <section className="english-landing-hero">
      <div className="website-container english-landing-inner">
        <motion.div className="english-landing-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="website-eyebrow"><Sparkles size={16} /> The English SATs Legends adventure</p>
          {!englishReleased && <p className="english-coming-soon">{englishTesting ? 'Playtest' : 'In development'}</p>}
          <h1>Lexcoria <span>{englishReleased ? 'is ready to explore.' : englishTesting ? 'is ready to test.' : 'is on its way.'}</span></h1>
          <p>{englishPlayable ? 'Explore reading, grammar, punctuation and spelling across four island groups and two practice SATs papers.' : 'Reading, grammar, punctuation and spelling are becoming a new world of challenges.'}</p>
          <div className="english-landing-actions">{englishReleased ? <><a className="website-button website-button-gold" href="/english/play/">Play Lexcoria <ArrowRight size={18} /></a><Link className="website-button website-button-outline" to="/subscriptions?product=english">See English plans</Link></> : englishTesting ? <><a className="website-button website-button-gold" href="/english/play/">Test Lexcoria <ArrowRight size={18} /></a><Link className="website-button website-button-outline" to="/parent">Open parent account</Link></> : <><Link className="website-button website-button-gold" to="/play">Play Matharia <ArrowRight size={18} /></Link><Link className="website-button website-button-outline" to="/revision">Explore revision</Link></>}</div>
          <p className="english-landing-note">{englishReleased ? 'A parent account with an English or combined subscription is required to play.' : englishTesting ? 'This is a gated playtest. Sign in with a parent account that has English access and choose a child profile first. English and combined plans are not on sale yet.' : 'Lexcoria is not available to play or purchase yet. Current subscriptions cover Matharia only.'}</p>
        </motion.div>
        <div className="english-landing-emblem" aria-hidden="true"><BookOpen size={155} strokeWidth={1.15} /><span>READ · WRITE · DISCOVER</span></div>
      </div>
    </section>
    <section className="english-landing-strands website-container" aria-labelledby="english-strands-title">
      <p className="website-eyebrow">A new world to grow into</p>
      <h2 id="english-strands-title">English skills, with an adventurous spirit.</h2>
      <div>{strands.map(({ icon: Icon, title, copy }) => <article key={title}><Icon size={27} /><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <p>{englishPlayable ? 'Use your parent account to follow saved progress in both adventures.' : 'We’ll share more as Lexcoria develops. Matharia and the revision resources are ready to explore now.'}</p>
    </section>
  </main>;
}
