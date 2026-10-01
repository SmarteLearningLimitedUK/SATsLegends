# Parent information, PayPal and security

## Website changes

The public `/for-parents` page explains the maths foundations available in Matharia, links each topic to the existing revision guide, and describes how parents can use saved progress to choose practice together. It explicitly separates game progress from a predicted SATs result and recommends using games alongside school learning, written working and past papers.

Calm Grove's six existing activities are shown with their original scene artwork: Bubble Breath, Peaceful Pond, Lantern Camp, Star Path, Leaf Drift and Worry Balloon. The preview buttons explain each activity; they do not launch gameplay. These activities support everyday wellbeing rather than providing clinical treatment. Worry Balloon's optional microphone processes sound on the device; the inspected implementation does not record or upload audio.

The site includes short parent tips about manageable practice, conversations, breaks and routines, plus an NHS link for exam stress. Reports retain **Sunday 3 pm and Wednesday 4 pm, Europe/London**, including daylight saving. Report links require the owning parent to sign in. English remains in development and is not included in Matharia plans.

## PayPal activation

PayPal is supported through the existing Stripe subscription checkout. No separate client-side payment API or PayPal credentials are added to the game. Both £4.99/month and £49.99/year use the same verified subscription/webhook flow and one-child limit.

1. Create the business's UK Stripe account and activate PayPal under **Settings → Payment methods**. Connect or create the business's PayPal account during onboarding.
2. Confirm that **PayPal recurring payments** are active. Some accounts need to request approval; pending approval is not acceptance of recurring payments.
3. In Stripe test mode, set the backend secret `STRIPE_PAYPAL_ENABLED=true` and test both plans using card and PayPal. This setting makes the server explicitly request `card` and `paypal` and tells the subscription page which methods are offered. Only set it in live mode after live activation/approval is confirmed. Leave it `false` while pending.
4. Verify initial payment, webhook access, renewal, failed renewal, refund, cancellation, and revoking a PayPal billing agreement. Configure Stripe payment-failure emails and collection rules. A PayPal agreement revoked by the payer can make subsequent charges fail; verify that the resulting subscription status removes access through the existing subscription gate.
5. Rebuild/upload the website with its public Supabase settings and deploy the changed backend functions. Payment method availability is returned by the backend; it cannot be enabled by a browser request.

Existing open checkout sessions are reused only when their payment methods match the current server setting. Changing the setting replaces the open session so PayPal is not hidden by an older card-only checkout.

**No real Stripe/PayPal account has been connected or charged from this workspace.** A flag is not proof that provider approval is active. Live checkout must be tested before launch.

## Security work

- FTP host configuration includes a Content Security Policy that restricts JavaScript to this site's files, blocks inline scripts/evaluation, disallows embedding, and limits connections to this site and Supabase. Inline styles remain permitted because React/game motion and styling use them. Google Fonts is explicitly allowed.
- Apache and Nginx configurations also include MIME sniffing protection, referrer limits and a permissions policy. The optional on-device microphone remains available to the same origin; camera, geolocation and browser payment APIs are disabled. Payment checkout uses a top-level provider redirect.
- HSTS is configured for HTTPS, without forcing HSTS onto every subdomain. The host must install a valid certificate, redirect HTTP to HTTPS, and apply the headers. For TLS terminating proxies, set HSTS and redirects at the trusted TLS layer. FTP alone cannot configure certificates or guarantee that a server honours `.htaccess`.
- Hidden files are denied by the web-server configurations. Upload only release files and never `.env`, source, database credentials or backend secrets.
- The unused build-time injection of `GEMINI_API_KEY` has been removed. Only `VITE_` settings are read by the Vite build configuration.
- Billing request bodies are streamed with a 2 KB limit, require JSON, and accept only the fixed checkout/portal actions and monthly/yearly intervals. Client-supplied parent/customer/price identifiers are rejected. Prices, identity and ownership still come from verified server data.
- Compatible dependency security updates were applied within the repository's existing version ranges. The final npm audit reported **zero known vulnerabilities** on 29 September 2026. This is a package advisory check, not a penetration test or a guarantee against future vulnerabilities.
- Existing database ownership rules, verified email requirement, signed Stripe webhooks, subscription checks and private report links remain in use. Database isolation and unauthorised access checks are rerun as part of verification.

For a custom Supabase domain, change `connect-src` in both host configurations to that exact HTTPS origin. If new third-party embeds or scripts are added, review the policy deliberately rather than allowing all origins. Nginx child locations inherit the server headers because the examples use `expires` for caching; adding any location-level `add_header` can change inheritance.

Live server TLS/headers, authentication rate limits, email configuration, privacy/cancellation information and provider integration still need deployment verification. The 1,000-player target still needs a staging load test with actual server specifications.

## Verification

Run the normal TypeScript check and FTP build, the existing PostgreSQL family isolation tests, and the six Deno unit tests. `scripts/verify-family-website.mjs` checks the parent page, activity selector and revision links on desktop, tablet and phone. `scripts/verify-parent-site-security.mjs` applies the FTP headers in Chromium against the compiled preview, verifies routes load under CSP and checks that an injected inline script is blocked. This browser check does not prove that Apache/Nginx have been configured on the live server.

Completed on 29 September 2026: TypeScript, FTP and preview builds passed; all three backend functions passed strict Deno checking; six backend unit tests and ten PostgreSQL privacy/billing/report checks passed. Browser checks passed at 1440, 1251, 768, 390 and 320 px, including all six calm previews, loaded artwork and the revision links. The authenticated API-fixture flows passed, including the PayPal-ready display for both plans; no real payment was made. CSP verification passed against both the guarded production build and the game-preview build. Phone artwork and the parent page were visually inspected; no runtime errors were reported. The refreshed FTP ZIP contains `.htaccess` and no `.env` files. The temporary public `/for-parents` preview returned HTTP 200.

## Changed files in this update

- `src/website/ForParents.tsx`, `parents.css`, `Website.tsx`, `WebsiteRoot.tsx`, `Subscriptions.tsx`.
- `supabase/functions/billing/index.ts`, `_shared/billing.ts`, `_shared/platform.ts`, `_shared/billing_test.ts`, `.env.example`.
- `public/.htaccess`, `hosting/nginx.conf.example`, `vite.config.ts`, `package-lock.json`.
- `scripts/verify-family-website.mjs`, `verify-family-auth-flow.mjs`, `verify-parent-site-security.mjs`.
- `docs/PRODUCTION_SETUP.md`, `docs/WEBSITE_NOTES.md` and this document.

Assumptions: “clam spaces” means calm spaces; prices remain GBP; the business will use an eligible UK Stripe account and activate PayPal recurring payments; the existing host supports HTTPS and React route fallback. Only current repository gameplay/branding was used. **No external legacy project assumptions were used.**

## Official sources checked

- [GOV.UK: Key stage 2 mathematics test framework](https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework)
- [NHS: Help your child beat exam stress](https://www.nhs.uk/mental-health/children-and-young-adults/advice-for-parents/help-your-child-beat-exam-stress/)
- [Stripe: PayPal payment and subscription support](https://docs.stripe.com/payments/paypal)
- [Stripe: Activate PayPal](https://docs.stripe.com/payments/paypal/activate)
- [Stripe: Enable future/recurring PayPal payments](https://docs.stripe.com/payments/paypal/set-up-future-payments)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [MDN: Strict Transport Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
