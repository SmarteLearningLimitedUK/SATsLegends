# Matharia production-readiness pass — 2 October 2026

Scope: the current React/Vite website, Matharia game routes, practice and level-one interactions, responsive layouts, curriculum generators, and repository release checks. This is local evidence for the current source, not approval to accept paying customers.

## Product fixes

- Conversion Canyon keeps the target weight visible after an incorrect shipment and presents the shortfall or excess beneath it. The learner can now compare the feedback with the goal while repairing the scale.
- Data Detective shows all four suspects together in a readable grid. The final suspect is no longer hidden beyond a horizontal scroll area with no clear cue.

## Local evidence

- `npm run lint` and `npm run build` pass. The production bundle still reports one 504 kB minified entry chunk; this is a performance follow-up, not a build failure.
- `npm audit --omit=dev --audit-level=high` reports zero known production-dependency vulnerabilities at the time of this pass.
- A local preview of this unconfigured production build serves `/play` without page errors and shows the closed account/subscription gate. This confirms fail-closed behaviour for the unconfigured build only; it does not verify a paid account can enter.
- The 34-game visual/control sweep passes on desktop and iPhone. The responsive route sweep passes 47 checks across iPhone, iPad, Android phone and desktop, and the critical 320 px portrait/short-landscape check passes. Data Detective's all-suspect layout passes targeted iPad and iPhone checks.
- The question/input suite passes on desktop, iPad and iPhone, including fraction drag/return, division answer advance, mine damage progression, clock controls, suspect inspection and reset controls.
- Racing passes desktop, iPad and iPhone with normal and reduced motion: correct answers advance the scene, wrong answers and reading pauses do not, and the run reaches completion.
- The five-tier difficulty generator suite passes 24 checks; the SATs content generator validates 600 mock-paper variants and 56 substrands. All three Core of Calculation mock papers pass a browser play/save/review flow on short desktop, iPad and iPhone. Family, admin and production database verification and return-path checks pass.

These are automated browser and repository checks. They do not replace a manual play session with real devices or children, and they do not establish accessibility conformance, subject-matter sign-off, service uptime or peak capacity.

## Release decision

**Not yet cleared for paying customers.** The repository's [release gate](RELEASE_READINESS.md) still requires evidence from the actual hosting and service accounts: published legal and support details; live domain HTTPS, route refresh and headers; Supabase migrations, credentials, SMTP, RLS and backup/restore; Stripe live prices, signed webhooks and cancellation; a staged subscription-to-gameplay-to-parent-report journey; real-device checks; and an 800-player load result. None can be inferred from a local build or mocked tests. Keep paid access closed until those checks are recorded against a specific deployed commit.

Assumptions: the current repository is the product being prepared, Matharia is the only playable subscription game, and the existing React/Vite plus documented Cloudflare/Supabase/Stripe architecture remains in use. No external legacy project assumptions were used.
