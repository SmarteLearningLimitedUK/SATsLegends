import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getGameSoundProfile, type SoundMaterial } from '../src/audio/gameSoundProfiles.ts';
import { NUMBER_BASE_CAMP_MINIGAME_PACKS } from '../src/systems/content/island1NumberBaseCamp.ts';

const constantsPath = fileURLToPath(new URL('../src/constants.ts', import.meta.url));
const constantsSource = readFileSync(constantsPath, 'utf8');
const declaredKeys = [...constantsSource.matchAll(/\bblueprintKey:\s*'([^']+)'/g)].map(match => match[1]);
const generatedKeys = NUMBER_BASE_CAMP_MINIGAME_PACKS.map(pack => pack.key);
const gameKeys = [...new Set([...declaredKeys, ...generatedKeys])];
const materials = new Set<SoundMaterial>(['arcane', 'metal', 'stone', 'water', 'wood', 'engine', 'digital', 'organic', 'paper']);
const fingerprints = new Set<string>();

assert.ok(declaredKeys.length >= 25, 'The current island levels must be inspected for sound coverage');
assert.ok(generatedKeys.length >= 5, 'Generated Number Base Camp packs must be inspected for sound coverage');

for (const key of gameKeys) {
  const profile = getGameSoundProfile(key);
  assert.equal(profile.id, key, `Missing a dedicated sound profile for ${key}`);
  assert.ok(materials.has(profile.material), `${key}: unsupported sound material`);
  assert.ok(Number.isFinite(profile.pitch) && profile.pitch >= .75 && profile.pitch <= 1.3, `${key}: pitch out of range`);
  assert.ok(Number.isFinite(profile.accent) && profile.accent >= 0 && profile.accent <= 1, `${key}: accent out of range`);
  const fingerprint = `${profile.material}:${profile.pitch}:${profile.accent}`;
  assert.ok(!fingerprints.has(fingerprint), `${key}: another game has an indistinguishable sound fingerprint`);
  fingerprints.add(fingerprint);
}

assert.equal(getGameSoundProfile('ratio_fractions').material, 'engine');
assert.equal(getGameSoundProfile('potion_panic').material, 'water');
assert.equal(getGameSoundProfile('maths_vs_zombies').material, 'arcane');
assert.equal(getGameSoundProfile('change_counter').material, 'metal');
assert.equal(getGameSoundProfile('graph_grabber').material, 'paper');
assert.equal(getGameSoundProfile(null).id, 'default');
assert.equal(getGameSoundProfile('missing_game').id, 'default');

console.log(`PASS sound profiles: ${gameKeys.length} distinct minigames covered, including all generated packs`);
