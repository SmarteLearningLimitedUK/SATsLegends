import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const websiteRoot = fileURLToPath(new URL('../', import.meta.url));
const lexRepo = 'https://github.com/SmarteLearningLimitedUK/Lexcoria.git';
const lexCommit = (await readFile(new URL('./lexcoria.commit', import.meta.url), 'utf8')).trim();
const publicEnv = loadEnv('production', websiteRoot, 'VITE_');

if (!/^[0-9a-f]{40}$/.test(lexCommit)) {
  throw new Error('scripts/lexcoria.commit must contain one full Git commit SHA.');
}
for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
  if (!publicEnv[name]) throw new Error(`${name} must be set for the gated Lexcoria build.`);
}

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.error || result.status !== 0) {
    if (options.capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed: ${result.error?.message || `exit ${result.status}`}`);
  }
  return options.capture ? result.stdout.trim() : undefined;
}

function npm(args, cwd) {
  const npmCli = process.env.npm_execpath;
  if (npmCli) return run(process.execPath, [npmCli, ...args], cwd);
  return run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, cwd);
}

const checkout = await mkdtemp(path.join(os.tmpdir(), 'sats-lexcoria-'));
try {
  run('git', ['init', '--quiet', checkout], websiteRoot);
  run('git', ['-C', checkout, 'remote', 'add', 'origin', lexRepo], websiteRoot);
  run('git', ['-C', checkout, 'fetch', '--depth=1', '--filter=blob:none', 'origin', lexCommit], websiteRoot);
  run('git', ['-C', checkout, 'sparse-checkout', 'set', '--no-cone',
    '/index.html', '/metadata.json', '/package.json', '/package-lock.json',
    '/tsconfig.json', '/vite.config.ts', '/src/*',
    '!/src/AngryBirdsRemakeUnity-main/', '!/src/AngryBirdsRemakeUnity-main.zip',
    '/public/*', '/sounds/*',
  ], websiteRoot);
  run('git', ['-C', checkout, 'checkout', '--detach', 'FETCH_HEAD'], websiteRoot);
  const actualCommit = run('git', ['-C', checkout, 'rev-parse', 'HEAD'], websiteRoot, { capture: true });
  if (actualCommit !== lexCommit) throw new Error('Lexcoria checkout did not match the pinned commit.');

  npm(['ci'], checkout);
  const previousLexDir = process.env.LEXCORIA_DIR;
  process.env.LEXCORIA_DIR = checkout;
  try {
    npm(['run', 'build:with-english', '--', '--test-link'], websiteRoot);
  } finally {
    if (previousLexDir === undefined) delete process.env.LEXCORIA_DIR;
    else process.env.LEXCORIA_DIR = previousLexDir;
  }

  await stat(path.join(websiteRoot, 'dist', 'index.html'));
  await stat(path.join(websiteRoot, 'dist', 'english', 'play', 'index.html'));
  console.log(`Gated Lexcoria artifact built from ${lexCommit}. Publish the website dist directory.`);
} finally {
  const temporaryRoot = await realpath(os.tmpdir());
  const checkedPath = await realpath(checkout);
  const relative = path.relative(temporaryRoot, checkedPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(checkedPath).startsWith('sats-lexcoria-')) {
    throw new Error(`Refusing to remove unexpected checkout path: ${checkedPath}`);
  }
  await rm(checkedPath, { recursive: true, force: true, maxRetries: 3 });
}
