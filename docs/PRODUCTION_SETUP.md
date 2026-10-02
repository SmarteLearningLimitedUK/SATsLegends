# SATs Legends Matharia: production setup

> **Historical architecture and setup notes.** This file describes an earlier FTP deployment path and service estimates. Use [RELEASE_READINESS.md](RELEASE_READINESS.md) for the current release gate; verify live Cloudflare, Supabase, Stripe and email configuration in their dashboards.

> This document describes the earlier Supabase/Resend/FTP architecture and cost. For the current IONOS domain and a Cloudflare Pages preview, start with [DEPLOYMENT_FOR_BEGINNERS.md](DEPLOYMENT_FOR_BEGINNERS.md). The lower-cost account/report backend discussed there has not been implemented.

## Agreed product

- Domain: `satslegends.com`, bought through GoDaddy. Website files will be uploaded by FTP to the existing server.
- Parent/guardian email account with email confirmation, password login and password reset.
- £4.99 GBP per month or £49.99 GBP per year, automatically renewing, for **one child profile**.
- Matharia plays in the browser. English is in development and is **not included** in this subscription.
- Report emails are scheduled for **Sunday 15:00 and Wednesday 16:00, Europe/London**. The scheduler adjusts for GMT/BST.
- Emails link to `/parent/progress/<child-id>`. That page requires the owning parent's login and remains readable after a subscription ends.
- Reports show the latest cumulative saved progress. They are not exam grades or a separate assessment.

## Deployment architecture

The existing React + TypeScript + Vite website/game stays on the existing web server. FTP hosting does not need Node, PHP or a database installed there for this implementation.

Supabase supplies authentication, PostgreSQL, row-level permissions, three backend functions and the report scheduler. Stripe supplies checkout and subscription management. Resend supplies authentication email via SMTP and report email via its API. No service-role, Stripe or email secret is shipped to the browser.

No external accounts have been provisioned. Signup, payments and email are **not live** until the steps below are completed. An unconfigured production build blocks game access. Developer builds and explicitly enabled previews can still show the standalone game.

### Running costs, checked 29 September 2026

| Service | Starting cost | Notes |
|---|---:|---|
| Existing server | Your existing hosting cost | Confirm bandwidth, HTTPS and browser-route rewriting with your host. |
| [Supabase Pro](https://supabase.com/pricing) | US$25/month | Includes one Micro project and its compute credit; larger compute and usage can add costs. Free is suitable for development, without production backups and with inactivity pausing. |
| [Resend Pro](https://resend.com/pricing) | US$20/month | 50,000 emails/month, no daily sending cap. 1,000 parents receiving twice-weekly reports use roughly 8,700 reports/month, plus account emails. Free allows 3,000/month and 100/day, so it cannot cover that volume. |
| [Stripe UK pay as you go](https://stripe.com/gb/pricing) | Per payment | Standard UK cards: 1.5% + 20p; Stripe Billing: an additional 0.7% of Billing volume. Other cards/services differ. |

Starting managed-service budget: **US$45/month plus existing hosting/domain costs, Stripe fees, tax and any usage/compute upgrades**. This is a launch estimate, not a guarantee that the smallest database meets 1,000-player peak demand.

## 1. Create the backend

1. Create a Supabase account and a project. Choose the London region if available and use Pro before paid production launch.
2. Run `supabase/migrations/202609290001_family_accounts.sql` once in the project's SQL editor, or use the Supabase CLI migration workflow.
3. Keep email confirmation enabled. In Auth settings set Site URL to `https://satslegends.com` and allow:
   - `https://satslegends.com/auth/callback**`
   - `https://satslegends.com/reset-password`
4. Enable a minimum password length of 10, leaked password protection where available, and suitable authentication rate limits for the planned launch.
5. Copy the project URL and **publishable key** into a local `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_ASSET_BASE=/
VITE_ALLOW_GAME_PREVIEW=false
```

The publishable key is deliberately public. Never use a secret/service-role key in `VITE_*` settings. The browser accesses tables through the migration's permissions and row-level policies.

## 2. Configure Stripe (test mode first)

1. Create/activate the business's Stripe account. Use test mode for initial verification.
2. Create a product named **SATs Legends Matharia** with two GBP recurring prices:
   - Monthly: 499 pence, interval `month`, interval count 1.
   - Yearly: 4999 pence, interval `year`, interval count 1.
   - Quantity stays one. Do not configure automatic tax to add an undisclosed extra charge to these advertised prices.
3. Put the actual price IDs in the database (these are identifiers, not secrets):

```sql
update public.products
set monthly_price_id = 'price_YOUR_MONTHLY_ID',
    yearly_price_id = 'price_YOUR_YEARLY_ID'
where code = 'matharia';
```

4. Enable the Stripe customer portal: invoices, payment-method updates and **cancellation at the end of the paid period**. If enabling plan changes, allow only these two Matharia prices with suitable prorations. Keep the profile limit at one.
5. Add the business contact, terms/privacy and cancellation details to the Stripe checkout configuration.

For **PayPal**, activate it in Stripe Payment methods and connect the business's PayPal account. Confirm recurring-payment access is active; some accounts need approval. Set `STRIPE_PAYPAL_ENABLED=true` in the backend only after activation (test and live modes separately). Checkout then explicitly offers card and PayPal for both plans. Leave it `false` while approval is pending. Test both methods, renewals and revoking a PayPal agreement. Full instructions and security changes: [PARENTS_PAYPAL_SECURITY.md](PARENTS_PAYPAL_SECURITY.md).
6. Add these **Supabase function secrets**, through its dashboard or a private CLI env file:
   - `APP_URL=https://satslegends.com`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (after registering the endpoint below)
7. Deploy `billing` and `stripe-webhook`. `supabase/config.toml` disables gateway JWT checks because the functions do their own authentication: verified parent access token for billing, Stripe signature for webhooks.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy billing
npx supabase functions deploy stripe-webhook
```

8. Register a Stripe webhook at `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, and `customer.subscription.resumed`. The pinned Stripe SDK currently uses API version `2026-08-26.dahlia`; use that version for this event destination.
9. Copy its signing secret into Supabase. A checkout success URL alone never grants access; a verified webhook updates the subscription mirror.

Checkout validates the configured amounts/currency on the server, derives the customer from the authenticated parent, serializes checkout requests, reuses open sessions and checks Stripe for existing subscriptions. Clients cannot submit an arbitrary price, parent ID or customer ID.

## 3. Connect email

1. Create a Resend account. Verify a sending subdomain such as `updates.satslegends.com` by adding the provider's DNS records in GoDaddy. Copy the actual records from Resend; do not guess them.
2. Configure Resend SMTP in Supabase Auth so public signup confirmation and password-reset emails can be delivered. Supabase's default SMTP is restricted and is not a production email service. See [custom SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).
3. Add function secrets:
   - `RESEND_API_KEY`
   - `REPORT_FROM=SATs Legends <reports@updates.satslegends.com>`
   - `REPORT_CRON_SECRET`: a random secret of at least 32 characters.
4. Deploy `send-parent-reports`.
5. In Supabase Vault add `reports_function_url` with the deployed function URL and `reports_cron_secret` with the exact scheduler secret.
6. Run `supabase/schedule-parent-reports.sql` once. It installs a named cron job and safely replaces that same job if rerun.

The job runs once per minute, but only parents due for a report are queued. It sends up to 40 per run, with leases and stable provider idempotency keys for retries. Large batches are delivered over successive minutes; inbox delivery time depends on the email provider. Preferences are checked again before sending, and recipients come from the parent's verified Auth email. No permanent login token is included in emails.

The next scheduled report advances after successful delivery. Failed deliveries remain in the queue with `last_error` and retry after the lease expires. Monitor `report_deliveries` for persistent failures and the provider dashboard for bounces. Resend's idempotency window is finite; a prolonged database outage after the provider accepts a message needs operator reconciliation to avoid resending it after that window.

## 4. Build and upload by FTP

### Current release handoff (29 September 2026)

The desktop browser game and website are built together; `/play` passes through `GameGate` and a paid Matharia subscription is required in production. The development-only timer/level shortcuts in `src/app/testingFlags.ts` are now disabled in production builds. The required gameplay hierarchy and device layouts are unchanged.

This workspace currently has no `.env.local` with public Supabase settings and no private `deploy.config.bat` with the host's FTP details. A generated `.tmp/ftp-release` without the Supabase settings is a build check only: production game access remains closed. **Do not upload that unconfigured release.** Confirm the Supabase project, Stripe webhook, HTTPS and account email are working in test mode before uploading. No external legacy assumptions were used.

Current checks: `npm run lint` and `npm run build:ftp` pass. The generated release has `index.html`, `.htaccess` and 337 files (about 88 MB). A local browser check confirmed the website loads, `/play` shows the closed production gate without Supabase configuration, and no page errors occur. This does not verify real signup, checkout or live subscription enforcement.

Files touched for this handoff: `src/app/testingFlags.ts` and this document. Assumption: the existing repository website is the website to publish, at the repository's documented domain and web root. If the live website is a separate application, its integration path and hosting root must be checked before replacing files.

After adding the public Supabase settings locally:

```powershell
npm ci
npm run lint
npm run build:ftp
```

Upload **the contents of `.tmp/ftp-release/`** to the domain's web root (often `public_html`). Include the `.htaccess` dotfile. Do not upload `.env`, repository source, `supabase/functions`, or backend secrets.

The supplied `.htaccess` is for Apache/cPanel. It makes direct links to `/login`, `/subscriptions`, `/parent/progress/...` and game routes serve `index.html`. If the server is Nginx, give your administrator `hosting/nginx.conf.example`. For IIS or another server, the host must configure the equivalent single-page-app fallback.

Enable HTTPS for `satslegends.com` on the existing host. Point the domain to the host's supplied DNS target through GoDaddy. Both are provider-specific; FTP access alone does not establish the DNS target, certificate or server capacity. Once DNS and HTTPS work, test the exact HTTPS domain rather than the temporary preview tunnel.

## 5. Verify before switching to live payments

- Confirm signup email, login, reset password, logout and safe return from an email report link.
- Create a nickname; a second child profile must be rejected by the database.
- Purchase each plan in Stripe test mode, then confirm that the webhook grants Matharia access.
- Test duplicate checkout, cancelled checkout, renewal, cancellation at period end, failed payment and expiry.
- Play, wait for cloud sync, and inspect that child's parent report on another device.
- Try an uncertain network save response and a stale second-device save. The first retries the original request ID; the second must not silently overwrite the cloud save.
- Use two unrelated parents to verify that each can only see their own child.
- Confirm a test report email and its private link, then verify report opt-out.
- Check deep links after FTP upload and after browser refresh.
- Repeat the payment tests with live configuration and actual webhook delivery before accepting customers.

Then replace test prices, keys and signing secrets with their live counterparts, rebuild the browser files and upload the release. Never mix test and live IDs in one deployment.

## Capacity: 1,000 simultaneous players

The maths games execute on players' devices. The web server serves game files; the backend handles login, subscription checks and progress. Cloud saves are coalesced every 30 seconds and on leaving/hiding the game, rather than sending every answer. There is no per-player realtime socket.

At steady state, 1,000 active players imply roughly 33 progress saves/second. Synchronised starts, sign-ins, initial asset downloads and report queries also create bursts. This architecture targets that use case, but **1,000-player capacity has not been validated**. FTP says nothing about the host's bandwidth or server resources.

Use a staging deployment to test 1,000 browser/game sessions, simultaneous login, progress writes and parent report reads. Measure error rates and response times, database CPU and server bandwidth. Use connection pooling for server SQL workloads, keep assets cacheable/compressed, and increase database compute or introduce a CDN if the measured bottleneck requires it. The free development plans are not the proposed paid production capacity.

## Implementation limits

- No real provider account, domain DNS, SSL, payment or email has been configured from this workspace.
- Browser UI access and cloud saves are subscription-gated. Static browser code is downloadable; a strict content paywall would require serving protected game content through authenticated endpoints.
- Progress is client-reported learning telemetry, not independently verified test performance.
- Compatible dependency security updates have now been applied; npm audit reported zero known vulnerabilities on 29 September 2026. Keep checking advisories before release.
- The future English game has a separate product code and progress namespace. Its content, subscription terms and access are not implemented.

## Changed files for this feature

- `.env.example`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`.
- `src/app/usePlayerProgression.ts` (profile-specific persistence/cloud bridge).
- `src/website/Website.tsx`, `WebsiteRoot.tsx`; removed the old demo `Account.tsx`.
- New website files: `ParentAccount.tsx`, `FamilyAccount.tsx`, `ParentArea.tsx`, `Subscriptions.tsx`, `GameGate.tsx`, `GameSaveContext.ts`, `family.css`, `services/supabase.ts`.
- `supabase/migrations/202609290001_family_accounts.sql`, `supabase/config.toml`, `supabase/schedule-parent-reports.sql`.
- `supabase/functions/` backend source, shared helpers/tests, env example, Deno configuration and dependency lock.
- `public/.htaccess`, `hosting/nginx.conf.example`.
- `scripts/build-ftp.mjs`, `prepare-ftp.mjs`, `verify-family-database.mjs`, `verify-family-website.mjs`, and authenticated browser-flow verification.
- This document and the appended website notes.

## Local verification completed

- TypeScript client check and production FTP build passed.
- All three backend functions passed strict Deno type checking.
- Ten PostgreSQL checks passed: parent privacy, one-child limit, billing permissions, subscription expiry, ordered webhook updates, checkout serialization, save idempotency/conflicts, email leases/retry identity, opt-out, and the UK schedule including daylight saving.
- Six backend unit tests cover PayPal activation, malformed/oversized billing requests, exact GBP prices, subscription/customer mapping, forged/tampered Stripe signatures, and report HTML/link safety.
- Six authenticated browser flows passed using an API fixture: confirmation/signup, report-link login, monthly/yearly checkout, parent reports/opt-out, child progress hydration/save retry, and password recovery/logout. These do not substitute for live provider testing.
- Parent information plus six account/subscription routes are checked at desktop, tablet and phone widths, including all calm previews and revision topic links.
- Existing phone website/revision/video/game navigation checks passed, including MP4 playback/captions in Chromium and WebKit.

Re-run with `npm run lint`, `npm run verify:family-db`, `npm run verify:family-ui`, and `npx deno test --config supabase/functions/deno.json supabase/functions/_shared/billing_test.ts`. The authenticated fixture test requires a local Vite server with the documented fake QA project settings used by `scripts/verify-family-auth-flow.mjs`.

Assumptions: GBP pricing; Europe/London scheduling; one child per Matharia subscription; existing host serves a static Vite build with HTTPS and route fallback; Supabase/Stripe/Resend are separate managed services. No external legacy project assumptions were used.
