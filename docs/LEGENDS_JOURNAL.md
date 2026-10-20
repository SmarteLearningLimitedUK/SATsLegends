# The Legends Journal

## Routes and workflow

- `/journal`: public stories, newest first (up to 100).
- `/journal/:slug`: published story, readable without a subscription.
- `/admin/journal`: existing staff login required. Also linked from Admin.
- Write a title, permanent address, introduction and story. Separate paragraphs with blank lines; use `## ` for headings. HTML is rendered as text.
- Save draft keeps the live article unchanged. Publish atomically copies the saved revision to the public table.
- Unpublish removes the public article and cancels unsent social requests; it retains the draft and permanent address.
- The initial welcome article is original SATs Legends copy. It does not queue any social posts.

## Social publishing: activation still required

Owner supplied profiles:

- Facebook Page: https://www.facebook.com/SATsLegends/
- Instagram: https://www.instagram.com/satslegends/
- X was removed at the owner’s request.

**Automatic distribution is not enabled. No platform has been authorised and no social API worker or scheduler is deployed.** Selecting a channel on publication creates an `awaiting_connection` record. This is a record of intent, not a successful delivery. Do not automatically flush old requests when connections are eventually enabled: the owner must review which historical requests should be sent.

The editor already provides independent captions and exports an original branded 1080 × 1350 JPEG with game artwork and the article title. Copy buttons add the article URL for Facebook. Instagram captions do not have clickable article links; point the profile's bio link to the Journal. The owner can use this kit manually before API integration.

Remaining connection work:

1. Confirm Instagram is Business or Creator. Confirm Facebook Page ownership and its link to the Facebook Page.
2. Register/configure the required Meta developer application, approved redirect URLs and platform permissions. Use user-authorised OAuth; keep refresh/access tokens exclusively in a protected server-side store.
3. Meta's Facebook Login route requires a linked Page, `instagram_basic`, `instagram_content_publish`, `pages_show_list` and `pages_read_engagement` for Instagram; Page publishing also requires `pages_manage_posts`. Alternative Instagram Login permissions differ. Verify current official docs during setup. Normal personal Instagram profiles and personal Facebook timelines are not publishing targets.
4. Implement the server delivery worker with atomic claims, explicit enablement, platform-specific validation, publicly retrievable JPEG assets and persistent Instagram container IDs. Apply the current Graph API version. Implement token expiry/reconnection.
5. Mark an uncertain network outcome `needs_review`; do not blindly retry a possibly successful social create. Store remote IDs/URLs and reconcile before retries. Cancel obsolete requests on newer article publication or unpublication.
6. Provide server-rendered, article-specific canonical/Open Graph metadata on the Apache host (the current website is a client-rendered SPA). Client-side title updates alone do not create article-specific crawler previews.
7. Connect and test a real owner-approved post on each channel. Only then replace “Connection required” and enable automatic delivery.

Official references:

- https://developers.facebook.com/docs/pages-api/posts/
- https://developers.facebook.com/docs/instagram-platform/content-publishing/
- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Database rollout

Applied to production `znwqfeqzzlyytbfsakqj` on 20 October 2026 through the SQL Editor, in a transaction, after owner approval. Live REST checks verified the public welcome article and anonymous denial for drafts and delivery records. This project has no `supabase_migrations.schema_migrations` table, so the manual application is documented here rather than recorded in CLI migration history.

Apply **only** `supabase/migrations/20261020181503_legends_journal.sql` to production. Do not apply unrelated pending store-entitlement migrations as part of this feature.

Three tables, all RLS enabled:

- `journal_drafts`: staff-only reads; mutation only through staff-checked RPCs. Captions and staff IDs remain private.
- `journal_posts`: public published snapshots; no client direct writes.
- `journal_deliveries`: staff-only delivery records; service-role writes reserved for a future worker.

RPCs check `is_staff()` (including the existing suspension check), have an empty search path and revoke anonymous/default execution. Optimistic revision checks prevent lost updates; a per-draft lock serializes first-save races. `(post_id, revision, channel)` prevents duplicate requests. Published addresses stay reserved after unpublication.

The migration grants no public access to parent/child data and does not change accounts, subscriptions, game saves or billing.

## Verification

- `npm run lint`
- `npm run verify:journal-db`: PGlite checks draft privacy, staff role, direct-write denial, revision conflict, channel validation, duplicate request protection, snapshot separation, unpublish, address reservation and suspension.
- `npm run verify:production-db`: all public tables still RLS protected; original billing/account checks pass.
- Browser fixtures: start Vite with `VITE_SUPABASE_URL=https://journal-qa.supabase.co` and `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture`; then run `JOURNAL_QA_URL=http://127.0.0.1:<port> JOURNAL_QA_BACKEND=https://journal-qa.supabase.co npm run verify:journal-ui`. Fixture intercepts every backend request. It creates no real data.
- Browser suite covers editor workflow/JPEG export and 24 layouts across 320, 390, 768, 1024, 1251, 1366, 1440 and 1920 pixels, plus unavailable-backend and nonstaff states. Chromium verification is not physical iOS/Android certification.
- Production build succeeded; existing large game bundle warnings remain.

## Scope and assumptions

Only staff publish; articles are public; parent reports remain private. Uses existing React/Vite, family auth, Supabase staff role and game artwork. No external legacy systems or assumptions were used.

Changed source: `Website.tsx`, `WebsiteRoot.tsx`, `AdminDashboard.tsx`, new `Journal.tsx`, `JournalEditor.tsx`, `journal.css`, `services/journal.ts`, `services/journalGraphic.ts`, Journal migration, database/browser verification scripts, package scripts and CI database gate.
