import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(process.cwd());

const ASSET_DIRS = ['src/assets', 'public/assets', 'public/audio', 'public/icons', 'public'];

const BINARY_ASSET_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.mp3',
  '.mpeg',
  '.ogg',
  '.wav',
  '.webm',
  '.mp4',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
]);

const TEXT_FILE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.html',
  '.json',
  '.md',
  '.txt',
  '.webmanifest',
]);

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function listFilesRecursive(rootDir) {
  const results = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.git')) continue;
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile()) results.push(fullPath);
    }
  }

  return results;
}

function extractAssetRefs(text) {
  const refs = new Set();
  const dynamicDirs = new Set();

  const patterns = [
    /(["'`])((?:(?:\.\.\/|\.\/)*)assets\/[^"'`]+)\1/g,
    /(["'`])((?:(?:\.\.\/|\.\/)*)audio\/[^"'`]+)\1/g,
    /(["'`])((?:(?:\.\.\/|\.\/)*)icons\/[^"'`]+)\1/g,
    /(["'`])(\/assets\/[^"'`]+)\1/g,
    /(["'`])(\/audio\/[^"'`]+)\1/g,
    /(["'`])(\/icons\/[^"'`]+)\1/g,
    /url\(\s*(["']?)([^"')]+)\1\s*\)/g,
    /new URL\(\s*(["'`])([^"'`]+)\1\s*,\s*import\.meta\.url\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const candidate = match[2] ?? match[1];
      if (!candidate) continue;
      if (candidate.startsWith('http:') || candidate.startsWith('https:') || candidate.startsWith('data:')) continue;

      const normalized = candidate.trim().replace(/\\/g, '/');
      if (normalized.startsWith('#')) continue;
      // Avoid pulling in code/module imports like "./audio/audioManager" unless they include a binary extension.
      const ext = path.posix.extname(normalized.split('?')[0].split('#')[0]).toLowerCase();
      const looksLikeBinary =
        BINARY_ASSET_EXTENSIONS.has(ext) ||
        normalized.includes('/assets/') ||
        normalized.startsWith('assets/') ||
        normalized.startsWith('/assets/') ||
        normalized.includes('/icons/') ||
        normalized.startsWith('icons/') ||
        normalized.startsWith('/icons/');
      if (!looksLikeBinary) continue;

      if (normalized.includes('${')) {
        const beforeInterpolation = normalized.split('${', 1)[0];
        const dir = beforeInterpolation.includes('/') ? beforeInterpolation.slice(0, beforeInterpolation.lastIndexOf('/')) : beforeInterpolation;
        if (dir) dynamicDirs.add(dir.replace(/\/$/, ''));
        continue;
      }

      if (normalized.includes('*') || normalized.includes('?') || normalized.includes('{') || normalized.includes('[')) {
        const dir = normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : normalized;
        if (dir) dynamicDirs.add(dir.replace(/\/$/, ''));
        continue;
      }

      refs.add(normalized);
    }
  }

  return { refs, dynamicDirs };
}

function resolveRef(fromFileAbs, ref) {
  if (ref.startsWith('/')) {
    // In Vite, absolute paths like "/icons/x.png" resolve from `public/`.
    return path.join(PROJECT_ROOT, 'public', ref.replace(/^\//, ''));
  }

  if (ref.startsWith('./') || ref.startsWith('../')) {
    return path.resolve(path.dirname(fromFileAbs), ref);
  }

  return path.join(PROJECT_ROOT, ref);
}

function printList(title, items, limit = 50) {
  const list = [...items].sort();
  process.stdout.write(`\n${title} (${list.length})\n`);
  for (const item of list.slice(0, limit)) process.stdout.write(`- ${item}\n`);
  if (list.length > limit) process.stdout.write(`- ... (${list.length - limit} more)\n`);
}

async function main() {
  const scanRoots = ['src', 'public', 'index.html', 'vite.config.ts', 'package.json'];
  const scanFiles = [];

  for (const root of scanRoots) {
    const abs = path.join(PROJECT_ROOT, root);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        scanFiles.push(...(await listFilesRecursive(abs)));
      } else if (stat.isFile()) {
        scanFiles.push(abs);
      }
    } catch {
      // ignore
    }
  }

  const usedAbsPaths = new Set();
  const referencedAssetRelPaths = new Set();
  const unresolvedRefs = new Set();
  const dynamicRefDirs = new Set();

  for (const fileAbs of scanFiles) {
    const ext = path.extname(fileAbs).toLowerCase();
    if (!TEXT_FILE_EXTENSIONS.has(ext)) continue;

    let content;
    try {
      content = await fs.readFile(fileAbs, 'utf8');
    } catch {
      continue;
    }

    const { refs, dynamicDirs } = extractAssetRefs(content);
    for (const dir of dynamicDirs) dynamicRefDirs.add(dir);

    for (const ref of refs) {
      const resolved = resolveRef(fileAbs, ref);
      usedAbsPaths.add(path.normalize(resolved));

      const resolvedRel = toPosix(path.relative(PROJECT_ROOT, resolved));
      const resolvedExt = path.extname(resolvedRel).toLowerCase();
      if (BINARY_ASSET_EXTENSIONS.has(resolvedExt)) {
        // Only track "real" asset files we can potentially delete/restore.
        if (resolvedRel.startsWith('src/assets/') || resolvedRel.startsWith('public/')) {
          referencedAssetRelPaths.add(resolvedRel);
        }
      }

      try {
        const stat = await fs.stat(resolved);
        if (stat.isDirectory()) dynamicRefDirs.add(toPosix(path.relative(PROJECT_ROOT, resolved)));
      } catch {
        // If it doesn't exist as-is, keep track; globs, Vite-transformed paths, and generated paths are expected.
        unresolvedRefs.add(`${toPosix(path.relative(PROJECT_ROOT, fileAbs))} -> ${ref}`);
      }
    }
  }

  const assetFiles = new Set();
  for (const dir of ASSET_DIRS) {
    const absDir = path.join(PROJECT_ROOT, dir);
    for (const fileAbs of await listFilesRecursive(absDir)) {
      const stat = await fs.stat(fileAbs);
      if (!stat.isFile()) continue;
      const ext = path.extname(fileAbs).toLowerCase();
      if (!BINARY_ASSET_EXTENSIONS.has(ext)) continue;
      assetFiles.add(path.normalize(fileAbs));
    }
  }

  const usedAssetFiles = new Set();
  const unusedAssetFiles = new Set();

  for (const fileAbs of assetFiles) {
    const rel = toPosix(path.relative(PROJECT_ROOT, fileAbs));
    const isUsedDirect = usedAbsPaths.has(fileAbs);
    const isUnderDynamicDir = [...dynamicRefDirs].some((dir) => {
      const normalizedDir = dir.replace(/^\//, '').replace(/^\.\//, '');
      return rel.startsWith(normalizedDir.replace(/\\/g, '/'));
    });

    if (isUsedDirect || isUnderDynamicDir) usedAssetFiles.add(rel);
    else unusedAssetFiles.add(rel);
  }

  printList('Dynamic asset directory refs', dynamicRefDirs);
  printList('Unresolved references (review; may be ok)', unresolvedRefs);
  printList('Used asset files', usedAssetFiles, 80);
  printList('Unused asset files (safe candidates)', unusedAssetFiles, 200);

  const report = {
    generatedAt: new Date().toISOString(),
    referencedAssetFiles: [...referencedAssetRelPaths].sort(),
    usedAssetFiles: [...usedAssetFiles].sort(),
    unusedAssetFiles: [...unusedAssetFiles].sort(),
    unresolvedRefs: [...unresolvedRefs].sort(),
    dynamicRefDirs: [...dynamicRefDirs].sort(),
  };

  const outDir = path.join(PROJECT_ROOT, '.tmp', 'asset-audit');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'asset-audit.json'), JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(
    path.join(outDir, 'asset-audit-unused.txt'),
    report.unusedAssetFiles.join('\n') + '\n',
    'utf8',
  );

  process.stdout.write('\nNext steps suggestion:\n');
  process.stdout.write('- Review "unresolved" and "dynamic dirs" before deleting.\n');
  process.stdout.write('- If you confirm, delete the "unused" list and update any moved paths.\n');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
