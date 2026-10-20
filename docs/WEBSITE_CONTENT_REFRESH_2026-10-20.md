# Website content and artwork refresh — 20 October 2026

## Direction and source

Reviewed [SATs Companion](https://satscompanion.com/) and its [parent page](https://satscompanion.com/parent). Useful content patterns: identify the revision audience, explain regular practice, show how parents follow progress, make inclusions clear and answer practical questions before signup. The wording here is original and describes SATs Legends features. No competitor testimonials, ratings, awards, question counts, outcome claims or trial offers were adopted.

Visual thesis: detailed cinematic fantasy artwork from the upgraded game, framed by the existing purple and gold brand, with calm space for readable copy.

Content plan: revision-companion promise → ways to practise → game worlds and actual gameplay → parent visibility → clear plans. Keep the parent progress section first on the parents page, then explain practice, breaks, common questions and pricing.

Interaction thesis: restrained hero entrance, existing section reveals and subtle artwork hover transitions. Keep native keyboard-operable FAQ disclosures and screenshot dialogs. Respect reduced motion.

## Amendments

- Home: “SATs revision. An adventure worth taking.” Clarify focused KS2 maths practice, school support and the parent's view of saved progress.
- Parents: retain progress information at the top, explain manageable practice and add six practical FAQs. State how it fits alongside classroom teaching, written working and past papers.
- Plans: explain the same Matharia experience with monthly/yearly billing, one child profile and a private dashboard. Keep the existing prices and sale availability.
- Graphics: reuse the game's actual premium Barratt, Mochi, Bran and Vex originals, and four upgraded environment assets. Original source paths and SHA-256 hashes are recorded in `src/assets/website/premium/game-artwork-sources.json`. The source workspace was read only.
- Generate dedicated wide and mobile campaign scenes from the upgraded cast using the built-in image-generation tool. Exact prompts and delivered dimensions are in `src/assets/website/premium/hero-artwork.json`. Wide: 1774 × 887; mobile: 1122 × 1402. These are the delivered native dimensions, not 4K exports.
- Character exports: 1024 × 1536 and responsive 480 × 720 WebP versions. Preserve original transparency; no CSS stretching of the old mobile sprites.
- Keep text and foreground characters in separate normal-flow grid cells on the parents and English pages. Account artwork stays below copy. The footer character now has its own grid cell too.
- Keep existing actual web gameplay screenshots labelled as gameplay. Cinematic promotional artwork does not replace screenshots or alter gameplay.

## Files

- `src/website/Website.tsx`, `ForParents.tsx`, `Subscriptions.tsx`, `EnglishLanding.tsx`, `ParentAccount.tsx`: page content and artwork.
- `src/website/PremiumArtwork.tsx`, `ParentQuestions.tsx`: shared responsive art and parent FAQs.
- `src/website/AdventureArtwork.tsx`, `WebsiteRoot.tsx`, `website-revision-refresh.css`: scenery and responsive composition.
- `src/assets/website/premium/`: persistent website artwork, prompts and provenance.
- `index.html`: revision-companion page description/title.
- `scripts/verify-family-website.mjs`: checks for character/copy separation and opening the school-support FAQ.

## Assumptions and scope

Matharia is the purchasable maths revision companion; Lexcoria remains a gated English playtest, with English/bundle sales disabled. Keep the current parent-account model and existing pricing. No invented testimonials, unsupported guarantees or external legacy project assumptions were used. The separately prepared store-entitlement migration and billing function remain undeployed; this release only publishes website/game static files.

## Verification and release

Release evidence is collected under ignored `qa-artifacts/website-assets`, `qa-artifacts/family` and `qa-artifacts/website-release`. The publisher builds both games from the current website source and pinned Lexcoria revision. Check `site-release.json` on the live site to identify the published source commit.

- TypeScript check and the combined production build passed.
- 99 compiled website checks passed across nine Chromium viewport sizes, 320 × 568 through 1920 × 1080, including both game login gates and mouse-wheel scrolling.
- Parent/account routes passed at eight widths; the updated suite also checks that parent hero artwork cannot overlap copy and that the school-support FAQ opens.
- Visually inspected desktop home, parents, English and signup captures. Source artwork is decoded before full-page review so below-the-fold lazy images are included.
- WebKit verification is outstanding: its executable was absent and Windows refused the downloaded executable with EPERM. System CA trust resolved the initial download-certificate error, but did not resolve the executable write failure. These checks are Chromium layout emulation, not iPhone/iPad device certification.
- FTPS login/read check and the dry-run upload plan passed. Publication status is recorded after the actual upload.

### Published

Published to **https://satslegends.com/** through the verified FTPS publisher. Release source: `1ccdc7f7e0ef759a4ac2c6ed333c0a16e8319157`; release ID `b9388fb1-5c06-4e72-9feb-8a98bb3b7ba0`. Uploaded 141 changed files (8.1 MB) from a 609-file combined artifact. Publisher confirmed successful website, Matharia and Lexcoria publication and HTTPS verification. Source changes were pushed to `codex/secure-ftps-publish` in the SATsLegends repository.

Fresh live-browser checks cover home, parents, English, login and subscription routes at phone (390 × 844), tablet (834 × 1112) and desktop (1440 × 900) sizes. Check real source-resource dimensions for responsive images: browser `naturalWidth` is density-corrected for `srcset` and is not the stored file's pixel width.

## Content expansion following owner feedback

The owner found the first pass insufficiently similar in content to the requested reference. Revisited both SATs Companion pages and expanded the actual information structure:

| Reference content purpose | SATs Legends amendment |
| --- | --- |
| Identify the revision audience immediately | Homepage hero now names Years 5 and 6 and focuses on maths skills and SATs confidence. |
| Explain what the product brings together | New “What is SATs Legends?” section describes game practice, revision guides, visual lessons and parent progress information. |
| Make subject coverage clear | New “What can your child practise?” section gives explicit maths and English topic lists with separate product availability and access. |
| Explain reasons a parent would choose it | New “Why choose SATs Legends?” section addresses confidence, useful next practice, engagement and parent involvement. It appears on both home and parents pages. |
| Connect plans to family benefits | Subscription introduction and inclusions now explain regular revision, reports and the same game access under monthly/yearly billing. |

New content is original and uses the actual product features in the repository. No borrowed testimonials, awards, trial offers or numerical efficacy claims were added. Parent progress stays first on the parents page. Existing upgraded artwork is retained.

Additional files: `src/website/RevisionContent.tsx`; changes to `Website.tsx`, `ForParents.tsx`, `Subscriptions.tsx` and `website-revision-refresh.css`. Stable homepage anchors: `#what-is-sats-legends`, `#revision-subjects`, `#why-sats-legends`.

Published the expanded content and first-load section-link handling from source `3a9c53e03b8312275283f81c47bffdac0460517f` (release `d1c2e361-71ad-4132-83d7-efa5e462c17b`). Publisher confirmed website and both games over HTTPS. Verification for this follow-up: TypeScript passed, 18 local page/layout checks across six widths passed, nine fresh live page/layout checks across phone/tablet/desktop passed, and all three section links opened at the intended heading on both phone and desktop. No external legacy assumptions were used.
