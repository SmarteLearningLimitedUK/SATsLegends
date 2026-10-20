import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookOpen, Copy, Check } from 'lucide-react';
import { useFamily } from './FamilyAccount';
import { articleUrl, getPost, journalArt, JournalPost, JournalSummary, listPosts, readingTime } from './services/journal';

export function JournalBody({ body }: { body: string }) {
  return <div className="journal-prose">{body.split(/\n\s*\n/).filter(Boolean).map((paragraph, i) => paragraph.startsWith('## ')
    ? <h2 key={i}>{paragraph.slice(3)}</h2> : <p key={i}>{paragraph}</p>)}</div>;
}

export default function Journal() {
  const family = useFamily();
  const [posts, setPosts] = useState<JournalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; listPosts().then(data => { if (active) setPosts(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const featured = posts[0];
  return <main id="website-main" className="journal">
    <header className="journal-masthead website-container"><span className="website-eyebrow"><BookOpen size={17} /> Ideas for the next adventure</span><h1>The Legends <em>Journal.</em></h1><p>Fresh perspectives on SATs revision, practical ideas for parents and news from the worlds of SATs Legends.</p>{family.isAdmin && <Link className="website-button website-button-gold" to="/admin/journal">Write a story <ArrowUpRight size={18} /></Link>}</header>
    {loading ? <p className="website-container" role="status">Opening the Journal…</p> : error ? <p className="website-container" role="status">{error}</p> : featured ? <>
      <Link className="journal-feature website-container" to={`/journal/${featured.slug}`}><img src={journalArt[featured.artwork]} alt="" fetchPriority="high" /><div><span className="website-eyebrow">Latest story · {featured.category}</span><h2>{featured.title}</h2><p>{featured.summary}</p><span>Read the story <ArrowUpRight size={18} /></span></div></Link>
      <section className="journal-stories website-container" aria-label="More stories">{posts.slice(1).map(post => <Link key={post.id} to={`/journal/${post.slug}`}><img src={journalArt[post.artwork]} alt="" loading="lazy" /><span className="website-eyebrow">{post.category}</span><h2>{post.title}</h2><p>{post.summary}</p><span>Read story ↗</span></Link>)}</section>
    </> : <section className="journal-empty website-container"><img src={journalArt.adventure} alt="A sunlit adventure in the world of SATs Legends" /><div><h2>A new chapter is on its way.</h2><p>Our first stories are being prepared. In the meantime, explore our practical revision guide.</p><Link className="website-button website-button-gold" to="/revision">Explore the revision guide <ArrowUpRight size={18} /></Link></div></section>}
  </main>;
}

export function JournalArticle() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<JournalPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { let active = true; setPost(null); setLoading(true); setError(''); setCopied(false); getPost(slug).then(data => { if (active) setPost(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [slug]);
  useEffect(() => { if (post) document.title = `${post.title} · The Legends Journal`; }, [post]);
  async function share() { if (!post) return; try { await navigator.clipboard.writeText(articleUrl(post.slug)); setCopied(true); } catch { setError('Copy this page’s address from your browser to share the story.'); } }
  return <main id="website-main" className="journal journal-article website-container"><Link to="/journal" className="journal-back"><ArrowLeft size={18} /> The Legends Journal</Link>{loading ? <p role="status">Loading story…</p> : post ? <article><header><span className="website-eyebrow">{post.category}</span><h1>{post.title}</h1><p className="journal-deck">{post.summary}</p><p><time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</time> · {readingTime(post.body)} min read · SATs Legends</p></header><img className="journal-cover" src={journalArt[post.artwork]} alt="" /><JournalBody body={post.body} /><button className="website-button website-button-outline" onClick={() => void share()}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'Link copied' : 'Copy story link'}</button></article> : <h1>{error || 'This story isn’t available.'}</h1>}{post && error && <p role="alert">{error}</p>}</main>;
}
