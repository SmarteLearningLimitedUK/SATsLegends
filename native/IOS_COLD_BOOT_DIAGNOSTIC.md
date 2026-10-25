# Compiled iOS cold-boot diagnostic — 23 October 2026

Read-only investigation. No application code, account flow, timeout threshold or release changed. No external legacy assumptions were used.

## Reported symptom and source trace

Other final QA runs intermittently waited30–90s for Start while showing the opening screen, although the compiled index returnedHTTP200. Inspected `src/main.tsx`, `src/platform/ios/IOSAppRoot.tsx`, `src/platform/ios/IOSAppBoundary.tsx`, `src/components/GameLoadBoundary.tsx`, `src/website/GameGate.tsx`, `src/platform/nativeApp.ts`, `vite.config.ts`, compiled `dist-ios/index.html` and the isolated account fixture.

- `Opening SATs Legends…` is the outer Suspense fallback while loading `IOSAppRoot`.
- `Opening Matharia…` is the inner Suspense fallback around the lazy `App` import. Vite can wait for both its JS module and stylesheet preload. The text identifies this stage; it does not by itself identify a failed asset, a browser stall or an account error.
- `GameLoadingFallback` has an existing12s longer-wait/retry message. No new timeout or automatic reload was added.
- iOS and website build output directories are separate (`dist-ios` and `dist`). This source fact does not rule out serving a directory while its own build replaces files, but no such replacement occurred during this dedicated frozen-build diagnostic.

## Executed diagnostic

`node scripts/diagnose-ios-cold-boot.mjs` launched **one browser**, **10 fresh isolated contexts sequentially**, and retained the existing30s navigation/Start limit. Routes included all three Core papers plus Place Value, Zombies, Scale and Line Graph. The installed account fetch fixture prevents live account/service calls; no purchase or account write occurred.

Captured console/page errors, every network response status, request failures, pending requests, script/stylesheet DOM state, resource timing, a500ms JavaScript heartbeat and body state. Individual JSON traces and aggregate results are in `qa-artifacts/ios-cold-boot-2026-10-23/`.

Actual result: **10/10 reached visible Start**, **1,239–1,343ms** after navigation began. All had **zero pending requests, failed requests, HTTP>=400 responses, console messages and page errors** at readiness. Heartbeat advanced twice in every case. First-context transfer/timing included:

- `App-BebJpyvz.js`:226,245-byte compressed body,128.4ms.
- `App-DOqFRN8o.css`:44,946-byte compressed body,59.1ms.
- Main index stylesheet:117,648-byte body,88.7ms.

The browser closed before the parent rebuilt the output again. These figures apply to that frozen compiled build, not every historical run or a physical iPhone.

## Conclusion and next evidence

**The intermittent hang was not reproduced, and its root cause remains unconfirmed.** Current compiled module/CSS delivery is healthy in the ten isolated cases. No production patch is justified by this result alone.

Earlier source QA definitely encountered save-conflict screens when a reused browser context reset the fixture revision while retaining locally dirty progress. The source capture harness was changed to fresh contexts and seed-only-if-absent state. That explains those recorded account-conflict screens; it is not evidence that every reported compiled opening hang has the same cause. The parent also reported a separate isolated retry reaching Start in1.37s with account fixtureHTTP200 and no errors.

On a future recurrence, retain the initial failure rather than extending the wait or silently reloading: compare the displayed outer/inner fallback, pending JS/CSS requests and statuses, JavaScript heartbeat, exact asset hashes/build time, console/page errors and fixture state. Keep any fixture/auth race separate from asset import or renderer failure. Native cold launches and memory-pressure behaviour remain device validation.
