import { spawnSync } from 'node:child_process';
import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));
const englishRoot = path.resolve(process.env.LEXCORIA_DIR || path.join(websiteRoot, '..', 'Lexcoria'));
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const publicEnv = loadEnv('production', websiteRoot, 'VITE_');
const testLink = process.argv.includes('--test-link');

async function requireProject(root, name) {
  try {
    await stat(path.join(root, 'package.json'));
    await stat(path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'));
  } catch {
    throw new Error(`${name} is missing at ${root}, or its dependencies are not installed.`);
  }
}

function build(root, vitePath, env) {
  const result = spawnSync(process.execPath, ['--max-old-space-size=4096', vitePath, 'build'], {
    cwd: root, stdio: 'inherit', env: { ...process.env, ...publicEnv, ...env },
  });
  if (result.status !== 0) throw new Error(`Build failed in ${root} (exit ${result.status ?? 'unknown'}).`);
}

await requireProject(websiteRoot, 'SATs Legends');
await requireProject(englishRoot, 'Lexcoria');
build(websiteRoot, vite, { VITE_ASSET_BASE: '/', VITE_ALLOW_GAME_PREVIEW: 'false',
  ...(testLink ? { VITE_ENGLISH_RELEASED: 'false', VITE_ENGLISH_TESTING: 'true' } : {}),
});
build(englishRoot, path.join(englishRoot, 'node_modules', 'vite', 'bin', 'vite.js'), {
  VITE_SITE_EMBED: 'true', VITE_ALLOW_GAME_PREVIEW: 'false',
});
const target = path.join(websiteRoot, 'dist', 'english', 'play');
await mkdir(target, { recursive: true });
await cp(path.join(englishRoot, 'dist'), target, { recursive: true });
console.log(`Combined website and English game ready: ${path.join(websiteRoot, 'dist')}`);
