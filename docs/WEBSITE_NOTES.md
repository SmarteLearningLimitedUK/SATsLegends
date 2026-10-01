# SATs Legends website

## Scope

- Create a vibrant website for ages 11–14 using the repository's existing SATs Legends palette, fonts, forest environment and character artwork.
- Connect the website to the existing React + TypeScript + Vite game.
- Provide sign up and log in preview screens, a maths revision guide and a playable video area.
- Keep website components and document scrolling separate from the game's established viewport and gameplay architecture.

## Design

Visual thesis: a blue forest adventure with cyan light, gold actions, bold SATs Legends typography and the existing Barratt and Mochi characters.

Content plan: brand and game entry, three learning destinations, a selection of existing game worlds, and a final invitation to play.

Interaction thesis: a short hero entrance, gentle section movement as they enter the viewport, and clear hover feedback on destinations. Reduced motion follows the existing MotionConfig and scoped CSS preferences. Content remains visible before scroll animations run.

## Routes and features

- `/`: website homepage.
- `/play`: existing game splash. Its route builder now returns `/play`, allowing `/` to serve the website.
- Existing `/map`, `/island/:id`, `/game/:island/:level`, avatar and other game routes keep their existing implementation. The website provides a return link.
- `/revision`: six topic guides covering number, fractions, geometry, arithmetic, data and ratio; category filters, search, worked examples, retryable quick checks and links to existing game islands. `?topic=fractions` and equivalent topic IDs open the matching guide.
- `/videos`: three 32-second silent visual walkthroughs. Local MP4 sources, WebM fallbacks and English VTT captions. Native playback, seeking, fullscreen and caption controls; Escape closes the accessible native dialog. Each lesson links to its guide.
- `/signup`, `/login`: validated front-end demo forms with password visibility controls, success states and a temporary display name. The screens explicitly identify the preview. Email and password values are not saved or sent to a server. Mobile navigation includes the Leave demo action.

## Assumptions and limits

- Revision is maths only, matching the current repository's game topics. No English or other subject system was invented.
- The account screens are front-end previews because no account service exists in this repository and the repository instructions exclude adding a backend without an explicit request. They do not create accounts or authenticate people.
- No supplied video files existed, so the three local lessons were authored as simple educational diagrams with on-screen explanations. They are silent and include captions, with no external media or footage.
- Work is local to this repository; no production hosting deployment was requested or performed.
- Existing game progress continues to be handled by the existing game code.
- No external legacy assumptions, prior projects, prior chats or hidden dependencies were used. No new backend, analytics, boss system or final illustration assets were added.
- Pre-existing changes in gameplay files and other scripts were preserved.

## Verification

On 2026-09-29:

- `npm run build` passed with the final website and all media assets included.
- `npx tsc --noEmit` passed.
- Browser verification covered desktop 1440×900, tablet 768×1024 and phone 390×844, using reduced motion. The desktop and phone homepage were also visually inspected with normal motion.
- All website routes rendered and scrolled, without horizontal overflow or broken images.
- Category filters, revision search and reset, incorrect-answer recovery, correct-answer feedback, and video-to-guide links passed.
- Mobile navigation opened, closed after navigation, and exposed the Leave demo action.
- Both account demo forms validated, toggled password visibility and showed success. No submitted email or password appeared in browser storage.
- Website → existing game splash/map → website passed, including restoring the game's body/viewport rules.
- All three WebM fallback lessons played and sought in Chromium. The final MP4 lessons played and sought in both Chromium and WebKit, and their English captions loaded when selected. Video dialogs closed with Escape and the close button.
- No browser runtime errors occurred in the main desktop, tablet and phone flows.
- These are browser simulations; they do not claim physical installed-device testing.

Evidence and screenshots are in the ignored `qa-artifacts/website/` directory. Build output is recorded in `qa-artifacts/website-build.log`.

Run `node scripts/verify-website.mjs` against the running development server. Set `LEGENDS_WEBSITE_QA_URL` to check another local preview. Set `LEGENDS_WEBSITE_QA_PROFILE` to `desktop`, `tablet` or `phone` to check an individual layout; `media` rechecks video compatibility while preserving earlier route evidence.

Rebuild MP4 lessons with `node scripts/create-website-lessons.mjs`. Set `LEGENDS_LESSON_FORMAT=webm` to regenerate WebM fallbacks. This uses the repository's existing Playwright dependency and adds no package dependencies.

## Files changed by this task

Modified:

- `index.html`
- `src/main.tsx`
- `src/app/routeConfig.ts`

Added:

- `src/website/WebsiteRoot.tsx`
- `src/website/Website.tsx`
- `src/website/Revision.tsx`
- `src/website/Videos.tsx`
- `src/website/Account.tsx`
- `src/website/content.ts`
- `src/website/website.css`
- `scripts/create-website-lessons.mjs`
- `scripts/verify-website.mjs`
- `public/lessons/place-value.mp4`
- `public/lessons/place-value.webm`
- `public/lessons/place-value.vtt`
- `public/lessons/fractions.mp4`
- `public/lessons/fractions.webm`
- `public/lessons/fractions.vtt`
- `public/lessons/angles.mp4`
- `public/lessons/angles.webm`
- `public/lessons/angles.vtt`
- `docs/WEBSITE_NOTES.md`

## Premium gold refinement — 2026-09-29

The user explicitly requested more gold polish, more pop and a premium appearance. This authorizes visual polish within the website scope.

Visual thesis: midnight blue enamel, metallic cream and gold branding, warm character lighting, fine gold edges and embossed actions. Existing artwork, typography, page structure and features remain the source of the design.

Changes:

- `src/website/Website.tsx`: adds a decorative gold crest above the existing SATs Legends wordmark.
- `src/website/WebsiteRoot.tsx`: loads the website's dedicated premium visual stylesheet.
- `src/website/website-premium.css`: adds the website-only metallic lettering, gold shield, navigation seams, button bevels and hover reflections, warmer hero lighting, shared panel material, gold-framed game previews and matching revision/video/account finishes. Hover reflections are disabled for reduced motion.
- `docs/WEBSITE_NOTES.md`: records this refinement and its validation.

Assumptions: the premium request applies to the hosting website and its existing pages; the game art and gameplay implementation remain the repository's existing implementation. No new illustration assets or external legacy assumptions were used.

Validation:

- Production build passed with the existing Vercel absolute-asset-path configuration.
- TypeScript passed with `npx tsc --noEmit`.
- Twenty page/viewport checks passed: all five website routes at widths 1440, 768, 390 and 320px. Heading bounds, image loading, horizontal overflow and runtime errors were checked.
- Mobile navigation, revision guide expansion and video dialog controls passed after styling.
- Desktop homepage, phone homepage, lower homepage sections and phone account layout were visually inspected.
- The existing temporary public preview was refreshed and returned HTTP 200. Its phone homepage was checked in the browser. This is a temporary preview dependent on the hosting computer and running tunnel.
- Screenshots and the scoped check report are in the ignored `qa-artifacts/` directory, including `website-premium-report.json` and `premium-1440-home.png`.

## Adventure artwork — 2026-09-29

The user requested enemies in the artwork, a rich background matching the game's level art, and a stronger sense of adventure. This explicitly authorizes a new website illustration.

Visual thesis: a richly painted forest journey with ancient stone paths, luminous waterfalls, golden lanterns and a distant volcanic landscape, framed by the existing game's characters and premium gold brand.

Content plan: the hero introduces the adventure; the existing play/revision/video actions offer the next move; game level previews show the worlds; the final call to action uses the existing Potion Panic environment. The landscape continues behind all website pages as a fixed background. Motion uses the hero entrance, the background's depth while scrolling, and the existing gold button hover and section reveals.

Files changed in this artwork update:

- `src/website/Website.tsx`: uses the new full-bleed landscape, adds the shared page backdrop and encounter artwork, and updates the adventure introduction.
- `src/website/WebsiteRoot.tsx`: loads the scoped adventure stylesheet.
- `src/website/AdventureArtwork.tsx`: renders the landscape backdrop and existing Barratt, goblin, armoured rhino and cyclops slime sprites with an accessible scene description.
- `src/website/website-adventure.css`: layers the environment and sprites, crops their existing transparent margins in CSS, adapts the composition for phone/tablet/desktop, and keeps text/actions readable across the website.
- `src/assets/website/adventure-valley-v1.png`: new landscape, generated with the built-in `image_gen.imagegen` tool and saved inside this repository.
- `docs/WEBSITE_ARTWORK_PROMPT.json`: exact generation prompt, reference paths and sprite provenance.
- `docs/WEBSITE_NOTES.md`: this update record.

The image was generated using only the repository's `place-value-panic.webp`, `potion-panic.webp` and `lava-path.webp` as style references. Enemies are the original cutout assets from `src/assets/enemies/cohesive/`, overlaid by the website component; their source images were not edited. The original generated output also remains in Codex's generated-images directory.

Assumptions: this request concerns the hosting website's artwork and atmosphere. The existing account screens remain explicitly labelled demos, and this update introduces no gameplay rules, backend, analytics or boss systems. No external legacy assumptions, previous projects or hidden dependencies were used. Existing unrelated repository changes were preserved.

Validation:

- Production build passed using the existing absolute-asset-path configuration; TypeScript passed with `npx tsc --noEmit`.
- Twenty Chromium page/viewport checks passed: all five website routes at widths 1440, 768, 390 and 320px, with no horizontal overflow, broken images or runtime errors.
- All five routes also passed at phone width in WebKit, including artwork loading and unobstructed access to the play action.
- Mobile navigation, revision expansion and video dialog controls passed.
- Desktop, tablet and phone compositions, account-heading contrast, and the public phone preview while scrolling were visually inspected. These are browser simulations, not physical device tests.
- The temporary public preview was refreshed at `https://header-cable-columns-environment.trycloudflare.com/` and checked in the browser. It remains dependent on the hosting computer and tunnel.
- Evidence is in ignored `qa-artifacts/`, including `website-adventure-report.json`, `website-adventure-webkit-report.json`, `adventure-webkit-phone.png` and `adventure-public-phone-scroll.png`.

## Splash-screen logo — 2026-09-29

The user requested the logo from the game's splash screen. `src/app/AppRouter.tsx` uses `src/assets/casual_ui/splashrep1.png`; the badge is embedded in that poster. The website now displays the original poster pixels inside a clipped SVG viewport. The lettering, colour treatment and shield/ribbon artwork come directly from that source. Each placement has its own React-generated clip ID.

Visual thesis: the game's lavender, gold and purple badge anchors the existing adventure scene. Content and interaction plan: use the same badge in the hero, navigation and footer; retain the existing entrance, background depth and button interactions.

Files changed:

- `src/website/SplashLogo.tsx`: shared view of the existing splash logo, clipped to the badge outline.
- `src/website/Website.tsx`: replaces the website's typed wordmarks and crest with `SplashLogo`, preserving the accessible homepage link and level-one heading names.
- `src/website/website-adventure.css`: sizes the badge for the header, footer and hero at desktop and phone widths.
- `docs/WEBSITE_NOTES.md`: records the source, assumptions and verification.

Assumptions: the requested logo should be used consistently across the website's brand placements. This is a website branding update. The game's existing splash poster is used directly and remains unchanged. No external legacy assumptions or assets were used; unrelated repository changes were preserved.

Validation:

- Production build and `npx tsc --noEmit` passed.
- Nine focused browser checks passed: Chromium homepages at widths 1440, 768, 390 and 320px; shared header/footer branding across all five website routes at 320px; and a WebKit homepage at 390px.
- Original splash asset loading, separate clip IDs, accessible hero heading, unobstructed play action, mobile navigation and homepage logo links passed. No horizontal overflow or runtime errors occurred.
- The source badge, desktop/phone placements and WebKit phone rendering were visually inspected.
- The temporary public preview was rebuilt and its phone homepage checked in the browser.
- Evidence is in ignored `qa-artifacts/`, including `website-splash-logo-report.json`, `splash-logo-Chromium-1440.png`, `splash-logo-WebKit-390.png` and `splash-logo-public-phone.png`.

## Logo colour palette — 2026-09-29

The user requested the logo's colours across the website. Palette samples were read directly from `src/assets/casual_ui/splashrep1.png`: ribbon purple `#451ccb`, dark outline `#090842`, lavender `#b6afe3`, light lettering `#f0eef7`, gold `#fde161` and orange `#ea920a`. Darker purple surface tints and lighter text tints keep the interface readable.

Visual thesis: deep purple adventure surfaces, lavender lettering and outlines, and vivid golden-orange actions matching the splash badge. Content plan: apply one palette to the existing hero, next-move links, game previews, final action and resource/account pages. Interaction plan: retain the existing hero entrance, scrolling depth and button reflection; colour the hover, focus, selected and expanded states consistently.

Files changed:

- `src/website/website-logo-theme.css`: website-only palette tokens, purple atmosphere/navigation/surfaces, lavender text/controls, golden-orange primary actions and matching revision/video/account states.
- `src/website/WebsiteRoot.tsx`: loads the logo palette after the website's existing structural and artwork styles.
- `docs/WEBSITE_NOTES.md`: records the palette, scope and verification.

Assumptions: the request applies to every hosting-website page. Existing adventure illustrations retain their source colours, and correctness feedback retains its existing green meaning. The game's own screens and original splash artwork remain unchanged. No external legacy assumptions, outside branding or new artwork were used. Existing unrelated repository changes were preserved.

Validation:

- Production build and `npx tsc --noEmit` passed.
- Twenty Chromium checks passed across all five website routes at widths 1440, 768, 390 and 320px, plus all five routes at phone width in WebKit. Images loaded, headings stayed in bounds, and no horizontal overflow or runtime errors occurred.
- Mobile navigation, revision expansion and video dialog controls passed with the new palette.
- Representative contrast checks passed: input placeholders 9.02:1; input borders 4.78:1; form labels 9.64:1 and body text 8.43:1 against the brightest panel tint; primary-button text 6.91:1 against the darkest golden-orange stop. These checks cover the named colour pairs, not a complete accessibility audit.
- Desktop, phone, account, revision and video layouts were visually inspected, including the public phone preview while scrolling.
- The temporary public preview was rebuilt and checked at `https://header-cable-columns-environment.trycloudflare.com/`.
- Evidence is in ignored `qa-artifacts/`, including `website-logo-colours-report.json`, `website-logo-colours-webkit-report.json`, `website-logo-colours-contrast.json` and `logo-colours-public-phone.png`.
# Parent accounts, Matharia subscriptions and scheduled reports — 29 September 2026

The demo account screen has been replaced with a real Supabase integration and clear unavailable states before configuration. Parent accounts own one child profile. Matharia plans are £4.99 monthly / £49.99 yearly, with Stripe checkout, verified subscription webhooks and the billing portal. The English game is displayed as coming soon and is not bundled into Matharia access.

Saved game progress is isolated by child and synced to the backend in batches. Optimistic revisions protect against stale-device overwrites, and a local outbox retains the original request ID when a save response is uncertain. Parent reports reuse the existing learning telemetry and reporting logic.

The report scheduler uses **Sunday 3 pm / Wednesday 4 pm, Europe/London**, including GMT/BST. Reports link to a private child progress page with parent login; parents can opt out of emails while keeping dashboard access.

The website is prepared for FTP upload to the owner's existing server. Apache rewrite configuration is included, with an Nginx alternative. Production builds fail closed when accounts are not configured. See [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) for changed files, costs, provider setup, deployment and verification results.

No provider accounts, live payments, actual emails, DNS changes or FTP uploads have been performed. Capacity at 1,000 simultaneous players needs a staging load test and confirmation of the server's resources/bandwidth. Existing unrelated game changes were preserved. No external legacy assumptions were used.

## Parent guide, PayPal and security

The public `/for-parents` page explains Matharia's revision topics and six existing Calm Grove activities using current game artwork. It includes parent wellbeing tips, official GOV.UK/NHS references, private progress information and the agreed UK email schedule. It is linked from the home page, navigation, footer and subscriptions.

Both plans can offer card and PayPal through Stripe once PayPal recurring payments are activated and `STRIPE_PAYPAL_ENABLED=true` is set on the backend. The disconnected preview does not claim live payment acceptance. FTP security headers, bounded billing requests, removal of unused API-key injection and compatible dependency fixes accompany the page. See [PARENTS_PAYPAL_SECURITY.md](PARENTS_PAYPAL_SECURITY.md) for changed files, setup, verification, assumptions and deployment limits.

## Actual minigame screenshots

The home and parent pages include a gallery of actual Place Value Panic, Match Mastery, Angle Arena and Potion Panic gameplay. Captures come from current local game routes, show the questions and controls, and retain portrait framing. Tap any image to open a larger view; use Close or Escape to return. See [WEBSITE_GAMEPLAY_SCREENSHOTS.md](WEBSITE_GAMEPLAY_SCREENSHOTS.md) for capture provenance, changed files, assumptions and verification.

