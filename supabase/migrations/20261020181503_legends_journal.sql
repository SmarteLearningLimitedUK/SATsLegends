-- Drafts and social captions never share the public article table.
create table public.journal_drafts (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (length(slug) between 1 and 90 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 1 and 110),
  summary text not null check (length(trim(summary)) between 1 and 320),
  body text not null check (length(trim(body)) between 80 and 30000),
  category text not null check (category in ('Revision tips','For parents','Inside Matharia','Inside Lexcoria','Legends news')),
  artwork text not null check (artwork in ('adventure','legends')),
  captions jsonb not null default '{}' check (jsonb_typeof(captions) = 'object'),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  published_slug text,
  updated_by uuid references auth.users(id) on delete set null
);
create table public.journal_posts (
  id uuid primary key references public.journal_drafts(id) on delete cascade,
  slug text not null unique,
  title text not null, summary text not null, body text not null,
  category text not null, artwork text not null,
  revision integer not null,
  published_at timestamptz not null default now()
);
create table public.journal_deliveries (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.journal_drafts(id) on delete cascade,
  revision integer not null,
  channel text not null check (channel in ('x','instagram','facebook')),
  status text not null default 'awaiting_connection' check (status in ('awaiting_connection','queued','sending','sent','needs_review','failed','cancelled')),
  snapshot jsonb not null,
  error text,
  remote_url text,
  created_at timestamptz not null default now(),
  unique(post_id,revision,channel)
);
alter table public.journal_drafts enable row level security;
alter table public.journal_posts enable row level security;
alter table public.journal_deliveries enable row level security;
revoke all on public.journal_drafts,public.journal_posts,public.journal_deliveries from anon,authenticated;
grant select on public.journal_posts to anon,authenticated;
grant select on public.journal_drafts,public.journal_deliveries to authenticated;
grant all on public.journal_drafts,public.journal_posts,public.journal_deliveries to service_role;
create policy journal_public_read on public.journal_posts for select to anon,authenticated using (true);
create policy journal_staff_drafts on public.journal_drafts for select to authenticated using (public.is_staff());
create policy journal_staff_deliveries on public.journal_deliveries for select to authenticated using (public.is_staff());

create function public.journal_save_draft(payload jsonb, expected_revision integer)
returns public.journal_drafts language plpgsql security definer set search_path='' as $$
declare existing public.journal_drafts; saved public.journal_drafts; target uuid; captions jsonb;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if jsonb_typeof(payload) <> 'object' or octet_length(payload::text)>160000 then raise exception 'Invalid story'; end if;
  target := (payload->>'id')::uuid;
  -- Serialize creation too, so two simultaneous first saves cannot overwrite.
  perform pg_advisory_xact_lock(hashtextextended(target::text, 0));
  select * into existing from public.journal_drafts where id=target for update;
  if coalesce(existing.revision,0) <> expected_revision then raise exception 'This draft changed in another session. Reload before saving.'; end if;
  if existing.published_slug is not null and existing.published_slug <> payload->>'slug' then raise exception 'A published story address cannot be changed'; end if;
  captions := jsonb_build_object('x',coalesce(payload->'captions'->>'x',''),'instagram',coalesce(payload->'captions'->>'instagram',''),'facebook',coalesce(payload->'captions'->>'facebook',''));
  if length(captions->>'x')>240 or length(captions->>'instagram')>2000 or length(captions->>'facebook')>4000 then raise exception 'Social caption is too long'; end if;
  insert into public.journal_drafts(id,slug,title,summary,body,category,artwork,captions,revision,updated_by)
    values(target,payload->>'slug',trim(payload->>'title'),trim(payload->>'summary'),trim(payload->>'body'),payload->>'category',payload->>'artwork',captions,expected_revision+1,auth.uid())
  on conflict(id) do update set slug=excluded.slug,title=excluded.title,summary=excluded.summary,body=excluded.body,category=excluded.category,artwork=excluded.artwork,captions=excluded.captions,revision=excluded.revision,updated_at=now(),updated_by=auth.uid()
  returning * into saved;
  return saved;
end $$;

create function public.journal_publish(draft_id uuid, expected_revision integer, selected_channels text[] default '{}')
returns void language plpgsql security definer set search_path='' as $$
declare draft public.journal_drafts; target_channel text;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into draft from public.journal_drafts where id=draft_id for update;
  if draft.id is null or draft.revision <> expected_revision then raise exception 'Draft changed. Save and reload before publishing.'; end if;
  if cardinality(selected_channels)>3 or not selected_channels <@ array['x','instagram','facebook']::text[] then raise exception 'Invalid social channels'; end if;
  if exists(select 1 from public.journal_posts where id=draft_id and slug<>draft.slug) then raise exception 'A published story address cannot be changed'; end if;
  insert into public.journal_posts(id,slug,title,summary,body,category,artwork,revision)
    values(draft.id,draft.slug,draft.title,draft.summary,draft.body,draft.category,draft.artwork,draft.revision)
  on conflict(id) do update set title=excluded.title,summary=excluded.summary,body=excluded.body,category=excluded.category,artwork=excluded.artwork,revision=excluded.revision;
  update public.journal_drafts set published_slug=draft.slug where id=draft_id;
  foreach target_channel in array selected_channels loop
    if length(trim(draft.captions->>target_channel))=0 then raise exception 'Write a caption for each selected social channel'; end if;
    insert into public.journal_deliveries(post_id,revision,channel,snapshot)
      values(draft.id,draft.revision,target_channel,jsonb_build_object('title',draft.title,'slug',draft.slug,'artwork',draft.artwork,'caption',draft.captions->>target_channel))
    on conflict(post_id,revision,channel) do nothing;
  end loop;
end $$;

create function public.journal_unpublish(draft_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  perform 1 from public.journal_drafts where id=draft_id for update;
  if exists(select 1 from public.journal_deliveries where post_id=draft_id and status='sending') then raise exception 'A social post is being sent. Wait for it to finish before unpublishing.'; end if;
  delete from public.journal_posts where id=draft_id;
  update public.journal_deliveries set status='cancelled' where post_id=draft_id and status in ('awaiting_connection','queued','failed');
end $$;
revoke all on function public.journal_save_draft(jsonb,integer),public.journal_publish(uuid,integer,text[]),public.journal_unpublish(uuid) from public,anon;
grant execute on function public.journal_save_draft(jsonb,integer),public.journal_publish(uuid,integer,text[]),public.journal_unpublish(uuid) to authenticated;

-- One original welcome story. Never send seed content to social platforms.
with welcome as (
  insert into public.journal_drafts(slug,title,summary,body,category,artwork,published_slug)
  values('welcome-to-the-legends-journal','A new chapter in your child’s revision journey.',
    'Practical revision ideas, a clearer view of progress and stories from the worlds of SATs Legends. Welcome to the Journal.',
    E'Revision works best when families have a clear place to start. The Legends Journal is our home for practical ideas, helpful explanations and news from SATs Legends.\n\n## A companion to classroom learning\n\nSATs Legends helps children revisit and practise skills they learn at school. It is a revision companion: a way to make time for practice at home, alongside their classroom learning and their teacher’s guidance.\n\n## Start with one focus\n\nChoose a topic your child would like to practise. Give them time to have a go, talk through a tricky answer and recognise the effort they put in. A useful session does not have to cover everything.\n\n## Keep sight of their progress\n\nYour private parent dashboard brings together saved activity, answer accuracy, strengths and areas to revisit. Use it to start a conversation about what felt easier, what felt harder and what they would like to try next. Reports stay behind your parent login.\n\n## Two worlds, one family of adventures\n\nMatharia turns maths revision into an adventure. Its English sister game, Lexcoria, is in development. We will share updates here as that world takes shape.\n\n## More to come\n\nLook out for revision tips, parent guides and news from behind the scenes. We are building this space to help you feel informed, involved and ready for the next chapter.',
    'Legends news','adventure','welcome-to-the-legends-journal') returning *
)
insert into public.journal_posts(id,slug,title,summary,body,category,artwork,revision)
select id,slug,title,summary,body,category,artwork,revision from welcome;
