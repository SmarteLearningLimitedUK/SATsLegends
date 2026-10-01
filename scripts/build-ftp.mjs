import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const build = spawnSync(process.execPath, ['--max-old-space-size=4096', vite, 'build'], {
  stdio: 'inherit', env: { ...process.env, VITE_ASSET_BASE: '/', VITE_ALLOW_GAME_PREVIEW: 'false' },
});
if (build.status !== 0) process.exit(build.status ?? 1);
const prepare = spawnSync(process.execPath, ['scripts/prepare-ftp.mjs'], { stdio: 'inherit' });
process.exit(prepare.status ?? 1);
