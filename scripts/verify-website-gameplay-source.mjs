import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'src/assets/website/gameplay');
const sources = JSON.parse(await readFile(path.join(root, 'scripts/game-release-sources.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(directory, 'capture-manifest.json'), 'utf8'));
assert.equal(manifest.mathariaSnapshot, sources.matharia.snapshotSha256, 'Gameplay previews are from an older Matharia release. Recapture before publishing.');
assert.deepEqual(manifest.games.map(game => game.key).sort(), ['angle_arena', 'match3_equivalence', 'place_value_panic', 'potion_panic']);
for (const game of manifest.games) {
  for (const [file, expected] of [[game.file, game.sha256], [game.previewFile, game.previewSha256]]) {
    assert.equal(path.basename(file), file);
    const digest = createHash('sha256').update(await readFile(path.join(directory, file))).digest('hex');
    assert.equal(digest, expected, `Screenshot ${file} does not match its capture record.`);
  }
}
console.log('PASS all four gameplay previews and full-size images match the current Matharia snapshot');
