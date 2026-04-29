import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(process.cwd());

const DIST_ASSETS_DIR = path.join(PROJECT_ROOT, 'dist', 'assets');
const REPORT_PATH = path.join(PROJECT_ROOT, '.tmp', 'asset-audit', 'asset-audit.json');

async function fileExists(p) {
  try {
    const stat = await fs.stat(p);
    return stat.isFile();
  } catch {
    return false;
  }
}

function stripHashFromDistFilename(filename) {
  // Vite emits: "<originalBase>-<hash><ext>"
  // Return "<originalBase><ext>".
  const ext = path.extname(filename);
  const withoutExt = filename.slice(0, -ext.length);
  const lastDash = withoutExt.lastIndexOf('-');
  if (lastDash <= 0) return null;
  const originalBase = withoutExt.slice(0, lastDash);
  return `${originalBase}${ext}`;
}

async function main() {
  const reportRaw = await fs.readFile(REPORT_PATH, 'utf8');
  const report = JSON.parse(reportRaw);

  const referencedRelPaths = report.referencedAssetFiles ?? [];
  if (!Array.isArray(referencedRelPaths) || referencedRelPaths.length === 0) {
    throw new Error('No referencedAssetFiles found in report; run scripts/audit-assets.mjs first.');
  }

  const distEntries = await fs.readdir(DIST_ASSETS_DIR, { withFileTypes: true });
  const distFiles = distEntries.filter((e) => e.isFile()).map((e) => e.name);

  const distByOriginalName = new Map();
  for (const distName of distFiles) {
    const originalName = stripHashFromDistFilename(distName);
    if (!originalName) continue;
    // Keep the first hit; hash may differ between builds but filename base should be stable.
    if (!distByOriginalName.has(originalName)) distByOriginalName.set(originalName, distName);
  }

  const missing = [];
  for (const rel of referencedRelPaths) {
    const abs = path.join(PROJECT_ROOT, rel);
    if (!(await fileExists(abs))) missing.push(rel);
  }

  let restoredCount = 0;
  const notFound = [];

  for (const rel of missing) {
    const filename = path.basename(rel);
    const distName = distByOriginalName.get(filename);
    if (!distName) {
      notFound.push(rel);
      continue;
    }

    const srcAbs = path.join(DIST_ASSETS_DIR, distName);
    const dstAbs = path.join(PROJECT_ROOT, rel);
    await fs.mkdir(path.dirname(dstAbs), { recursive: true });
    await fs.copyFile(srcAbs, dstAbs);
    restoredCount += 1;
  }

  process.stdout.write(`Missing used assets: ${missing.length}\n`);
  process.stdout.write(`Restored from dist: ${restoredCount}\n`);
  process.stdout.write(`Still missing (no dist match): ${notFound.length}\n`);
  if (notFound.length) {
    for (const item of notFound.slice(0, 50)) process.stdout.write(`- ${item}\n`);
    if (notFound.length > 50) process.stdout.write(`- ... (${notFound.length - 50} more)\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
