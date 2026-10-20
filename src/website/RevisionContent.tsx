import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ChartNoAxesCombined, Gamepad2, Video } from 'lucide-react';
import { englishReleased, englishTesting } from './englishRelease';

const tools = [
  { icon: Gamepad2, title: 'Interactive maths practice', text: 'Apply a skill in a game challenge, get feedback and return for another try.', route: '/play', link: 'Explore Matharia' },
  { icon: BookOpen, title: 'Help with the method', text: 'Use clear explanations, worked examples and quick checks when a topic needs another look.', route: '/revision', link: 'Browse revision guides' },
  { icon: Video, title: 'Visual lessons', text: 'Watch a maths idea take shape before putting it into practice yourself.', route: '/videos', link: 'See the lessons' },
  { icon: ChartNoAxesCombined, title: 'Progress for parents', text: 'See saved activity, answer accuracy, strongest topics and suggestions for next practice.', route: '/for-parents', link: 'See the parent benefits' },
];

export function RevisionOverview() {
  const id = useId();
  return <section id="what-is-sats-legends" className="revision-overview" aria-labelledby={id}><div className="website-container">
    <div className="revision-content-intro"><p className="website-eyebrow">Support for Years 5 & 6</p><h2 id={id}>What is SATs Legends?</h2><p>A revision companion that brings practice, explanations and a parent’s view of progress into one place.</p><p>Matharia gives your child ways to revisit KS2 maths at home. Choose a topic from school, work through a method and try it in an adventure. Keep practice focused and manageable, with room to pause and come back.</p></div>
    <div className="revision-tools">{tools.map(({ icon: Icon, title, text, route, link }) => <article key={title}><Icon size={25} aria-hidden="true" /><h3>{title}</h3><p>{text}</p><Link className="website-text-link" to={route}>{link}<ArrowRight size={17} /></Link></article>)}</div>
  </div></section>;
}

export function RevisionBenefits() {
  const id = useId();
  return <section id="why-sats-legends" className="revision-benefits" aria-labelledby={id}><div className="website-container">
    <div className="revision-content-intro"><p className="website-eyebrow">Built around your family</p><h2 id={id}>Why choose SATs Legends?</h2><p>Give your child a reason to return to revision, and give yourself a clearer picture of how it’s going.</p></div>
    <ol>{[
      ['Make space for confidence', 'A tricky question can be the start of a useful conversation. Revisit the explanation, try a method and recognise the effort behind an answer.'],
      ['Focus on the skills that need practice', 'Your dashboard highlights stronger topics and areas to revisit from saved answers. Use those insights to choose a useful next focus together.'],
      ['Keep revision engaging', 'Different challenges, explorable islands and rewards give maths practice a sense of purpose. Your child works towards the next step in their adventure.'],
      ['Stay involved without hovering', 'Check saved activity and accuracy in your private parent account. Optional progress emails help you keep up with their practice between visits.'],
    ].map(([title, text], index) => <li key={title}><span aria-hidden="true">0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
  </div></section>;
}

export function RevisionCoverage() {
  const id = useId();
  return <section id="revision-subjects" className="revision-coverage" aria-labelledby={id}><div className="website-container">
    <div className="revision-content-intro"><p className="website-eyebrow">The subjects behind the adventures</p><h2 id={id}>What can your child practise?</h2><p>Matharia covers maths. Lexcoria is our English sister game, with its own access and progress.</p></div>
    <div className="revision-subjects">
      <article><p className="website-eyebrow">Maths · Matharia</p><h3>Strengthen the maths foundations.</h3><p>Practise calculations and reasoning through game challenges, with guides and visual lessons to revisit a method.</p><ul><li>Place value, rounding and arithmetic</li><li>Fractions, decimals and percentages</li><li>Angles, shapes, area and perimeter</li><li>Graphs, averages, ratio and problem-solving</li></ul><Link className="website-button website-button-gold" to="/play">Explore Matharia <ArrowRight size={18} /></Link><p className="revision-subject-note">Matharia plans cover maths for one child profile.</p></article>
      <article><p className="website-eyebrow">English · Lexcoria · {englishReleased ? 'Released' : englishTesting ? 'Gated playtest' : 'In development'}</p><h3>Discover the power of English.</h3><p>A separate revision adventure built around reading and the choices that make writing clear.</p><ul><li>Reading comprehension and evidence</li><li>Grammar and sentence structure</li><li>Punctuation choices</li><li>Spelling practice</li></ul><Link className="website-button website-button-gold" to="/english">Explore Lexcoria <ArrowRight size={18} /></Link><p className="revision-subject-note">{englishReleased ? 'An English or combined plan is required.' : 'English and combined plans are not on sale yet. Lexcoria is not included in Matharia plans.'}</p></article>
    </div>
  </div></section>;
}
