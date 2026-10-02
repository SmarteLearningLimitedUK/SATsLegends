import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Feather, Sparkles, SpellCheck2 } from 'lucide-react';
import { englishReleased } from './englishRelease';

const strands = [
  { icon: BookOpen, title: 'Reading', copy: 'Find evidence, explore meaning and compare ideas across stories and information texts.' },
  { icon: Feather, title: 'Grammar', copy: 'Build accurate sentences, clauses and noun phrases through short challenges.' },
  { icon: SpellCheck2, title: 'Spelling & punctuation', copy: 'Practise careful spelling and punctuation choices as part of the adventure.' },
];

export default function EnglishLanding() {
  return <main id="website-main" className="english-landing">
    <section className="english-landing-hero website-container">
      <div className="english-landing-copy">
        <p className="website-eyebrow"><Sparkles size={16} /> The English SATs Legends adventure</p>
        {!englishReleased && <p className="english-coming-soon">In development</p>}
        <h1>Lexcoria is <span>{englishReleased ? 'ready to explore.' : 'on its way.'}</span></h1>
        <p>{englishReleased ? 'Explore reading, grammar, punctuation and spelling across four island groups and two practice SATs papers.' : 'Our English learning game is taking shape. Lexcoria will bring reading, grammar, punctuation and spelling into a new world of quests.'}</p>
        <div className="english-landing-actions">{englishReleased ? <><a className="website-button website-button-gold" href="/english/play/">Play Lexcoria <ArrowRight size={18} /></a><Link className="website-button website-button-outline" to="/subscriptions?product=english">See English plans</Link></> : <><Link className="website-button website-button-gold" to="/play">Play Matharia <ArrowRight size={18} /></Link><Link className="website-button website-button-outline" to="/revision">Explore revision</Link></>}</div>
        <p className="english-landing-note">{englishReleased ? 'A parent account with an English or combined subscription is required to play.' : 'Lexcoria is not available to play or purchase yet. Current subscriptions cover Matharia only.'}</p>
      </div>
      <div className="english-landing-book" aria-hidden="true"><BookOpen size={150} strokeWidth={1.25} /><span>READ</span><span>WRITE</span><span>DISCOVER</span></div>
    </section>
    <section className="english-landing-strands website-container" aria-labelledby="english-strands-title">
      <p className="website-eyebrow">A new world to grow into</p><h2 id="english-strands-title">English skills, with an adventurous spirit.</h2>
      <div>{strands.map(({ icon: Icon, title, copy }) => <article key={title}><Icon size={28} /><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <p>{englishReleased ? 'Use your parent account to follow saved progress in both adventures.' : 'We’ll share more about Lexcoria as the game develops. In the meantime, the Matharia adventure and revision resources are ready to explore.'}</p>
    </section>
  </main>;
}
