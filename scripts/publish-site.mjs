import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2] || 'plan';
if (!['check', 'probe', 'plan', 'publish', 'rollback'].includes(mode)) throw new Error('Unknown publish action.');
const stateDir = path.join(root, '.deploy');
mkdirSync(stateDir, { recursive: true });
const lock = path.join(stateDir, 'publish.lock');
let lockFd;
try { lockFd = openSync(lock, 'wx'); }
catch { throw new Error('A publish command is already running. If it was interrupted, remove .deploy/publish.lock after checking that it has stopped.'); }

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status ?? 'could not start'}).`);
}

try {
  writeFileSync(lockFd, `${process.pid}\n`);
  if (mode === 'plan' || mode === 'publish') {
    const npmCli = process.env.npm_execpath;
    if (!npmCli || !existsSync(npmCli)) throw new Error('Run this command through npm run publish:plan or npm run publish:site.');
    run(process.execPath, [path.join(root, 'scripts', 'verify-website-gameplay-source.mjs')]);
    // Include both games and enforce the existing account gates.
    run(process.execPath, [npmCli, 'run', 'build:cloudflare-english-test']);
    const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    writeFileSync(path.join(root, 'dist', 'site-release.json'), JSON.stringify({
      releaseId: randomUUID(), builtAt: new Date().toISOString(),
      sourceCommit: revision.status === 0 ? revision.stdout.trim() : null,
      games: JSON.parse(readFileSync(path.join(root, 'scripts', 'game-release-sources.json'), 'utf8')),
    }, null, 2) + '\n');
  }
  run('python', [path.join(root, 'scripts', 'publish-ftps.py'), mode]);
} catch (error) {
  console.error(`Publish stopped: ${error.message}`);
  process.exitCode = 1;
} finally {
  closeSync(lockFd);
  unlinkSync(lock);
}
