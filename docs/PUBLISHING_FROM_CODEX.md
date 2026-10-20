# Publishing satslegends.com from this project

Open this repository’s root folder as your project in Codex.
Ask Codex **“Publish the website to satslegends.com”** to build and upload the current website and both games.
You can also double-click **PUBLISH WEBSITE.cmd** in the project folder.

## Commands

- `npm run publish:check` verifies the saved login and reads the website root.
- `npm run publish:probe` uploads a temporary test file, verifies it through HTTPS, checks replacement, then removes it.
- `npm run publish:plan` builds both games and previews the upload without changing server files.
- `npm run publish:site` builds both games, uploads and verifies the live page files.
- `npm run publish:rollback` restores the page entry files backed up before the most recent publish attempt.
- `npm run verify:publisher` checks upload ordering, dry-run behavior, interrupted-release recovery and private-file protection using a local in-memory server.

The build uses the existing pinned Lexcoria revision and gated playtest configuration. Pricing and game access remain managed by the existing website and backend.

## Connection and credentials

`.publish-target.json` contains the public target settings. The publisher reads the existing **Matharia** login from FileZilla’s local Site Manager on this Windows account. It does not copy the FTP password into this project or put it on a command line.

The saved alias `ftp.smart-el.co.uk` points to the server whose TLS certificate is issued for **mars.exacthosting.com**. The publisher connects using that certified name, validates its certificate, and checks that both names still resolve to the same server. Login and data transfers use TLS.

Keep the FileZilla site saved if you want to use this local publisher. If you change its name, host or password, update the local FileZilla entry and the non-secret target settings as needed. A FileZilla master-password login requires a separate interactive setup; the publisher stops if it cannot read the saved login.

The public website build settings belong in the ignored `.env.production.local`. Only public `VITE_*` settings belong there; never add backend service-role credentials to the website build.

## Release handling

The publisher validates the combined `dist` output, backs up the current HTML entry files and `.htaccess` under ignored `.deploy/backups`, then uploads assets before switching the entry files. File replacements use a temporary upload and server rename. It verifies the website and English entry pages over HTTPS after upload. A failed upload attempts to restore the backed-up entry files; a server outage can require a later rollback once the connection returns.

After a successful release, a local hash cache skips unchanged files on later publishes. If the remote index differs from the last published version, the cache is ignored. Existing old assets and hosting-managed files are retained so an earlier release can still be restored.

To deploy a newer Lexcoria game version, first update `scripts/lexcoria.commit` to its tested Git commit. A push to the separate game repository does not change this website’s pinned release automatically.
