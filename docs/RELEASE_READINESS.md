# SATs Legends release gate

This checklist applies to the React/Vite site, Matharia, and the Supabase functions and migrations in this repository. It is a release procedure, not evidence that the connected production services have passed it.

## Device support standard — agreed 16 October 2026

The intended minimum for the App Store app is **iOS 16.0** (and **iPadOS 16.0** if iPad is offered). This is a support policy, not a claim that a native iOS build or any physical device has passed testing. Newer SE and mini models remain in scope; small screens alone are not grounds for excluding a supported device.

### Native enforcement before App Store submission

The checked-in `ios/` folder currently contains Capacitor configuration and copied web assets, but no Xcode project, `Info.plist`, Podfile or native deployment-target setting. `package.json` also has no native iOS build command. There is therefore no enforceable App Store minimum configured in this repository yet.

When preparing the native project on macOS:

1. Set the app's Xcode iOS Deployment Target to **16.0**; align extension and native dependency targets as needed. Use the deployment target to generate the OS minimum rather than hand-editing the generated `MinimumOSVersion` value.
2. Archive the exact release candidate and confirm its reported minimum OS is 16.0 in the archive/App Store Connect compatibility information. Record the archive/build identifier and evidence.
3. Keep the native app unavailable for release until the physical-device gate below passes. Do not add hardware requirements the game does not actually need to exclude particular screen sizes.

The website remains accessible according to browser capability. This policy does not add an iOS user-agent block to the web game. Billing remains intentionally deferred; adopting this device policy does not clear the separate billing release gate.

### Supported-screen checks

The regular `npm run verify:responsive` matrix now includes **375 × 667** (SE-size) and **375 × 812** (mini-size) WebKit profiles alongside the existing standard phone, Android, tablet, landscape and desktop profiles. These test CSS viewport sizes, not physical display pixels or a particular installed iOS release. The existing 320 × 568 case remains an additional layout stress check; it does not promise support for the original SE/iOS 15.

`npm run verify:screen-overlaps` checks the affected place-value, café, racing and all three SAT-paper screens across the same compact sizes, with question-text containment, panel separation, button-label containment and normally scrollable control reachability. It is a focused regression check, not a complete playthrough of every game. CI runs it against the dev test server, saves diagnostics under `qa-artifacts/screen-overlaps/`, and uploads them on failure.

Run these commands against a started test server using `LEGEND_QA_URL`. The responsive suite defaults to port 3000; the focused suite defaults to port 4183. For a compiled build, use the existing isolated account fixtures and the exported game catalog as described by the QA scripts. Retain initial failures and rechecks separately.

Automated baseline adoption evidence is saved locally in `qa-artifacts/device-support-standard-2026-10-16/`: the initial SE/mini sweeps, separate clean route rechecks, build/typecheck logs and a five-project Scale Builder mini-size completion. The expanded sweep found and fixed a Scale Builder question/HUD overlap. This evidence does not close the physical-device gate.

### Physical-device release gate

For each supported device class, record the physical model, OS version, orientation, exact app build, tester, date, result and evidence. Require coverage of a newer SE, a mini and a standard iPhone; include a real iPad if offered. Cover the lowest supported OS on compatible hardware and a current supported OS, recording the actual versions tested. Browser emulation alone cannot close this gate.

Every game must be playable through completion on supported devices, with:

- Complete, readable questions, diagrams, labels and feedback, with no overlapping panels or hidden answers.
- Reachable controls in portrait and landscape. Where space is limited, normal scrolling must reveal controls without clipping or trapping interaction; taps and drags must still work.
- Reliable Help/pause, back navigation, audio controls, game completion and progress recovery after interruption/relaunch.
- Measured loading and play performance on the least capable supported device; no unresolved crashes or freezes. Record any required loading retries rather than counting them as a clean load.
- Accessibility checks for readable text/contrast, larger text, reduced motion, essential screen-reader navigation and information conveyed through more than colour or sound alone.

A failed supported-device case blocks device-support sign-off until fixed and retested. Retest failures must not be hidden by raising the OS minimum or dropping a model without an explicit support-policy decision. Physical results are **pending**; no physical iPhone certification is recorded by this change.

Files changed for this standard: `docs/RELEASE_READINESS.md`, `package.json`, `scripts/verify-responsive-experience.mjs`, `scripts/verify-screen-overlaps.mjs`, `.github/workflows/quality.yml`, and `src/games/scale-builder.css` (mini-screen question overlap found by the expanded matrix). Assumptions: the agreed iOS 16+ baseline applies to a future native App Store release, the current React/Vite architecture remains in use, and browser emulation is supporting evidence rather than physical certification. No external legacy assumptions were used.

## 1. Repository checks

GitHub Actions runs `.github/workflows/quality.yml` for pushes and pull requests. Before promoting a commit, require a green run for that exact commit. Locally, the equivalent checks are:

```powershell
npm ci
npm run lint
npm run build
npm run verify:family-db
npm run verify:admin-db
npm run verify:production-db
Set-Location supabase/functions
deno check billing/index.ts stripe-webhook/index.ts send-parent-reports/index.ts admin-support/index.ts
deno test -A _shared/billing_test.ts
```

The CI run also starts the Vite site and executes phone, tablet and desktop viewport checks, the 320px/short-landscape game check, the Lexcoria unavailable-purchase check, and a mocked parent signup/checkout/save flow. These checks use local fixtures or an in-memory database. They cannot prove that the live providers, capacity or email delivery work.

## 2. Launch prerequisites

- Publish reviewed privacy, terms, subscription cancellation and contact information with the business's real legal name, postal address and support/privacy email. The owner has deferred those details; keep this gate open until they are supplied and reviewed. Do not publish placeholder policies.
- Keep Lexcoria, the English game in development, and any English/bundle purchase offers unavailable until a playable Lexcoria route, entitlement check, saved progress, reports and product copy have passed the same release checks as Matharia. Confirm the intended annual bundle price before enabling it.
- Confirm `satslegends.com` and the Pages deployment both serve HTTPS and direct route refreshes. Check the **actual response headers** on the production domain, including the CSP, rather than relying on `public/_headers` alone.
- Set Cloudflare build variables for the correct Supabase project URL and publishable key. Keep `VITE_ALLOW_GAME_PREVIEW=false` in production. Never put a Supabase secret/service-role key, Stripe secret or email API key in a `VITE_*` variable.
- Apply the migration files to the intended Supabase project in version order, then deploy all four functions. Configure their secrets, the report scheduler, authentication redirect URLs and a production SMTP sender. Verify row-level security and that a normal browser account cannot read another parent's records.
- Configure Stripe's live GBP prices and signed webhook endpoint. Enable recurring PayPal only after Stripe shows it active for this account. Test the customer portal and cancellations. Ensure old price IDs remain mapped before replacing a live price.
- Audit any existing English or combined subscriptions in Stripe before launch. The new catalog blocks future purchases but does not cancel or refund an existing subscription.
- Verify backups and perform a restore rehearsal on a non-production project. Record who can restore, where the backup is stored, and the recovery time observed. A migration that changes data needs its own forward-fix plan.

## 3. Staging acceptance run

Use test-mode providers and a separate staging project. Record a result, timestamp and evidence link for each item:

1. Parent signup, confirmation, login, Apple/Google login if enabled, password recovery, logout and return from a report link.
2. One child profile, private progress, saved game state after refresh and another-device login; reject a second child's profile and cross-parent access.
3. Monthly and yearly checkout with a card; PayPal subscription and renewal if offered; verified webhook grants access. Test duplicate, cancelled and failed checkout, renewal, past-due and cancellation at the period end.
4. Reporting at the Sunday 15:00 and Wednesday 16:00 Europe/London schedule, including daylight-saving changes. Confirm an opted-out parent gets no report, a failed delivery is visible and retried, and the emailed link requires that parent's login.
5. Admin role boundaries and audit logs: normal parents cannot grant access, suspend accounts or view another family's data. Verify the support recovery path with a second staff account.
6. Portrait and landscape play on a real iPhone, iPad, Android phone and desktop. Check tap targets, text overlap, Help/pause timing, sound controls, back-to-site navigation between games and keyboard operation.
7. Exercise the account/data deletion process with a test subscription. The Stripe subscription must be cancelled or resolved before removing the auth user and the local customer mapping.

Do not use real children or live charges for this acceptance run.

## 4. Capacity and monitoring

The browser performs gameplay locally, while Supabase handles authentication, access and progress saves. The requested peak is 800 concurrent players; the repository checks do not establish that capacity. Run a staged load test that includes initial asset downloads, simultaneous sign-ins, progress writes and parent report reads. Record peak requests per second, error rate, p95 latency, database CPU/connections, bandwidth and cost. Increase capacity or reduce load at the measured bottleneck before advertising that limit.

During launch, assign an operator to check Cloudflare deployment errors, Supabase function/auth/database logs, Stripe webhook failures and payment disputes, and report delivery failures/bounces. The admin dashboard shows the latest `report_job_status` heartbeat and delivery failures; set an external alert for a stale heartbeat or repeated failures, since an operator must still see the problem when nobody is logged into admin. A report scheduler existing in SQL is insufficient evidence that email arrived. Reconcile any long-running report failure against the email provider before replaying it, to avoid duplicate email after its idempotency window.

## Account deletion requests

The parent dashboard records a request and the admin dashboard lists pending requests. **This is a manual support queue, not automatic account deletion.** Assign a named operator and a private case log before launch; follow the [ICO right-to-erasure guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/) for identity checks, response timing and any applicable retention exceptions.

For each request, the operator must verify the parent and their Stripe customer, inspect **all** Stripe subscriptions and outstanding invoices, resolve cancellation and any refund decision under the published policy, and confirm no further charge is scheduled. Stripe's [subscription cancellation reference](https://docs.stripe.com/api/subscriptions/cancel) distinguishes immediate cancellation from cancellation at period end. Record the outcome privately. Only after billing is resolved should an authorised operator remove the `stripe_customers` mapping and delete the Supabase Auth user; the database blocks Auth deletion while that mapping remains. Verify that child profiles and progress were removed by the cascade, and respond to the parent. Do not treat clearing the mapping alone as proof that Stripe stopped billing.

## 5. Release and rollback

Promote only the tested commit and matching backend migration/function versions. Keep a record of the deployed commit, Pages deployment ID, migration versions, function versions, and Stripe price IDs. After production promotion, repeat a small real-domain smoke test without making an unplanned live charge.

If the browser release fails, roll back to the last known-good Cloudflare Pages deployment. If a function fails, redeploy the prior tested function version. Database migrations are forward-only unless a migration-specific recovery plan has been tested; do not delete tables or restore an old database over live payments without reconciling Stripe and report deliveries. Disable checkout while payment or entitlement reconciliation is incomplete.

## Still external to this repository

The owner or provider dashboards must supply legal business details, production credentials, verified sender/domain configuration, Stripe/PayPal activation, backup evidence, staging test evidence and the 800-player load result. Source code alone cannot complete those checks.

## Change inventory for this pass

- Gameplay and viewport: `vite.config.ts`, `src/App.tsx`, `src/components/GameLoadBoundary.tsx`, `src/games/AngleArenaGame.tsx`, `src/games/PrimePopGame.tsx`, `src/games/PlaceValuePanicGame.tsx`, `src/games/place-value-panic.css`, `scripts/verify-critical-game-viewports.mjs`.
- Website and parent support: `src/website/Website.tsx`, `src/website/WebsiteRoot.tsx`, `src/website/EnglishLanding.tsx`, `src/website/english.css`, `src/website/Subscriptions.tsx`, `src/website/ParentArea.tsx`, `src/website/AdminDashboard.tsx`, `src/website/family.css`, `src/website/admin.css`, `src/website/services/supabase.ts`, `src/website/services/returnPath.ts`.
- Billing, reports and database: `supabase/migrations/202610020002_english_bundle.sql`, `supabase/migrations/202610020003_billing_reports_readiness.sql`, `supabase/migrations/202610020004_admin_audit_deletion.sql`, `supabase/functions/_shared/billing.ts`, `supabase/functions/_shared/billing_test.ts`, `supabase/functions/_shared/report-email.ts`, `supabase/functions/admin-support/index.ts`, `supabase/functions/billing/index.ts`, `supabase/functions/send-parent-reports/index.ts`, `supabase/functions/stripe-webhook/index.ts`, `scripts/verify-production-database.mjs`.
- Release checks and guidance: `.github/workflows/quality.yml`, `package.json`, `scripts/verify-family-auth-flow.mjs`, `scripts/verify-family-website.mjs`, `scripts/verify-lexcoria-readiness.mjs`, `scripts/verify-return-path.ts`, `README.md`, `docs/DEPLOYMENT_FOR_BEGINNERS.md`, `docs/PRODUCTION_SETUP.md`, and this file.

Assumptions used in this pass: Matharia is the only game ready for purchase and play; Lexcoria remains in development; account deletion is handled by a verified human support process; the existing React/Vite, Supabase, Stripe, Resend and Cloudflare architecture in this repository remains in use. No external legacy project assumptions were used. The pre-existing uncommitted English/bundle draft was preserved and extended. A separate concurrent `scripts/build-with-english.mjs` helper and its `package.json` entry reference a sibling project; they were not used or reviewed for this release gate.
