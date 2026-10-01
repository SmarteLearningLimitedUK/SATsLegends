import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock3, Play, Video, X } from 'lucide-react';
import { videoLessons } from './content';

const publicBase = import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL;

function LessonPlayer({ lesson, onClose }: { lesson: typeof videoLessons[number]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="website-video-dialog" onClose={onClose} aria-labelledby="website-video-title" onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current.close(); } }}>
    <div className="website-video-dialog-header"><span className="website-eyebrow">{lesson.category} · Visual lesson</span><button autoFocus className="website-icon-button" aria-label="Close video" onClick={() => dialog.current?.close()}><X size={22} /></button></div>
    <video controls autoPlay playsInline preload="metadata" aria-label={lesson.title} key={lesson.id}>
      <source src={`${publicBase}lessons/${lesson.id}.mp4`} type="video/mp4" />
      <source src={`${publicBase}lessons/${lesson.id}.webm`} type="video/webm" />
      <track kind="captions" src={`${publicBase}lessons/${lesson.id}.vtt`} srcLang="en" label="English" default />
      Your browser cannot play this video. Read the matching revision guide below.
    </video>
    <div className="website-video-dialog-content"><h2 id="website-video-title">{lesson.title}</h2><p>{lesson.description} This lesson has on-screen text and no audio.</p><Link className="website-text-link" to={`/revision?topic=${lesson.topic}`} onClick={onClose}><BookOpen size={18} /> Open the matching guide <ArrowRight size={18} /></Link></div>
  </dialog>;
}

export default function Videos() {
  const [category, setCategory] = useState('All videos');
  const [selected, setSelected] = useState<typeof videoLessons[number] | null>(null);
  const lessons = videoLessons.filter(lesson => category === 'All videos' || category === lesson.category);
  return <main className="website-resource-main website-container" id="website-main">
    <header className="website-resource-heading"><p className="website-eyebrow"><Video size={17} /> The video area</p><h1>Press play.<br /><span>Make it click.</span></h1><p>Short visual walkthroughs for those tricky maths moments.<br />Pause, replay, then try it for yourself.</p></header>
    <div className="website-resource-toolbar"><div className="website-filters" aria-label="Filter videos">{['All videos', 'Number', 'Fractions', 'Geometry'].map(item => <button className={category === item ? 'active' : ''} aria-pressed={category === item} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><span className="website-video-count">{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} · On-screen explanations</span></div>
    <div className="website-video-grid">{lessons.map(lesson => <article className="website-video-card" key={lesson.id}><button onClick={() => setSelected(lesson)} className="website-video-thumbnail" aria-label={`Watch ${lesson.title}`}><img src={lesson.image} alt="" loading="lazy" /><span className="website-video-play"><Play size={25} fill="currentColor" /></span><span className="website-video-duration"><Clock3 size={13} />{lesson.duration}</span></button><div className="website-video-card-copy"><p className="website-topic-category">{lesson.category}</p><h2><button onClick={() => setSelected(lesson)}>{lesson.title}</button></h2><p>{lesson.description}</p><Link className="website-text-link" to={`/revision?topic=${lesson.topic}`}>Read the guide <ArrowRight size={16} /></Link></div></article>)}</div>
    <section className="website-video-learning-tip"><span className="website-path-icon"><BookOpen size={29} /></span><div><h2>Watch it. Try it. Own it.</h2><p>A video is just the beginning. Open the matching revision guide for a quick check, then try the topic in the game.</p></div><Link className="website-button website-button-outline" to="/revision">Explore revision <ArrowRight size={18} /></Link></section>
    {selected && <LessonPlayer lesson={selected} onClose={() => setSelected(null)} />}
  </main>;
}
