# SATs Legends Offline + iCloud Sync Architecture

SATs Legends is local-first. Gameplay must never depend on iCloud, internet access, or a signed-in Apple ID.

## Golden Rule

The game must still work when:

- The user is not signed into iCloud.
- The device has no internet.
- iCloud / CloudKit is unavailable.
- Native sync throws, times out, or returns stale data.

Never block gameplay or level completion on sync.

## React Runtime

The React app writes progress locally first through `src/storage/localFirstStorage.ts`.

Current synced keys:

- `sats-legends-save` - progression store
- `maths_quest_player_v2` - legacy/player profile data

Every local write enqueues a best-effort sync item in `sats-legends-sync-queue`.

## Native iOS Wrapper

For App Store builds, expose this object to the WebView:

```ts
window.SatsLegendsNativeSync = {
  isAvailable: async () => boolean,
  pushChanges: async (changes) => void,
  pullChanges: async () => changes,
};
```

Change shape:

```ts
type NativeSyncChange = {
  key: string;
  value: string | null;
  updatedAt: number;
  deviceId: string;
};
```

## Recommended Native Storage

Use SQLite for the authoritative on-device native cache if the wrapper owns persistence. If the WebView owns persistence, IndexedDB/localStorage remains acceptable because the React runtime writes locally before syncing.

Use CloudKit for iCloud sync. `NSUbiquitousKeyValueStore` is suitable only for small settings, not full progression.

## Conflict Rules

Minimum production rule:

- Last-write-wins per storage key using `updatedAt`.
- Ignore changes from the same `deviceId`.
- If a native merge fails, keep both native and local copies and do not block gameplay.

Future refinement:

- Merge counters such as XP, questions answered, and achievements by domain-specific rules instead of replacing the whole save blob.

## Startup / Resume Flow

1. App launches from local data immediately.
2. Sync drain runs in the background.
3. If native sync is unavailable, queue remains local.
4. On app foreground / online event, queued changes retry.

This makes App Store builds behave like a native game while remaining playable fully offline.

