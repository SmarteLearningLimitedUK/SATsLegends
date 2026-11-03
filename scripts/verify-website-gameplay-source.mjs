import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'src/assets/website/gameplay');
const sources = JSON.parse(await readFile(path.join(root, 'scripts/game-release-sources.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(directory, 'capture-manifest.json'), 'utf8'));
assert.ok([undefined, 'deployed-game', 'development-preview'].includes(manifest.captureKind), 'Unrecognised capture kind.');
assert.equal(manifest.mathariaSnapshot, sources.matharia.snapshotSha256, 'Hosted Matharia changed since these previews were prepared. Review the captures before publishing.');
if (manifest.captureKind === 'development-preview') {
  const artDirectory = path.join(root, 'src/assets/website/matharia-current');
  const reference = JSON.parse(await readFile(path.join(artDirectory, 'source-manifest.json'), 'utf8'));
  assert.match(reference.referenceDigest, /^[a-f0-9]{64}$/);
  assert.equal(manifest.referenceDate, reference.referenceDate);
  assert.equal(manifest.referenceDigest, reference.referenceDigest, 'Preview captures must match the declared Matharia visual reference.');
  for (const art of reference.artwork) {
    assert.equal(path.basename(art.file), art.file);
    assert.equal(createHash('sha256').update(await readFile(path.join(artDirectory, art.file))).digest('hex'), art.sha256, `Website artwork ${art.file} differs from its game source`);
  }
}
assert.deepEqual(manifest.games.map(game => game.key).sort(), ['angle_arena', 'match3_equivalence', 'place_value_panic', 'potion_panic']);
for (const game of manifest.games) {
  for (const [file, expected] of [[game.file, game.sha256], [game.previewFile, game.previewSha256]]) {
    assert.equal(path.basename(file), file);
    const digest = createHash('sha256').update(await readFile(path.join(directory, file))).digest('hex');
    assert.equal(digest, expected, `Screenshot ${file} does not match its capture record.`);
  }
}
console.log(manifest.captureKind === 'development-preview' ? 'PASS latest-development previews match their reference; hosted game snapshot retained' : 'PASS all four gameplay previews and full-size images match the current Matharia snapshot');
