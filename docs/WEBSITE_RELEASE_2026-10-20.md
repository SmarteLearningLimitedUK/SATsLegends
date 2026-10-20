# Website release checks — 20 October 2026

Target: `https://satslegends.com`, existing Apache/FTPS hosting.

## Included

- Current website and Matharia, plus the pinned Lexcoria gated playtest. One parent login serves both games; English access is required for Lexcoria. English/bundle sales remain disabled.
- Action hero artwork with characters composed into the scene; separate text/art placement on smaller screens. The parent progress section leads the parents page.
- Account access refreshes when returning to the site. Mobile navigation closes with Escape and restores keyboard focus to its button.
- Signup instructions match the actual flow: parent account, subscription, child nickname. Password recovery has a separate 44px touch target.
- Entry-page cache headers ask browsers to revalidate after releases.

## Verification

- TypeScript passed (`npm run lint`).
- Combined production build completed with game previews disabled.
- `verify:website-release`: 90 Chromium checks passed across 320×568, 390×844, 412×915, 568×320, 768×1024, 1024×768, 1280×720, 1440×900 and 1920×1080. Covers direct routes, horizontal overflow, account text/character separation, form text sizes, mouse-wheel scrolling, keyboard/mobile navigation and both game login gates.
- Lexcoria integration checks passed: same parent login, selected child, first play without an existing cloud save, server access verification and denial after the English grant is removed. Uses an isolated API fixture, not a live family.
- Existing parent-auth/save tests and 18 family/production database checks passed earlier in this session. Publisher's five local tests passed, including interrupted-release recovery.
- Screenshot evidence: ignored `qa-artifacts/website-release/`; build/upload evidence and rollback copies: ignored `.deploy/`.

## External items still open

- The live billing backend accepts `https://satslegends.com` after the owner changed `APP_URL`. Its GET request still returns HTTP 500; the public product catalogue has no Matharia monthly/yearly price IDs. The owner confirmed Stripe has not been set up. No real checkout, renewal, cancellation or webhook result is claimed.
- Owner has added the new auth redirect entries. Their screenshot still showed the old Site URL; changing it to `https://satslegends.com` was requested. Live confirmation/recovery email delivery remains to be verified.
- Google and Apple providers are disabled in live Supabase settings; production browser flags also disable Google, Apple and passkeys. Email/password is the offered login method.
- Legal business/contact/refund-policy information was previously deferred by the owner and remains a paid-launch prerequisite. No policy details have been invented.
- Real iPhone/iPad/Android/Safari testing is outstanding. WebKit installation failed certificate validation; browser security was not bypassed. Chromium viewport emulation does not certify those devices.
- Native apps and Apple/Google purchase integration are outside this website release. See `SHARED_PLATFORM.md`.

This is a website/playtest release, not evidence that paid production launch is complete. The secure publisher verifies live entry files and keeps rollback copies; its actual upload outcome must be read from the deployment log.
