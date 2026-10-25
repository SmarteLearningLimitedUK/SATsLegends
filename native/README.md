# SATs Legends iPhone app

This branch adds a Capacitor 8 iPhone shell around the current React/TypeScript/Vite game. It reuses the existing account gate, progress saving, artwork and gameplay. The older tracked `ios/` folder is preserved; the active Xcode project is `native/ios/App/App.xcodeproj`.

## Local preview

Use Node 22 or 24, then:

```sh
npm ci
npm run dev:ios
```

Open `http://127.0.0.1:3013/`. The iOS mode starts at `/play`, omits the website-return button and uses the native safe-area styles. A browser preview does not provide a native orientation lock or native plugin implementations.

The iOS mode inherits public `VITE_` configuration from `.env.production`, with `.env.ios`/`.env.ios.local` overrides. Account configuration remains the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Account gates are retained in the production build. Environment files and generated bundles are not committed.

## Build and open on a Mac

Install Xcode 26 or later and its iOS tooling, then run:

```sh
npm ci
npm run ios:sync
npm run ios:open
```

Select the App target, choose the signing team, confirm the existing bundle identifier `com.smartelearning.satslegends`, and run on an iPhone simulator or attached iPhone. The project uses Swift Package Manager; CocoaPods is not required. `npm run ios:run` is available after setting up Xcode and a destination.

`build:ios` writes to `dist-ios`; the website's `build` continues to write to `dist`. `ios:sync` rebuilds and copies the app bundle to `native/ios/App/App/public` and resolves the Capacitor App plugin. Do not edit copied bundle files.

## Behaviour and validation

- iPhone-only target, iOS 16 minimum. Both landscape directions are supported; portrait is excluded from the native supported orientations.
- The native view controller hides the status bar. Shared game layouts retain the home-indicator inset, with left/right safe areas applied to the native game stage.
- Capacitor app-state events augment the existing shared session pause state. Backgrounding pauses gameplay and music; foregrounding clears only this native pause, preserving help/result/rotation pauses.
- Existing website routes remain available for the existing family-account flow. This work does not add purchase, authentication or deep-link systems.

Run `npm run lint`, `npm run build`, `npm run build:ios`, and `npx cap sync ios`. For the landscape screenshot sweep, start `dev:ios` and run `npm run verify:ios` (WebKit by default). `LEGEND_IOS_QA_ENGINE=chromium` selects Chromium when WebKit is unavailable. The suite uses isolated account fixtures, never a real family account. It requires the repository's public production account configuration and existing game catalog at `qa-artifacts/current-game-screenshots/catalog.json`.

Browser screenshots are not simulator/device certification. The Windows host cannot compile or sign the Xcode project. Native signing, device safe areas, interruptions, account login/recovery and any external authentication return flow still need a Mac/device pass. The generated app icon and launch screen remain Capacitor placeholders; no final app artwork was added.

### Windows verification, 19 October 2026

TypeScript, website build, iOS bundle build and Capacitor sync passed. The production bundle passed 51 Chromium checks: 49 captures across all 37 game types and three landscape viewport sizes, a native pause/resume bridge stand-in, and simulated camera/home-indicator safe areas. Screenshots and JSON evidence are in `qa-artifacts/ios-app/`. Runtime dependencies passed `npm audit --omit=dev` with zero reported vulnerabilities.

WebKit could not run: Windows denied access to its `Playwright.exe` during launch and reinstall. No Safari, simulator or native-device pass is claimed.

## Files changed for the iOS foundation

- `capacitor.config.ts`, `package.json`, `package-lock.json`, `.gitignore`, `vite.config.ts`, `tsconfig.json`.
- `src/platform/nativeApp.ts`, `src/platform/native-app.css`, `src/main.tsx`.
- `src/App.tsx` (native pause state) and `src/website/WebsiteRoot.tsx` (native website-return visibility).
- `native/ios/` (generated Xcode/SPM project, landscape settings and native view controller).
- `scripts/verify-ios-app.mjs`, `scripts/build-ios-preview-gallery.mjs`, `native/README.md`.

Assumptions: the requested iOS version is an installable iPhone wrapper of the current game; the repository's existing bundle ID and account backend are retained. Existing uncommitted website work is preserved. No external legacy assumptions were used.

References: [Capacitor iOS setup](https://capacitorjs.com/docs/getting-started/environment-setup), [configuration](https://capacitorjs.com/docs/config), [iOS configuration](https://capacitorjs.com/docs/ios/configuration), [Supabase public keys](https://supabase.com/docs/guides/getting-started/api-keys).

## App Store subscription preparation

See [App Store preparation](APP_STORE_PREPARATION.md) for the StoreKit bridge, server verification, build checks and remaining Apple/Mac work. This is source preparation, not a signed or App Store-tested build.
