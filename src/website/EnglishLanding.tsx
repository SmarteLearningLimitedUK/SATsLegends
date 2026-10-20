import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Feather, Sparkles, SpellCheck2 } from 'lucide-react';
import { englishPlayable, englishReleased, englishTesting } from './englishRelease';
import { hasGameAccess, useFamily } from './FamilyAccount';
import PremiumArtwork from './PremiumArtwork';

const strands = [
  { icon: BookOpen, title: 'Reading', copy: 'Find evidence, explore meaning and compare ideas across stories and information texts.' },
  { icon: Feather, title: 'Grammar', copy: 'Build accurate sentences, clauses and noun phrases through short challenges.' },
  { icon: SpellCheck2, title: 'Spelling & punctuation', copy: 'Practise careful spelling and punctuation choices as part of the adventure.' },
];

export default function EnglishLanding() {
  const family = useFamily();
  const hasEnglishAccess = hasGameAccess('english', family.subscriptions, family.complimentary);
  const selectedChild = family.selectedChild;
  const entry = !family.session
    ? <Link className="website-button website-button-gold" to="/login?next=/parent">Log in to play Lexcoria <ArrowRight size={18} /></Link>
    : hasEnglishAccess && selectedChild
      ? <a className="website-button website-button-gold" href="/english/play/" onClick={() => family.selectChild(selectedChild.id)}>Play Lexcoria <ArrowRight size={18} /></a>
      : <Link className="website-button website-button-gold" to="/parent">{hasEnglishAccess ? 'Choose a child profile' : 'Check Lexcoria access'} <ArrowRight size={18} /></Link>;
  return <main id="website-main" className="english-landing">
    <section className="english-landing-hero">
      <div className="website-container english-landing-inner">
        <motion.div className="english-landing-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="website-eyebrow"><Sparkles size={16} /> The English SATs Legends adventure</p>
          {!englishReleased && <p className="english-coming-soon">{englishTesting ? 'Playtest' : 'In development'}</p>}
          <h1>Lexcoria <span>{englishReleased ? 'is ready to explore.' : englishTesting ? 'is ready to test.' : 'is on its way.'}</span></h1>
          <p>{englishPlayable ? 'Give English revision another way to engage your child: reading, grammar, punctuation and spelling challenges across four island groups, plus two practice SATs papers.' : 'Our next adventure brings reading, grammar, punctuation and spelling into interactive revision. We’ll make availability clear before you choose an English plan.'}</p>
          <div className="english-landing-actions">{englishPlayable ? <>{entry}<Link className="website-button website-button-outline" to={englishReleased ? '/subscriptions?product=english' : '/parent'}>{englishReleased ? 'See English plans' : 'Open parent account'}</Link></> : <><Link className="website-button website-button-gold" to="/play">Play Matharia <ArrowRight size={18} /></Link><Link className="website-button website-button-outline" to="/revision">Explore revision</Link></>}</div>
          <p className="english-landing-note">{englishReleased ? 'Use your SATs Legends parent login. An English or combined subscription and a child profile are required to play.' : englishTesting ? 'This is a gated playtest. Use the same parent login as Matharia, then choose your child’s profile. An English access grant is required; English and combined plans are not on sale yet.' : 'Lexcoria is not available to play or purchase yet. Current subscriptions cover Matharia only.'}</p>
        </motion.div>
        <figure className="english-landing-art"><PremiumArtwork hero="vex" eager /><figcaption>The next chapter in the SATs Legends world.</figcaption></figure>
      </div>
    </section>
    <section className="english-landing-strands website-container" aria-labelledby="english-strands-title">
      <p className="website-eyebrow">The skills behind the adventure</p>
      <h2 id="english-strands-title">Practise the choices that make English click.</h2>
      <div>{strands.map(({ icon: Icon, title, copy }) => <article key={title}><Icon size={27} /><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <p>{englishPlayable ? 'Use your parent account to follow saved progress in both adventures.' : 'We’ll share more as Lexcoria develops. Matharia and the revision resources are ready to explore now.'}</p>
    </section>
  </main>;
}
