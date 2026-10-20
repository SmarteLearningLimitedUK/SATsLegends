import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useBeforeUnload } from 'react-router-dom';
import { useFamily } from './FamilyAccount';
import { JournalBody } from './Journal';
import { Channel, channelNames, channels, journalArt, JournalDraft, loadEditor, newDraft, publishDraft, saveDraft, SocialDelivery, unpublishDraft } from './services/journal';
import { downloadJournalGraphic, socialText } from './services/journalGraphic';

export default function JournalEditor() {
  const family = useFamily();
  const [drafts, setDrafts] = useState<JournalDraft[]>([]);
  const [draft, setDraft] = useState<JournalDraft>(newDraft);
  const [deliveries, setDeliveries] = useState<SocialDelivery[]>([]);
  const [selected, setSelected] = useState<Channel[]>([]);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const form = useRef<HTMLFormElement>(null);
  // The application uses BrowserRouter, so native beforeunload and explicit
  // confirmation on editor document changes protect unsaved work.
  useBeforeUnload(event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.('a[href]');
      if (anchor && !window.confirm('Leave the editor and discard unsaved changes?')) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    document.addEventListener('click', protect, true);
    return () => document.removeEventListener('click', protect, true);
  }, [dirty]);
  useEffect(() => {
    if (!family.isAdmin) return;
    let alive = true;
    loadEditor().then(data => { if (alive) { setDrafts(data.drafts); setDeliveries(data.deliveries); setReady(true); } }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [family.isAdmin]);
  function change<K extends keyof JournalDraft>(key: K, value: JournalDraft[K]) { setDraft(current => ({ ...current, [key]: value })); setDirty(true); setNotice(''); }
  function choose(next: JournalDraft) { if (dirty && !window.confirm('Discard your unsaved changes?')) return; setDraft(next); setDirty(false); setPreview(false); setSelected([]); setNotice(''); setError(''); }
  async function save(event?: FormEvent) {
    event?.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const saved = await saveDraft(draft); setDraft(saved); setDrafts(current => [saved, ...current.filter(item => item.id !== saved.id)]); setDirty(false); setNotice('Draft saved. Your live story has not changed.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); } finally { setBusy(false); }
  }
  async function publish() {
    if (!form.current?.reportValidity()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = dirty || !draft.revision ? await saveDraft(draft) : draft;
      setDraft(saved); setDrafts(current => [saved, ...current.filter(item => item.id !== saved.id)]); setDirty(false);
      await publishDraft(saved, selected);
      const data = await loadEditor(); setDeliveries(data.deliveries);
      setNotice(`Your story is live on the website.${selected.length ? ' Selected social posts are recorded below; account connections must be enabled before they can be sent.' : ''}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to publish.'); } finally { setBusy(false); }
  }
  async function unpublish() {
    if (!window.confirm('Remove this story from the public Journal? Social posts already sent will remain on their platforms.')) return;
    setBusy(true); setError(''); setNotice('');
    try { await unpublishDraft(draft.id); setNotice('Removed from the website. Your draft is retained. Unsent social posts have been cancelled.'); const data = await loadEditor(); setDeliveries(data.deliveries); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to unpublish.'); } finally { setBusy(false); }
  }
  async function exportGraphic() { try { await downloadJournalGraphic(draft); setNotice('Your 1080 × 1350 JPEG is ready to use on social media.'); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to export graphic.'); } }
  async function copyCaption(channel: Channel) { try { await navigator.clipboard.writeText(socialText(draft, channel)); setNotice(`${channelNames[channel]} caption copied. Check the story is published before sharing.`); } catch { setError('Clipboard access is unavailable. Select and copy your caption manually.'); } }
  if (family.loading || family.dataLoading) return <main id="website-main" className="website-container family-main"><p role="status">Checking staff access…</p></main>;
  if (!family.session) return <Navigate to="/login?next=/admin/journal" replace />;
  if (!family.isAdmin) return <main id="website-main" className="website-container family-main"><h1>Staff access required.</h1><Link to="/journal">Read the Journal</Link></main>;
  return <main id="website-main" className="journal-editor website-container"><header><span className="website-eyebrow">Staff publishing studio</span><h1>The Legends Journal</h1><p>Write once. Publish your story. Prepare a distinct post for each social channel.</p><Link to="/journal">View public Journal ↗</Link> · <Link to="/admin">Account administration</Link></header>
    {error && <p className="journal-message" role="alert">{error}</p>}{notice && <p className="journal-message" role="status">{notice} {notice.startsWith('Your story is live') && <Link to={`/journal/${draft.slug}`}>View story ↗</Link>}</p>}
    <div className="journal-workspace"><aside aria-label="Saved drafts"><button className="website-button website-button-outline" disabled={busy || !ready} onClick={() => choose(newDraft())}>New story</button><h2>Your drafts</h2>{drafts.length === 0 && <p>No saved drafts yet.</p>}{drafts.map(item => <button className={draft.id === item.id ? 'selected' : ''} disabled={busy} key={item.id} onClick={() => choose(item)}>{item.title || 'Untitled story'}<small>Revision {item.revision}</small></button>)}</aside>
    <form ref={form} onSubmit={event => void save(event)}><fieldset disabled={busy || !ready}>
      <label>Story title<input required maxLength={110} value={draft.title} onChange={e => change('title', e.target.value)} /></label>
      <label>Web address<span>satslegends.com/journal/</span><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={90} value={draft.slug} onChange={e => change('slug', e.target.value.toLowerCase())} placeholder="five-ways-to-build-revision-confidence" /><small>Choose carefully: the address stays fixed after first publication.</small></label>
      <label>Introduction<textarea required rows={3} maxLength={320} value={draft.summary} onChange={e => change('summary', e.target.value)} /></label>
      <div className="journal-form-row"><label>Topic<select value={draft.category} onChange={e => change('category', e.target.value)}>{['Revision tips', 'For parents', 'Inside Matharia', 'Inside Lexcoria', 'Legends news'].map(value => <option key={value}>{value}</option>)}</select></label><label>Story artwork<select value={draft.artwork} onChange={e => change('artwork', e.target.value as JournalDraft['artwork'])}><option value="adventure">World of adventure · landscape</option><option value="legends">Meet the legends · portrait</option></select></label></div>
      <label>Story<textarea required rows={16} minLength={80} maxLength={30000} value={draft.body} onChange={e => change('body', e.target.value)} /><small>Separate paragraphs with a blank line. Start a heading with ## followed by a space. HTML is displayed as text.</small></label>
      <div className="journal-controls"><button className="website-button website-button-outline" type="submit">{busy ? 'Working…' : 'Save draft'}</button><button type="button" className="website-button website-button-outline" onClick={() => setPreview(value => !value)} aria-expanded={preview}>{preview ? 'Hide preview' : 'Preview story'}</button><span>{dirty ? 'Unsaved changes' : draft.revision ? `Saved · revision ${draft.revision}` : 'New draft'}</span></div>
      {preview && <section className="journal-preview" aria-label="Story preview"><span className="website-eyebrow">Preview · only visible to you</span><h2>{draft.title || 'Your story title'}</h2><p>{draft.summary}</p><img src={journalArt[draft.artwork]} alt="" /><JournalBody body={draft.body} /></section>}
      <section className="journal-social"><h2>Take the story further.</h2><p>Publish the full article here, with a tailored social post for each selected channel. Accounts are not connected yet; selecting a channel records a request, it does not send a post.</p><p>Your profiles: <a href="https://www.facebook.com/SATsLegends/" target="_blank" rel="noopener noreferrer">SATs Legends on Facebook ↗</a> · <a href="https://www.instagram.com/satslegends/" target="_blank" rel="noopener noreferrer">@satslegends on Instagram ↗</a></p><button type="button" className="website-button website-button-outline" disabled={!draft.title.trim()} onClick={() => void exportGraphic()}>Download social image · JPEG</button>
      {channels.map(channel => <div className="journal-channel" key={channel}><label className="journal-checkbox"><input type="checkbox" checked={selected.includes(channel)} onChange={e => setSelected(current => e.target.checked ? [...current, channel] : current.filter(item => item !== channel))} />{channelNames[channel]} <small>Connection required</small></label><label>{channelNames[channel]} caption<textarea rows={channel === 'x' ? 2 : 4} maxLength={channel === 'x' ? 240 : channel === 'instagram' ? 2000 : 4000} value={draft.captions[channel]} onChange={e => change('captions', { ...draft.captions, [channel]: e.target.value })} placeholder={channel === 'instagram' ? 'An image-led introduction to your story. Read the full story via the link in our bio.' : 'Why should someone read this story?'} /></label><small>{channel === 'instagram' ? 'Requires a professional Instagram account. Image + caption; article links in captions are not clickable. Set your bio link to satslegends.com/journal.' : 'The published article link is added automatically.'}</small><div><button type="button" disabled={!draft.slug || !draft.captions[channel]} className="website-button website-button-outline" onClick={() => void copyCaption(channel)}>Copy {channelNames[channel]} post</button></div></div>)}</section>
      <div className="journal-controls"><button className="website-button website-button-gold" type="button" onClick={() => void publish()}>Publish to website{selected.length ? ' & request social posts' : ''}</button>{draft.revision > 0 && <button className="website-button website-button-outline" type="button" onClick={() => void unpublish()}>Unpublish from website</button>}</div>
    </fieldset></form></div>
    <section className="journal-deliveries"><h2>Social publication record</h2><p>Requests are deduplicated for each story revision and channel. Publishing the same saved revision again will not create another request.</p>{deliveries.length === 0 ? <p>No social posts requested.</p> : <ul>{deliveries.map(item => <li key={item.id}><strong>{drafts.find(post => post.id === item.post_id)?.title || 'Story'} · {channelNames[item.channel]}</strong><span>Revision {item.revision} · {item.status.replaceAll('_', ' ')}</span>{item.error && <p>{item.error}</p>}{item.remote_url && /^https:\/\/(www\.)?(x\.com|instagram\.com|facebook\.com)\//.test(item.remote_url) && <a href={item.remote_url} rel="noopener noreferrer" target="_blank">View social post ↗</a>}</li>)}</ul>}</section>
  </main>;
}
