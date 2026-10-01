import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, Gamepad2, Lightbulb, Search } from 'lucide-react';
import { revisionTopics, RevisionTopic } from './content';

function TopicGuide({ topic }: { topic: RevisionTopic }) {
  const [answer, setAnswer] = useState<number | null>(null);
  const correct = answer === topic.correct;
  return <div className="website-guide" id={`guide-${topic.id}`}>
    <div className="website-guide-content"><h3>The essentials</h3><ol>{topic.steps.map(step => <li key={step}>{step}</li>)}</ol><div className="website-worked-example"><span>Worked example</span><p>{topic.example}</p></div><p className="website-tip"><Lightbulb size={20} /><span>{topic.tip}</span></p></div>
    <div className="website-quick-check"><p className="website-eyebrow">Your turn</p><h3>Quick check</h3><p>{topic.question}</p><div className="website-answer-options">{topic.answers.map((option, index) => <button key={option} aria-pressed={answer === index} className={answer === index ? (correct ? 'website-answer-correct' : 'website-answer-try') : ''} onClick={() => setAnswer(index)}>{option}{answer === index && correct && <CheckCircle2 size={18} />}</button>)}</div>{answer !== null && <div role="status" className="website-answer-feedback"><strong>{correct ? 'You’ve got it!' : 'Give it another go.'}</strong><p>{correct ? topic.explanation : 'Look back at the example, then try a different answer.'}</p></div>}<Link className="website-text-link" to={`/island/${topic.island}`}><Gamepad2 size={18} /> Practise in the game <ArrowRight size={17} /></Link></div>
  </div>;
}

export default function Revision() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('topic');
  const [category, setCategory] = useState('All topics');
  const [search, setSearch] = useState('');
  const filtered = revisionTopics.filter(topic => (category === 'All topics' || topic.category === category) && `${topic.title} ${topic.category} ${topic.description}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="website-resource-main website-container" id="website-main">
    <header className="website-resource-heading"><p className="website-eyebrow"><BookOpen size={17} /> The revision guide</p><h1>A little practice.<br /><span>A big power-up.</span></h1><p>Simple explanations. Clear examples. Small challenges.<br />Pick a topic and build your confidence, one step at a time.</p></header>
    <div className="website-resource-toolbar"><div className="website-filters" aria-label="Filter revision topics">{['All topics', ...revisionTopics.map(topic => topic.category)].map(item => <button className={category === item ? 'active' : ''} aria-pressed={category === item} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="website-search"><Search size={18} /><input type="search" aria-label="Search revision topics" placeholder="Find a topic…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    <div className="website-topic-list">{filtered.map(topic => <article className={`website-topic ${selected === topic.id ? 'website-topic-open' : ''}`} key={topic.id}><button className="website-topic-toggle" aria-expanded={selected === topic.id} aria-controls={`guide-${topic.id}`} onClick={() => setParams(selected === topic.id ? {} : { topic: topic.id }, { preventScrollReset: true })}><img src={topic.image} alt="" loading="lazy" /><span className="website-topic-text"><span className="website-topic-category">{topic.category}</span><h2>{topic.title}</h2><span>{topic.description}</span></span><span className="website-topic-open-label">{selected === topic.id ? 'Close guide' : 'Open guide'}</span><ChevronDown size={23} /></button>{selected === topic.id && <TopicGuide topic={topic} />}</article>)}</div>
    {filtered.length === 0 && <div className="website-empty"><Search size={30} /><h2>No topics found</h2><p>Try a different word or choose all topics.</p><button className="website-button website-button-outline" onClick={() => { setSearch(''); setCategory('All topics'); }}>Reset filters</button></div>}
    <div className="website-resource-note"><Lightbulb size={21} /><p>Keep it bite-sized. Try one guide, watch a lesson, then put it into practice in the game.</p><Link to="/videos" className="website-text-link">Find a video <ArrowRight size={17} /></Link></div>
  </main>;
}
