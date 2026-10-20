import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, Leaf, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import valley from '../assets/website/premium/place_value_panic-world.webp';
import PremiumArtwork from './PremiumArtwork';
import ParentQuestions from './ParentQuestions';
import { RevisionBenefits } from './RevisionContent';
import { WELLBEING_SCENES } from '../wellbeing/scenes';
import { revisionTopics } from './content';
import SplashLogo from './SplashLogo';
import GameplayGallery from './GameplayGallery';

const calmActivities = [
  { id: 'breathing_bloom', name: 'Breath Bloom', type: 'Breathing', time: 'About 1 minute', text: 'Choose a comfortable visual rhythm, follow four breath cycles and check in between them. Pausing is always an option.' },
  { id: 'peaceful_pond', name: 'Peaceful Pond', type: 'Grounding', time: 'About 50 seconds', text: 'Notice sights, sounds and touch around you while guiding lily pads into place.' },
  { id: 'candle_calm', name: 'Lantern Camp', type: 'Grounding', time: 'About 35 seconds', text: 'Pack the camp while noticing details in the scene, then dim the lantern yourself.' },
  { id: 'constellation_connect', name: 'Star Path', type: 'Focus', time: 'About 2 minutes', text: 'Trace three constellations, discover a sky fact after each, then follow a moving light side to side for a brief attention exercise.' },
  { id: 'leaf_drift', name: 'Leaf Drift', type: 'Grounding', time: 'About 35 seconds', text: 'Choose what you notice through sight, sound and touch as each leaf moves downstream.' },
  { id: 'thought_sort', name: 'Thought Release', type: 'Thought reset', time: 'About 45 seconds', text: 'Name a feeling and choose a more balanced thought before releasing the balloon. The optional microphone works on the device without uploading a recording.' },
] as const;
const reveal = { initial: { y: 16 }, whileInView: { y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.45 } };

export default function ForParents() {
  const [activityIndex, setActivityIndex] = useState(0);
  const activity = calmActivities[activityIndex];
  return <main id="website-main" className="parents-page">
    <section className="parents-family-section" aria-labelledby="parents-progress-title"><div className="website-container parents-family-layout">
      <motion.div {...reveal}><p className="website-eyebrow"><Mail size={16} /> Stay part of their journey</p><h1 id="parents-progress-title">Their adventure.<br /><span>Your window into progress.</span></h1><p>You don’t have to guess which topics need another look. See saved activity, answer accuracy and strengths in one private dashboard, then choose a manageable focus together for the next session.</p><p>Stay informed with optional progress emails on <strong>Sundays at 3 pm</strong> and <strong>Wednesdays at 4 pm</strong>, UK time. Each email links to your child’s private progress page, available whenever you want to check in.</p><Link className="website-text-link" to="/parent">Open your parent account <ArrowRight size={17} /></Link></motion.div>
      <div className="parents-security"><p className="website-eyebrow"><ShieldCheck size={16} /> Built around parents</p><h2>You’re in control.</h2><ul><li><LockKeyhole size={20} /><span><strong>Private child profiles</strong>Reports require the owning parent’s login, including links opened from an email.</span></li><li><ShieldCheck size={20} /><span><strong>Protected checkout</strong>Payment details are handled by the payment provider, outside the game.</span></li><li><Mail size={20} /><span><strong>Your email preferences</strong>Progress emails are optional. Switch them off in your account whenever you like.</span></li></ul></div>
    </div></section>

    <section className="parents-hero">
      <img className="parents-hero-landscape" src={valley} alt="" fetchPriority="high" />
      <div className="website-container parents-hero-inner">
        <motion.div initial={{ y: 18 }} animate={{ y: 0 }} transition={{ duration: 0.55 }} className="parents-hero-copy">
          <p className="website-eyebrow">For parents & carers</p>
          <div className="parents-hero-logo"><SplashLogo /></div>
          <h2>Practice with purpose.<br /><span>Adventure they can explore.</span></h2>
          <p>Help your child prepare for KS2 maths SATs with a regular revision routine that fits around school. Matharia combines game challenges, worked examples and visual lessons, so there is a way to practise a skill and a place to turn when the method feels unclear.</p>
          <div className="parents-actions"><Link className="website-button website-button-gold" to="/subscriptions">Explore Matharia plans <ArrowRight size={18} /></Link><a className="website-text-link" href="#calm-spaces">Discover Calm Grove <Leaf size={18} /></a></div>
        </motion.div>
        <motion.figure className="parents-hero-art" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}><PremiumArtwork hero="mochi" /><figcaption>Mochi · One of Matharia’s adventurers</figcaption></motion.figure>
      </div>
    </section>

    <section className="website-container parents-section" aria-labelledby="parents-learning-title">
      <motion.div {...reveal} className="parents-section-intro"><p className="website-eyebrow"><BookOpen size={16} /> Skills for school and SATs</p><h2 id="parents-learning-title">Give tricky topics<br /><span>another way to click.</span></h2><p>From number and arithmetic to fractions, geometry, data and ratio, Matharia gives your child opportunities to revisit the foundations used in KS2 maths. Choose a familiar topic to consolidate, or return to a skill that has felt difficult in class.</p></motion.div>
      <div className="parents-learning-layout">
        <div className="parents-learning-copy"><h3>Support for the SATs journey</h3><p>Key stage 2 maths SATs in England assess arithmetic and mathematical reasoning. Matharia’s topics offer practice in many of the foundations used in those tests.</p><p>Use a game challenge alongside the revision guide and visual lessons: revisit a method, try it out, then talk through how the answer was found.</p><Link className="website-text-link" to="/revision">See the revision guide <ArrowRight size={17} /></Link><p className="parents-source">For the official test content, see the <a href="https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework" target="_blank" rel="noopener noreferrer">GOV.UK maths test framework</a>.</p></div>
        <div className="parents-topic-table"><table><caption>Matharia revision topics and skills to practise</caption><thead><tr><th scope="col">Topic</th><th scope="col">Skills to practise</th></tr></thead><tbody>{revisionTopics.map(topic => <tr key={topic.id}><th scope="row"><Link to={`/revision?topic=${topic.id}`}>{topic.category}<ArrowRight size={14} /></Link></th><td>{topic.description}</td></tr>)}</tbody></table></div>
      </div>
      <p className="parents-context"><Check size={19} /><span>Use Matharia alongside school learning, written working and past papers. The dashboard helps you choose topics to practise; it does not predict a SATs score. Older learners can revisit these maths foundations too.</span></p>
    </section>

    <RevisionBenefits />
    <GameplayGallery />

    <section id="calm-spaces" className="parents-calm-section" aria-labelledby="parents-calm-title">
      <div className="website-container">
        <motion.div {...reveal} className="parents-section-intro"><p className="website-eyebrow"><Leaf size={16} /> A change of pace</p><h2 id="parents-calm-title">Space to pause.<br /><span>Room to try again.</span></h2><p>A useful practice routine includes breaks. Calm Grove offers short breathing, grounding and focus activities within Matharia. Your child can choose a pause, and the game can suggest one after repeated setbacks or a longer session.</p></motion.div>
        <div className="parents-calm-showcase">
          <div className="parents-calm-picture"><img key={activity.id} src={WELLBEING_SCENES[activity.id]} alt={`${activity.name} artwork from Matharia’s Calm Grove`} loading="lazy" /><span>{activity.time}</span></div>
          <div className="parents-calm-details">
            <div className="parents-calm-options" role="group" aria-label="Explore the calm activities">{calmActivities.map((item, index) => <button key={item.id} type="button" aria-pressed={index === activityIndex} onClick={() => setActivityIndex(index)}>{item.name}</button>)}</div>
            <div className="parents-calm-description" aria-live="polite" aria-atomic="true"><p className="website-eyebrow">{activity.type}</p><h3>{activity.name}</h3><p>{activity.text}</p></div>
            <p className="parents-calm-note">A small pause, at their pace. These activities support everyday wellbeing; they are not mental health treatment. The side-to-side focus in Star Path is not EMDR therapy, which is provided by trained clinicians.</p>
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

    <ParentQuestions />

    <section className="website-container parents-final"><div><p className="website-eyebrow">A clear next step</p><h2>Choose practice that fits your family.</h2><p>Matharia is £4.99 a month or £49.99 a year for one child profile, with saved progress and your private dashboard. Lexcoria, our English adventure, is in development and is not included in current plans.</p></div><Link className="website-button website-button-gold" to="/subscriptions">Compare Matharia plans <ArrowRight size={18} /></Link></section>
  </main>;
}
