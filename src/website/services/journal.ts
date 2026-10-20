import { supabase } from './supabase';
import landscape from '../../assets/website/premium/hero-cinematic-wide.webp';
import mobile from '../../assets/website/premium/hero-cinematic-mobile.webp';

export const journalArt = { adventure: landscape, legends: mobile };
export type JournalArt = keyof typeof journalArt;
export const channels = ['x', 'instagram', 'facebook'] as const;
export type Channel = typeof channels[number];
export const channelNames: Record<Channel, string> = { x: 'X', instagram: 'Instagram', facebook: 'Facebook' };
export type JournalPost = { id: string; slug: string; title: string; summary: string; body: string; category: string; artwork: JournalArt; published_at: string; revision: number };
export type JournalSummary = Omit<JournalPost, 'body'>;
export type JournalDraft = Omit<JournalPost, 'published_at'> & { captions: Record<Channel, string>; updated_at?: string };
export type SocialDelivery = { id: string; post_id: string; revision: number; channel: Channel; status: string; error: string | null; remote_url: string | null };

export const newDraft = (): JournalDraft => ({ id: crypto.randomUUID(), slug: '', title: '', summary: '', body: '', category: 'Revision tips', artwork: 'adventure', revision: 0, captions: { x: '', instagram: '', facebook: '' } });
export function articleUrl(slug: string) { return `https://satslegends.com/journal/${encodeURIComponent(slug)}`; }
export function readingTime(body: string) { return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200)); }
export async function listPosts() {
  if (!supabase) throw new Error('The Journal is unavailable. Please try again later.');
  const { data, error } = await supabase.from('journal_posts').select('id,slug,title,summary,category,artwork,published_at,revision').order('published_at', { ascending: false }).limit(100);
  if (error) throw new Error('The Journal is being prepared. Please check back soon.');
  return data as JournalSummary[];
}
export async function getPost(slug: string) {
  if (!supabase) throw new Error('The Journal is unavailable.');
  const { data, error } = await supabase.from('journal_posts').select('*').eq('slug', slug).maybeSingle();
  if (error) throw new Error('Unable to load this story. Please try again.');
  return data as JournalPost | null;
}
export async function loadEditor() {
  if (!supabase) throw new Error('Please log in again.');
  const [drafts, deliveries] = await Promise.all([
    supabase.from('journal_drafts').select('*').order('updated_at', { ascending: false }),
    supabase.from('journal_deliveries').select('id,post_id,revision,channel,status,error,remote_url').order('created_at', { ascending: false }).limit(100),
  ]);
  if (drafts.error || deliveries.error) throw new Error('Journal publishing is not connected yet. The Journal database needs to be enabled before you can save or publish.');
  return { drafts: drafts.data as JournalDraft[], deliveries: deliveries.data as SocialDelivery[] };
}
export async function saveDraft(draft: JournalDraft) {
  const { data, error } = await supabase!.rpc('journal_save_draft', { payload: draft, expected_revision: draft.revision });
  if (error) throw new Error(error.message);
  return data as JournalDraft;
}
export async function publishDraft(draft: JournalDraft, selected: Channel[]) {
  const { error } = await supabase!.rpc('journal_publish', { draft_id: draft.id, expected_revision: draft.revision, selected_channels: selected });
  if (error) throw new Error(error.message);
}
export async function unpublishDraft(id: string) {
  const { error } = await supabase!.rpc('journal_unpublish', { draft_id: id });
  if (error) throw new Error(error.message);
}
