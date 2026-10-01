import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, Leaf, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import valley from '../assets/website/adventure-valley-v1.webp';
import mochi from '../assets/characters/mobile/Mochi/mochi_happy.png';
import { WELLBEING_SCENES } from '../wellbeing/scenes';
import { revisionTopics } from './content';
import SplashLogo from './SplashLogo';
import GameplayGallery from './GameplayGallery';

const calmActivities = [
  { id: 'breathing_bloom', name: 'Bubble Breath', type: 'Breathing', time: 'About 40 seconds', text: 'Follow a gentle breath in and an easy breath out. Children can pause whenever they like and keep to a comfortable pace.' },
  { id: 'peaceful_pond', name: 'Peaceful Pond', type: 'Grounding', time: 'About 50 seconds', text: 'Guide lily pads home and watch the water ripple. A quiet, simple activity for a change of pace.' },
  { id: 'candle_calm', name: 'Lantern Camp', type: 'Grounding', time: 'About 35 seconds', text: 'Put the camp supplies away, then dim the lantern and enjoy the evening glow.' },
  { id: 'constellation_connect', name: 'Star Path', type: 'Focus', time: 'About 40 seconds', text: 'Connect five stars in order, taking one small step at a time.' },
  { id: 'leaf_drift', name: 'Leaf Drift', type: 'Grounding', time: 'About 35 seconds', text: 'Guide three leaves along a quiet woodland stream and into the glow.' },
  { id: 'thought_sort', name: 'Worry Balloon', type: 'Thought reset', time: 'About 45 seconds', text: 'Choose words for a feeling and let a balloon drift away. Tapping is enough; the optional microphone works on the device without uploading a recording.' },
] as const;
const reveal = { initial: { y: 16 }, whileInView: { y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.45 } };

export default function ForParents() {
  const [activityIndex, setActivityIndex] = useState(0);
  const activity = calmActivities[activityIndex];
  return <main id="website-main" className="parents-page">
    <section className="parents-hero">
      <img className="parents-hero-landscape" src={valley} alt="" fetchPriority="high" />
      <div className="website-container parents-hero-inner">
        <motion.div initial={{ y: 18 }} animate={{ y: 0 }} transition={{ duration: 0.55 }} className="parents-hero-copy">
          <p className="website-eyebrow">For parents & carers</p>
          <div className="parents-hero-logo"><SplashLogo /></div>
          <h1>Big adventures.<br /><span>Small steps to SATs.</span></h1>
          <p>Matharia brings maths practice, revision and moments of calm into one browser adventure.</p>
          <div className="parents-actions"><Link className="website-button website-button-gold" to="/subscriptions">Explore Matharia plans <ArrowRight size={18} /></Link><a className="website-text-link" href="#calm-spaces">Discover Calm Grove <Leaf size={18} /></a></div>
        </motion.div>
        <motion.img className="parents-hero-mochi" src={mochi} alt="Mochi, Matharia’s friendly panda adventurer" initial={{ y: 18 }} animate={{ y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} />
      </div>
    </section>

    <section className="website-container parents-section" aria-labelledby="parents-learning-title">
      <motion.div {...reveal} className="parents-section-intro"><p className="website-eyebrow"><BookOpen size={16} /> Practice with purpose</p><h2 id="parents-learning-title">Build the skills behind<br /><span>the next right answer.</span></h2><p>Matharia gives children opportunities to practise calculations, recognise patterns and apply maths to challenges. Returning to a topic lets them try again and notice what is becoming easier.</p></motion.div>
      <div className="parents-learning-layout">
        <div className="parents-learning-copy"><h3>Support for the SATs journey</h3><p>Key stage 2 maths SATs in England assess arithmetic and mathematical reasoning. Matharia’s topics offer practice in many of the foundations used in those tests.</p><p>Use a game challenge alongside the revision guide and visual lessons: revisit a method, try it out, then talk through how the answer was found.</p><Link className="website-text-link" to="/revision">See the revision guide <ArrowRight size={17} /></Link><p className="parents-source">For the official test content, see the <a href="https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework" target="_blank" rel="noopener noreferrer">GOV.UK maths test framework</a>.</p></div>
        <div className="parents-topic-table"><table><caption>Matharia revision topics and skills to practise</caption><thead><tr><th scope="col">Topic</th><th scope="col">Skills to practise</th></tr></thead><tbody>{revisionTopics.map(topic => <tr key={topic.id}><th scope="row"><Link to={`/revision?topic=${topic.id}`}>{topic.category}<ArrowRight size={14} /></Link></th><td>{topic.description}</td></tr>)}</tbody></table></div>
      </div>
      <p className="parents-context"><Check size={19} /><span>Combine game practice with school learning, written working and past papers. Game progress is a guide to practice, not a predicted SATs score or a guarantee of a result. Older learners can also revisit these maths foundations.</span></p>
    </section>

    <GameplayGallery />

    <section id="calm-spaces" className="parents-calm-section" aria-labelledby="parents-calm-title">
      <div className="website-container">
        <motion.div {...reveal} className="parents-section-intro"><p className="website-eyebrow"><Leaf size={16} /> Wellbeing inside the adventure</p><h2 id="parents-calm-title">Every legend deserves<br /><span>a moment of calm.</span></h2><p>Calm Grove is Matharia’s space for short breathing, grounding and focus activities. Children can choose a pause; the game can also suggest one after repeated setbacks or a longer spell of play.</p></motion.div>
        <div className="parents-calm-showcase">
          <div className="parents-calm-picture"><img key={activity.id} src={WELLBEING_SCENES[activity.id]} alt={`${activity.name} artwork from Matharia’s Calm Grove`} loading="lazy" /><span>{activity.time}</span></div>
          <div className="parents-calm-details">
            <div className="parents-calm-options" role="group" aria-label="Explore the calm activities">{calmActivities.map((item, index) => <button key={item.id} type="button" aria-pressed={index === activityIndex} onClick={() => setActivityIndex(index)}>{item.name}</button>)}</div>
            <div className="parents-calm-description" aria-live="polite" aria-atomic="true"><p className="website-eyebrow">{activity.type}</p><h3>{activity.name}</h3><p>{activity.text}</p></div>
            <p className="parents-calm-note">A small pause, at their pace. These activities support everyday wellbeing; they are not mental health treatment.</p>
          </div>
        </div>
      </div>
    </section>

    <section className="website-container parents-section parents-tips" aria-labelledby="parents-tips-title">
      <motion.div {...reveal} className="parents-section-intro"><p className="website-eyebrow">At home, together</p><h2 id="parents-tips-title">Make room for confidence.<br /><span>And conversations.</span></h2><p>A few gentle habits can make revision feel more manageable.</p></motion.div>
      <ol>{[
        ['Keep practice manageable', 'Agree a small goal together and make time for breaks. A short practice session can be followed by some time away from the screen.'],
        ['Notice effort and strategies', 'Ask “How did you work that out?” Celebrate a method tried, a question asked or a mistake understood.'],
        ['Listen to worries', 'Let your child talk about how they feel without adding pressure. Help them identify a trusted adult at school to talk to as well.'],
        ['Protect everyday routines', 'Leave time for sleep, movement, meals and activities they enjoy. Revision is one part of their day.'],
      ].map(([title, text], index) => <li key={title}><span className="parents-tip-number">0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
      <p className="parents-help">If anxiety or low mood persists, feels severe or affects everyday life, speak with your child’s school or GP. Read the <a href="https://www.nhs.uk/mental-health/children-and-young-adults/advice-for-parents/help-your-child-beat-exam-stress/" target="_blank" rel="noopener noreferrer">NHS advice on supporting children through exam stress</a>.</p>
    </section>

    <section className="parents-family-section"><div className="website-container parents-family-layout">
      <motion.div {...reveal}><p className="website-eyebrow"><Mail size={16} /> Stay part of their journey</p><h2>Their adventure.<br /><span>Your window into progress.</span></h2><p>See saved activity, answer accuracy, strengths and areas to revisit in your private parent dashboard. Use it to choose the next small step together.</p><p>Opt in to progress emails on <strong>Sundays at 3 pm</strong> and <strong>Wednesdays at 4 pm</strong>, UK time. Each email links to your child’s progress; you can check it at any time.</p><Link className="website-text-link" to="/parent">Open your parent account <ArrowRight size={17} /></Link></motion.div>
      <div className="parents-security"><p className="website-eyebrow"><ShieldCheck size={16} /> Built around parents</p><h3>You’re in control.</h3><ul><li><LockKeyhole size={20} /><span><strong>Private child profiles</strong>Reports require the owning parent’s login, including links opened from an email.</span></li><li><ShieldCheck size={20} /><span><strong>Protected checkout</strong>Payment details are handled by the payment provider, outside the game.</span></li><li><Mail size={20} /><span><strong>Your email preferences</strong>Progress emails are optional. Switch them off in your account whenever you like.</span></li></ul></div>
    </div></section>

    <section className="website-container parents-final"><div><p className="website-eyebrow">Choose the next chapter</p><h2>Start with Matharia.</h2><p>£4.99 a month or £49.99 a year, for one child profile. An English learning game is in development; current plans cover Matharia only.</p></div><Link className="website-button website-button-gold" to="/subscriptions">View subscriptions <ArrowRight size={18} /></Link></section>
  </main>;
}
