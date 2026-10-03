import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Evaluate the current generators in memory. UI/assets are inert; no game
// component is mounted and no production source gains test-only exports.
const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const cache = new Map();
const rows = [];
const routeRenders = [];
let expandedFixtureGroup = null;
const sampleCount = Number(process.env.LEGEND_DIFFICULTY_SAMPLES || 1000);
const sourceFiles = new Set();
const noop = () => null;
const inertModule = new Proxy({ __esModule: true, default: noop }, {
  get(target, key) { return key in target ? target[key] : noop; },
});
const resolveFile = (request, parent) => {
  const base = path.resolve(path.dirname(parent), request);
  return ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx'].map((suffix) => base + suffix)
    .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
};
const actualHelpers = new Set([
  'src/systems/content/gameDifficulty.ts',
  'src/systems/content/island1NumberBaseCamp.ts',
  'src/utils/questionShuffle.ts',
  'src/utils/mathDisplay.ts',
  'src/utils/gameNames.ts',
]);
const load = (relative, names = []) => {
  const filename = path.resolve(root, relative);
  const key = `${filename}:${names.join(',')}`;
  if (cache.has(key)) return cache.get(key);
  sourceFiles.add(relative);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(`${source}\nexport const __difficultyQA = {${names.join(',')}};`, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    transformers: { before: [(context) => {
      const visit = (node) => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
          && node.expression.name.text === 'glob' && ts.isMetaProperty(node.expression.expression)) {
          return ts.factory.createObjectLiteralExpression([]);
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (file) => ts.visitNode(file, visit);
    }] },
  }).outputText;
  const module = { exports: {} };
  cache.set(key, module.exports);
  const localRequire = (request) => {
    if (relative === 'src/screens/IslandLevels.tsx' && request === 'react') return {
      ...require('react'), useState: () => [expandedFixtureGroup, noop], useEffect: noop, useMemo: (factory) => factory(),
    };
    if (relative === 'src/screens/IslandLevels.tsx' && request.endsWith('/testingFlags')) return { UNLOCK_ALL_LEVELS: false };
    if (relative === 'src/screens/IslandLevels.tsx' && request.endsWith('/gameSceneMeta')) return { GAME_SCENE_META: {} };
    if (request === 'react' || request === 'react/jsx-runtime') return require(request);
    if (request.endsWith('/assets/characters') || request === './assets/characters') return { CHARACTER_AVATARS: [], DEFAULT_AVATAR_ID: 'qa' };
    if (/\.(png|jpe?g|webp|svg|gif|css)$/.test(request)) return { __esModule: true, default: request };
    if (relative === 'src/app/AppRouter.tsx') {
      if (request === '../games') return { getMiniGame: (registryKey) => ({ render: (props) => { routeRenders.push({ registryKey, props }); return null; } }) };
      if (request.endsWith('/bossEncounterTypes')) return { isBossEncounterGameType: () => true };
      if (request.endsWith('/gameplaySessionContract')) return { bindMiniGameSessionHandlers: (_events, context) => ({ qaContext: context }), emitMiniGameSessionEvent: noop };
      if (request.endsWith('/angleArena/questions')) return { buildAngleQuestions: ({ level }) => [{ qaDifficulty: level }] };
    }
    if (request.startsWith('.')) {
      const resolved = resolveFile(request, filename);
      const rel = resolved && path.relative(root, resolved).replaceAll('\\', '/');
      if (rel && (actualHelpers.has(rel) || rel === 'src/constants.ts')) return load(rel);
    }
    return inertModule;
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
};
const generator = (file, names) => load(`src/games/${file}.tsx`, names).__difficultyQA;
const capturedCallback = (file, name, globals) => {
  const filename = path.join(root, `src/games/${file}.tsx`);
  const source = fs.readFileSync(filename, 'utf8');
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  const find = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name
      && node.initializer && ts.isCallExpression(node.initializer)) callback = node.initializer.arguments[0];
    ts.forEachChild(node, find);
  };
  find(parsed); assert.ok(callback, `Current callback ${name} was not found`);
  const compiled = ts.transpileModule(`module.exports = ${callback.getText(parsed)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: null };
  new Function('module', ...Object.keys(globals), compiled)(module, ...Object.values(globals));
  return module.exports;
};
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} versus ${expected}`);
const choices = (options, answer, count = 4) => {
  assert.equal(options.length, count);
  assert.equal(new Set(options).size, count, `Duplicate choices: ${JSON.stringify(options)}`);
  assert.equal(options.filter((value) => value === answer).length, 1, 'Correct answer must appear exactly once');
};
const record = (name, run) => {
  run(); rows.push({ name, status: 'passed' }); console.log(`PASS ${name}`);
};
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const fractionValue = (label) => label.includes('/') ? label.split('/').map(Number).reduce((a, b) => a / b)
  : label.endsWith('%') ? Number(label.slice(0, -1)) / 100 : Number(label);
const numericFraction = (value) => {
  const [numerator, denominator] = value.split('/').map(Number);
  return numerator / denominator;
};

const difficulty = load('src/systems/content/gameDifficulty.ts');
const seedCalls = [];
const buildCampaign = difficulty.buildFiveTierCampaign;
difficulty.buildFiveTierCampaign = (seeds) => { seedCalls.push(seeds); return buildCampaign(seeds); };
const { ISLANDS } = load('src/constants.ts');
record('34 ordinary games: one practice plus five scored tiers; three unchanged SATs papers', () => {
  let ordinary = 0; let papers = 0;
  for (const island of ISLANDS) {
    assert.equal(new Set(island.levels.map((level) => level.id)).size, island.levels.length);
    const groups = Map.groupBy(island.levels, (level) => level.miniGameKey || level.blueprintKey || level.gameType);
    for (const levels of groups.values()) {
      if (levels.some((level) => level.isBoss)) { papers += levels.length; continue; }
      ordinary += 1;
      assert.equal(levels.length, 6);
      const practice = levels.filter((level) => level.isPractice);
      assert.equal(practice.length, 1); assert.equal(practice[0].miniGameLevel, 0);
      assert.equal(difficulty.getGameDifficulty(practice[0]), 1);
      assert.deepEqual(levels.filter((level) => !level.isPractice).map(difficulty.getGameDifficulty).sort(), [1, 2, 3, 4, 5]);
    }
  }
  assert.equal(ordinary, 34); assert.equal(papers, 3);
  assert.equal(ISLANDS.flatMap((island) => island.levels).length, 207);
  assert.deepEqual(ISLANDS.find((island) => island.id === 8).levels.map((level) => [level.id, level.blueprintKey, level.isPractice]),
    [[1, 'crystal_core', false], [2, 'mirror_gate', false], [3, 'matrix_match', false]]);
});
record('Every current seed route retains canonical resolution and progress credit', () => {
  for (const seeds of seedCalls) {
    const canonical = buildCampaign(seeds);
    const island = { levels: canonical };
    for (const seed of seeds) {
      const resolved = difficulty.resolveIslandLevel(island, seed.id);
      assert.ok(resolved, `Missing current seed route ${seed.id}`);
      assert.equal(resolved.blueprintKey, seed.blueprintKey);
      assert.ok(difficulty.getLevelProgressIds(resolved).includes(seed.id));
      if (seed.isPractice) assert.equal(resolved.isPractice, true);
      else assert.equal(resolved.isPractice, false);
    }
  }
  const selected = (islandId, id) => difficulty.resolveIslandLevel(ISLANDS.find((island) => island.id === islandId), id);
  assert.equal(difficulty.getGameDifficulty(selected(1, 41)), 1); assert.equal(selected(1, 41).isPractice, false);
  assert.equal(difficulty.getGameDifficulty(selected(6, 4)), 1); assert.equal(selected(6, 4).isPractice, false);
  assert.equal(difficulty.getGameDifficulty(selected(5, 14)), 1); assert.equal(selected(5, 14).isPractice, true);
  const router = fs.readFileSync(path.join(root, 'src/app/AppRouter.tsx'), 'utf8');
  assert.match(router, /const difficulty = getGameDifficulty\(selectedLevel\)/);
  assert.match(router, /levelId: selectedLevel\.id/); // Bound event context keeps canonical route identity.
  assert.match(router, /levelId: difficulty/);
});
const appRouter = load('src/app/AppRouter.tsx');
record('Actual Router sends five-tier generator props and canonical session IDs on every route', () => {
  for (const island of ISLANDS) for (const level of island.levels) {
    const before = routeRenders.length;
    appRouter.AppRouter({
      screen: 'gameplay', selectedLevel: level, selectedIsland: island, player: { avatarId: 'qa' },
      gameplayRestartKey: 0, sessionEvents: {}, sessionState: { lives: 3, paused: false },
      onBackToIslandLevels: noop, onGameplayVictory: noop, onGameplayOver: noop,
    });
    assert.equal(routeRenders.length, before + 1, `No current routed component for ${island.id}/${level.id}`);
    const rendered = routeRenders.at(-1); rendered.islandId = island.id; rendered.routeId = level.id;
    rendered.blueprintKey = level.blueprintKey; rendered.difficulty = difficulty.getGameDifficulty(level); rendered.practice = level.isPractice;
    assert.equal(rendered.props.levelId, level.isBoss ? level.id : rendered.difficulty);
    if (!level.isBoss) {
      assert.equal(rendered.props.miniGameLevel, rendered.difficulty);
      assert.equal(rendered.props.sessionEvents.qaContext.levelId, level.id);
    }
  }
  const active = new Set(routeRenders.map(({ registryKey }) => registryKey));
  assert.equal(active.size, 35); // 34 ordinary current games and the shared fixed-paper component.
  assert.equal(active.has('DecimalSniperGame'), false);
  assert.equal(active.has('CalculationCrashGame'), false);
});
const mineQuestions = generator('MultiplicationMineGame', ['makeQuestionDeck']);
record('Mine four-strike decks use distinct facts and products in progressively harder factor bands', () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < 100; sample++) {
    const deck = mineQuestions.makeQuestionDeck(tier);
    assert.equal(deck.length, 4);
    assert.equal(new Set(deck.map(({ a, b }) => `${a}x${b}`)).size, 4);
    assert.equal(new Set(deck.map(({ answer }) => answer)).size, 4);
    for (const question of deck) {
      assert.equal(question.answer, question.a * question.b);
      choices(question.options, question.answer);
      assert.ok(question.a >= [2, 2, 3, 4, 7][tier - 1]);
      assert.ok(question.b >= [2, 6, 8, 10, 11][tier - 1]);
      assert.ok(question.b <= [5, 7, 9, 12, 12][tier - 1]);
    }
  }
});
const percentQuestions = generator('PercentPowerGame', ['buildQuestion']);
record('Reactor runs have no repeated prompts or correct answers and retain tier-specific maths', () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < 100; sample++) {
    const run = [];
    for (let round = 1; round <= Math.min(10, 5 + Math.floor(tier / 2)); round++) {
      const question = percentQuestions.buildQuestion(tier, round, run);
      const answer = Number(question.options[question.answerIndex]);
      choices(question.options, `${answer}`);
      assert.ok(!run.some((earlier) => earlier.prompt === question.prompt), `Repeated reactor prompt: ${question.prompt}`);
      assert.ok(!run.some((earlier) => earlier.options[earlier.answerIndex] === `${answer}`), `Repeated reactor answer: ${answer}`);
      if (question.prompt.startsWith('What is ')) {
        const [, percent, amount] = question.prompt.match(/^What is (\d+)% of (\d+)\?$/) || [];
        near(answer, Number(percent) * Number(amount) / 100, 'Direct percentage');
        if (tier <= 2) assert.ok([10, 50, 25, 75].includes(Number(percent)));
      } else if (question.prompt.includes('of a number is')) {
        const [, percent, part] = question.prompt.match(/^(\d+)% of a number is (\d+)\./) || [];
        near(Number(part), answer * Number(percent) / 100, 'Reverse percentage');
        assert.ok(tier >= 3);
      } else {
        const [, base, percent] = question.prompt.match(/has (\d+) units\. It gains (\d+)%/) || [];
        near(answer, Number(base) * (1 + Number(percent) / 100), 'Percentage increase');
        assert.equal(tier, 5);
      }
      run.push(question);
    }
  }
});
const racerQuestions = generator('RatioRacerGame', ['getDifficultyPool', 'buildTierDeck']);
record('Race tiers offer a full non-repeating lap and only one mathematically correct fuel fraction', () => {
  for (let tier = 1; tier <= 5; tier++) {
    const pool = racerQuestions.getDifficultyPool(tier);
    assert.ok(pool.length >= [9, 11, 11, 13, 13][tier - 1], `Short tier ${tier} race pool: ${pool.length}`);
    assert.equal(new Set(pool.map((question) => question.prompt)).size, pool.length);
    const deck = racerQuestions.buildTierDeck(pool, null);
    for (let index = 1; index < deck.length; index++) {
      assert.notEqual(numericFraction(deck[index].correctAnswer), numericFraction(deck[index - 1].correctAnswer),
        `Repeated adjacent fuel answer in tier ${tier}`);
    }
    for (const question of deck) {
      assert.equal(question.ratio.length, tier <= 3 ? 2 : tier - 1);
      const total = question.ratio.reduce((sum, value) => sum + value, 0);
      assert.equal(numericFraction(question.correctAnswer), question.ratio[question.labels.indexOf(question.target)] / total);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.equal(question.options.filter((option) => numericFraction(option) === numericFraction(question.correctAnswer)).length, 1);
    }
  }
});
const islandMenu = load('src/screens/IslandLevels.tsx');
const findElements = (element, predicate) => {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap((child) => findElements(child, predicate));
  return [...(predicate(element) ? [element] : []), ...findElements(element.props?.children, predicate)];
};
record('Actual level menu with testing override off: practice optional, sequential tiers and retired progress credit', () => {
  for (const island of ISLANDS.filter((entry) => entry.id !== 8)) {
    const groups = Map.groupBy(island.levels, (level) => level.miniGameKey);
    for (const [key, levels] of groups) {
      expandedFixtureGroup = key;
      const player = { completedLevels: {}, levelStars: {}, stats: {} };
      const states = () => {
        const rendered = islandMenu.default({ island, player, onBack: noop, onSelectLevel: noop });
        const rows = findElements(rendered, (element) => element.props?.['data-level-route'] !== undefined);
        assert.equal(rows.length, 6);
        return rows.map((row) => ({ row, level: levels.find((level) => level.id === row.props['data-level-route']),
          disabled: findElements(row, (element) => element.type === 'button' && element.props['aria-label'])[0].props.disabled }));
      };
      assert.deepEqual(states().filter(({ disabled }) => !disabled).map(({ level }) => level.miniGameLevel).sort(), [0, 1]);
      player.completedLevels[island.id] = [levels.find((level) => level.isPractice).id];
      assert.deepEqual(states().filter(({ disabled }) => !disabled).map(({ level }) => level.miniGameLevel).sort(), [0, 1]);
      for (let tier = 1; tier <= 4; tier++) {
        const completed = levels.find((level) => !level.isPractice && difficulty.getGameDifficulty(level) === tier);
        const formerId = difficulty.getLevelProgressIds(completed).at(-1);
        player.completedLevels[island.id].push(formerId); player.levelStars[`${island.id}-${formerId}`] = 2;
        const next = states().find(({ level }) => !level.isPractice && difficulty.getGameDifficulty(level) === tier + 1);
        assert.equal(next.disabled, false, `Tier ${tier + 1} should unlock after credited tier ${tier}`);
        const done = states().find(({ level }) => level.id === completed.id);
        assert.equal(findElements(done.row, (element) => element.props?.name === 'brainpowerToken' && element.props.className.includes('opacity-100')).length, 2);
      }
    }
  }
});

const remainder = generator('RemainderRunGame', ['stageForTier', 'createProblem']);
record(`Remainder arithmetic, unique correct-inclusive choices and fixed tier caps (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = remainder.createProblem(remainder.stageForTier(tier));
    assert.equal(q.dividend, q.divisor * q.quotient + q.remainder);
    assert.ok(q.remainder >= 0 && q.remainder < q.divisor);
    choices(q.options, q.answerLabel);
    if (q.answerMode === 'decimal') near(Number(q.answerLabel), q.dividend / q.divisor, 'Exact decimal answer');
    else assert.equal(q.answerLabel, `${q.quotient} r${q.remainder}`);
    if (tier === 1) { assert.ok(q.dividend <= 17); assert.ok(q.divisor <= 4); assert.equal(q.answerMode, 'remainder'); }
    if (tier <= 3) assert.equal(q.answerMode, 'remainder');
    if (tier >= 4) assert.equal(q.answerMode, 'decimal');
  }
});
const zombies = generator('MathsVsZombiesGame', ['buildQuestion', 'maxZombiesForLevel', 'starsFromAccuracy']);
record(`Zombies exact arithmetic and introductory one-digit cap (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = zombies.buildQuestion(tier);
    const match = q.prompt.match(/(-?\d+)\s*([+x÷-])\s*(-?\d+)$/);
    assert.ok(match, `Unreadable equation: ${q.prompt}`);
    const [, aText, op, bText] = match; const a = Number(aText); const b = Number(bText);
    const answer = op === '+' ? a + b : op === '-' ? a - b : op === 'x' ? a * b : a / b;
    assert.equal(q.options[q.correctIndex], answer); choices(q.options, answer);
    if (tier === 1) { assert.equal(op, '+'); assert.ok(a >= 0 && a <= 5 && b >= 0 && b <= 5 && answer <= 10); }
    if (tier <= 3) assert.ok(op === '+' || op === '-');
    if (tier === 4) assert.ok(op === 'x' || op === '÷');
    if (tier <= 4) assert.ok(q.options.every((value) => value >= 0));
  }
  assert.deepEqual([1, 2, 3, 4, 5].map(zombies.maxZombiesForLevel), [1, 2, 2, 3, 4]);
  for (let tier = 1; tier <= 5; tier++) {
    const goal = tier + 3;
    assert.equal(zombies.starsFromAccuracy(goal, goal), 3);
    assert.equal(zombies.starsFromAccuracy(goal, goal + 1), goal / (goal + 1) >= .9 ? 3 : 2);
    assert.equal(zombies.starsFromAccuracy(goal, goal * 2), 1);
  }
});
const rocket = generator('RoundingRocketGame', ['generateRound']);
record(`Rounding target and pad arithmetic remain in selected band (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = rocket.generateRound(tier, tier);
    assert.equal(q.correctAnswer, Math.round(q.value / q.target) * q.target);
    choices(q.pads, q.correctAnswer, 3); assert.ok(q.pads.every((pad) => pad % q.target === 0));
    assert.ok(q.value <= [99, 499, 999, 4999, 9999][tier - 1]);
  }
});
const forge = generator('FractionForgeGame', ['makeRound']);
record(`Fraction sorting and fixed proper/improper/card-count bands (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = forge.makeRound(tier, sample + 100);
    assert.equal(q.cards.length, [3, 3, 4, 4, 5][tier - 1]);
    assert.equal(new Set(q.cards.map((card) => card.value)).size, q.cards.length);
    const descending = q.prompt.includes('largest to smallest');
    assert.deepEqual(q.sortedIds, [...q.cards].sort((a, b) => descending
      ? b.numerator * a.denominator - a.numerator * b.denominator
      : a.numerator * b.denominator - b.numerator * a.denominator).map((card) => card.id));
    for (const card of q.cards) {
      near(card.value, card.numerator / card.denominator, 'Fraction value');
      if (tier <= 3) assert.ok(card.numerator < card.denominator);
      if (tier === 1) { assert.equal(card.numerator, 1); assert.ok(card.denominator <= 4); }
    }
  }
});
const simplify = generator('SimplifySprintGame', ['makeQuestion']);
record(`Simplification equivalence, fully reduced answer and one correct choice (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = simplify.makeQuestion(tier, sample + 100);
    assert.equal(q.prompt.numerator * q.answer.denominator, q.answer.numerator * q.prompt.denominator);
    assert.equal(gcd(q.answer.numerator, q.answer.denominator), 1);
    choices(q.options.map((o) => `${o.numerator}/${o.denominator}`), `${q.answer.numerator}/${q.answer.denominator}`);
    assert.equal(q.options.filter((o) => o.numerator * q.answer.denominator === q.answer.numerator * o.denominator).length, 1);
    if (tier <= 4) assert.ok(q.answer.numerator < q.answer.denominator);
    assert.ok(q.answer.denominator <= [4, 6, 10, 16, 24][tier - 1]);
  }
});
const area = generator('AreaArchitectGame', ['buildQuestionDeck']);
record('Area cell geometry, choice uniqueness and tier-specific decks', () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < 100; sample++) {
    for (const q of area.buildQuestionDeck(tier, null)) {
      assert.equal(new Set(q.cells.map((c) => `${c.x},${c.y}`)).size, q.correct);
      assert.ok(q.cells.every((c) => c.x >= 0 && c.x < q.gridSize && c.y >= 0 && c.y < q.gridSize));
      choices(q.options, q.correct); if (tier === 1) assert.ok(q.correct <= 6);
    }
  }
});
const scale = generator('ScaleBuilderGame', ['levelsForTier']);
record('Five scale-builder projects retain the chosen shape/factor and answerable quarter steps', () => {
  for (let tier = 1; tier <= 5; tier++) {
    const projects = scale.levelsForTier(tier);
    assert.equal(projects.length, 5); assert.equal(new Set(projects.map((project) => project.id)).size, 5);
    assert.equal(new Set(projects.map((project) => project.targetScale)).size, 1);
    assert.equal(new Set(projects.map((project) => project.shape.type)).size, 1);
    for (const project of projects) {
      assert.ok(Number.isInteger(project.targetScale * 4));
      assert.ok(project.instructions.includes(`${project.shape.baseWidth} units by ${project.shape.baseHeight} units`));
    }
  }
});
const pyramid = generator('ProblemPyramidGame', ['buildRound']);
record(`Pyramid sums and within-run magnitude limits (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = pyramid.buildRound(tier, sample + 100);
    assert.deepEqual(q.middle, [q.base[0] + q.base[1], q.base[1] + q.base[2]]);
    assert.equal(q.top, q.base[0] + 2 * q.base[1] + q.base[2]); choices(q.options, q.top);
    assert.ok(q.base.every((value) => value <= [4, 8, 12, 18, 30][tier - 1]));
  }
});
const share = generator('ShareSplitterGame', ['createChallenge']);
record(`Sharing ratios/counts stay bounded after repeated rounds (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = share.createChallenge(tier, sample + 100);
    assert.equal(q.plateCount, 5); assert.equal(q.totalSlices, q.targetCounts.reduce((a, b) => a + b));
    const multiplier = q.targetCounts[0] / q.ratios[0];
    q.targetCounts.forEach((count, index) => assert.equal(count, q.ratios[index] * multiplier));
    assert.ok(q.totalSlices <= 36); if (tier === 1) assert.deepEqual(q.targetCounts, [1, 1, 1, 1, 1]);
  }
});
const potion = generator('PotionPanicGame', ['generateChallenge']);
record(`Potion ratio/total/whole-drop and selected ingredient-count bands (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = potion.generateChallenge(tier, sample + 100);
    assert.equal(q.activeIndices.length, tier <= 2 ? 2 : tier <= 4 ? 3 : 4);
    assert.equal(q.totalDrops, q.targetCounts.reduce((a, b) => a + b));
    q.targetCounts.forEach((count, index) => { assert.ok(Number.isInteger(count)); near(count, q.baseRatio[index] * q.scale, 'Whole-drop ratio'); });
    assert.ok(q.stage <= (tier === 5 ? 6 : tier));
    if (tier === 1) { assert.deepEqual(q.targetCounts, [2, 5]); assert.equal(q.revealTargets, true); }
  }
});
const match = generator('FractionMatchGame', ['pickTileLabel', 'createInitialBoard', 'findMatches']);
record('Fraction-match labels keep exact equivalence; every initial board is match-free', () => {
  const values = { red: .5, blue: .25, green: .75, yellow: .2, purple: .4 };
  for (let tier = 1; tier <= 5; tier++) {
    const formats = new Set();
    for (let sample = 0; sample < sampleCount; sample++) for (const [type, value] of Object.entries(values)) {
      const label = match.pickTileLabel(type, tier); near(fractionValue(label), value, 'Equivalent gem label');
      formats.add(label.includes('/') ? 'fraction' : label.endsWith('%') ? 'percentage' : 'decimal');
    }
    assert.deepEqual([...formats].sort(), [['fraction'], ['fraction'], ['fraction', 'percentage'], ['decimal', 'fraction'], ['decimal', 'fraction', 'percentage']][tier - 1]);
    for (let sample = 0; sample < 100; sample++) {
      const board = match.createInitialBoard(tier); assert.equal(board.length, 30); assert.deepEqual(match.findMatches(board), []);
    }
  }
});
const formula = generator('FormulaForgeGame', ['createRound']);
record(`Formula substitution and reverse calculation answers (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = formula.createRound(tier); const given = Object.fromEntries(q.given.map(({ label, value }) => [label, value]));
    const all = { ...given, [q.targetLabel]: q.answer };
    if (q.title === 'Rectangle Area') near(all.A, all.l * all.w, 'Rectangle formula');
    else if (q.title === 'Rectangle Perimeter') near(all.P, 2 * (all.l + all.w), 'Perimeter formula');
    else if (q.title === 'Triangle Area') near(all.A, all.b * all.h / 2, 'Triangle formula');
    else near(all.V, all.l * all.w * all.h, 'Volume formula');
    choices(q.options, q.answer); if (tier === 1) assert.equal(q.title, 'Rectangle Area');
    if (tier < 5) assert.equal(q.kind, 'fluency');
  }
});
const rotation = generator('RotationStationGame', ['createQuestion', 'stageFromProgress']);
const polygon = generator('PolygonPalaceGame', ['createQuestion', 'stageFromProgress', 'PROPERTY_POOL', 'SORT_CRITERIA']);
record(`Rotation and polygon tier caps hold at high round counts and low time (${sampleCount * 10} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    for (const [api, expectedStages] of [[rotation, [1, 4, 6, 8, 11]], [polygon, [1, 3, 5, 8, 11]]]) {
      const q = api.createQuestion(tier, sample + 100, 0); assert.equal(q.stage, expectedStages[tier - 1]);
      const options = q.options || q.choices; const correct = q.correctOptionIds || q.correctChoiceIds;
      assert.ok(correct.length > 0); assert.equal(new Set(options.map((choice) => choice.id)).size, options.length);
      if (q.mode !== 'rotate_match') assert.ok(correct.every((id) => options.some((choice) => choice.id === id)));
      if (api === rotation) {
        assert.equal(q.targetOrientation, (q.startOrientation + (q.direction === 'cw' ? q.quarterTurns : -q.quarterTurns) + 4) % 4);
        if (tier === 1) { assert.equal(q.mode, 'rotate_match'); assert.equal(q.quarterTurns, 1); }
      } else if (q.mode === 'properties') {
        const trueIds = q.choices.filter((choice) => polygon.PROPERTY_POOL.find((property) => property.id === choice.id).check(q.shape)).map((choice) => choice.id).sort();
        assert.deepEqual([...correct].sort(), trueIds);
      } else if (q.mode === 'name') assert.equal(q.choices.find((choice) => choice.id === correct[0]).label, q.shape.name);
    }
  }
});
const prime = generator('PrimePopGame', ['getConfig', 'isPrime']);
record('Prime bands remain distinct and mathematically classified through 99', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((tier) => prime.getConfig(tier).maxNumber), [20, 40, 60, 80, 99]);
  for (let value = 0; value <= 99; value++) {
    const expected = value >= 2 && !Array.from({ length: Math.max(0, value - 2) }, (_, i) => i + 2).some((divisor) => value % divisor === 0);
    assert.equal(prime.isPrime(value), expected);
  }
});

const graph = generator('GraphGrabberGame', ['buildRound']);
record(`Graph Grabber valid answers, chart totals and first-tier reading cap (${sampleCount * 5} questions)`, () => {
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = graph.buildRound(tier, sample + 100);
    assert.ok(q.correctAnswers.length > 0);
    assert.equal(new Set(q.options.map((option) => option.id)).size, q.options.length);
    assert.ok(q.correctAnswers.every((id) => q.options.some((option) => option.id === id)));
    const data = q.bars || q.line || q.pie;
    assert.ok(data.every((datum) => datum.value >= 0));
    if (tier === 1) { assert.equal(q.kind, 'bar'); assert.ok(Math.max(...q.bars.map((bar) => bar.value)) <= 10); assert.equal(q.answerMode, 'single'); }
    if (q.pie) assert.equal(q.pie.reduce((sum, slice) => sum + slice.value, 0), 100);
    if (q.prompt === 'How many crates did Windward deliver?') assert.deepEqual(q.correctAnswers, [String(q.bars.find((bar) => bar.label === 'Windward').value)]);
    if (q.prompt === 'Which caravan delivered the most crates?') assert.equal(q.correctAnswers[0], q.bars.reduce((best, bar) => bar.value > best.value ? bar : best).label);
    if (q.prompt === 'Which slice is largest?') assert.equal(q.correctAnswers[0], q.pie.reduce((best, slice) => slice.value > best.value ? slice : best).label);
  }
});
const line = generator('LineGraphLabGame', ['generateRound']);
record(`Line graphs correct-inclusive choices and unambiguous greatest rise (${sampleCount * 5} questions)`, () => {
  const seen = new Set();
  for (let tier = 1; tier <= 5; tier++) for (let sample = 0; sample < sampleCount; sample++) {
    const q = line.generateRound(tier); choices(q.options, q.correctAnswer);
    if (tier === 1) assert.ok(q.graph.every((point) => point.value <= 10));
    if (q.question.includes('increase the most')) {
      seen.add('comparison');
      const rises = q.graph.slice(1).map((point, i) => point.value - q.graph[i].value);
      const max = Math.max(...rises); assert.equal(rises.filter((rise) => rise === max).length, 1);
      const index = rises.indexOf(max); assert.equal(q.correctAnswer, `${index + 1} to ${index + 2}`);
    } else if (q.question.includes('coordinates')) {
      const point = q.graph[q.highlightIndex]; assert.equal(q.correctAnswer, `(${point.label}, ${point.value})`);
    } else if (q.question.includes('reach 20')) {
      const matches = q.graph.filter((point) => point.value === 20); assert.equal(matches.length, 1); assert.equal(q.correctAnswer, matches[0].label);
    } else assert.equal(q.correctAnswer, String(q.graph[3].value));
  }
  assert.ok(seen.has('comparison'));
});
const treasure = generator('TreasurePathGame', ['generateRound']);
record(`Coordinate/direct and translation targets fit all five grid bands (${sampleCount * 10} questions)`, () => {
  const source = fs.readFileSync(path.join(root, 'src/games/TreasurePathGame.tsx'), 'utf8');
  assert.match(source, /const gridSize = difficulty <= 2 \? 5 : difficulty === 3 \? 6 : 7/);
  for (let tier = 1; tier <= 5; tier++) for (const translation of [false, true]) for (let sample = 0; sample < sampleCount; sample++) {
    const size = [5, 5, 6, 7, 7][tier - 1]; const q = treasure.generateRound(size, tier, translation);
    for (const point of [q.start, q.target]) assert.ok(point.x >= 1 && point.x <= size && point.y >= 1 && point.y <= size);
    if (tier === 1 && !translation) assert.equal(q.promptType, 'coordinate');
    if (q.promptType === 'movement') {
      const steps = [...q.promptText.matchAll(/Move (\d+) (right|left|up|down)/g)];
      assert.equal(steps.length, tier <= 2 ? 1 : tier === 3 ? 2 : 3);
      const calculated = { ...q.start };
      for (const [, distance, direction] of steps) {
        calculated.x += direction === 'right' ? Number(distance) : direction === 'left' ? -Number(distance) : 0;
        calculated.y += direction === 'up' ? Number(distance) : direction === 'down' ? -Number(distance) : 0;
        assert.ok(calculated.x >= 1 && calculated.x <= size && calculated.y >= 1 && calculated.y <= size);
      }
      assert.deepEqual(q.target, calculated);
      if (tier === 1) assert.equal(Math.abs(q.start.x - q.target.x) + Math.abs(q.start.y - q.target.y), 1);
    }
  }
});
const mean = generator('MeanMachineGame', ['buildRound']);
record(`Mean/median/mode/missing arithmetic stays at the chosen band (${sampleCount * 5} questions)`, () => {
  const allModes = new Set();
  for (let tier = 1; tier <= 5; tier++) {
    let previous = null;
    for (let sample = 0; sample < sampleCount; sample++) {
      const q = mean.buildRound(tier, sample + 100, previous); previous = q.mode; allModes.add(q.mode);
      const values = q.activeReelIndexes.map((index) => q.actualValues[index]);
      const sorted = [...values].sort((a, b) => a - b);
      assert.ok(values.every((value) => Number.isFinite(value) && value > 0));
      choices(q.options, q.correctAnswer, q.mode === 'mean' && tier <= 2 ? 3 : 4);
      if (q.mode === 'mean') near(q.correctAnswer, values.reduce((a, b) => a + b) / values.length, 'Mean answer');
      else if (q.mode === 'median') near(q.correctAnswer, sorted[Math.floor(sorted.length / 2)], 'Median answer');
      else if (q.mode === 'mode') {
        const counts = new Map(); values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
        const highest = Math.max(...counts.values()); const modes = [...counts].filter(([, count]) => count === highest);
        assert.equal(modes.length, 1); assert.equal(q.correctAnswer, modes[0][0]);
      } else {
        near(q.targetMean, values.reduce((a, b) => a + b) / values.length, 'Missing-number target mean');
        const missing = q.activeReelIndexes.filter((index) => q.visibleValues[index] === null);
        assert.equal(missing.length, 1); assert.equal(q.correctAnswer, q.actualValues[missing[0]]);
      }
      if (tier === 1) { assert.equal(q.mode, 'mean'); assert.equal(values.length, 2); assert.ok(values.every((value) => value <= 10)); }
      if (tier === 2) assert.ok(q.mode === 'mean' || q.mode === 'median');
      if (tier === 3) assert.ok(q.mode !== 'missing');
    }
  }
  assert.deepEqual([...allModes].sort(), ['mean', 'median', 'missing', 'mode']);
});
const detectiveData = generator('DataDetectiveGame', ['ITEMS', 'MONSTER_NAMES', 'MONSTER_COLORS', 'MUGSHOT_IMAGES', 'DETECTIVE_BRIEFS', 'WHODUNNIT_BRIEFS', 'shuffle']);
record(`Actual Data Detective callback: bounded evidence, one matching culprit, early bar-only cases (${sampleCount * 5} cases)`, () => {
  for (let tier = 1; tier <= 5; tier++) {
    const captured = {};
    const setter = (name) => (value) => { captured[name] = value; };
    const build = capturedCallback('DataDetectiveGame', 'generateCase', {
      ...detectiveData, difficulty: tier,
      setCaseMode: setter('mode'), setCaseBrief: setter('brief'), setChartType: setter('chart'),
      setCurrentCase: setter('evidence'), setSuspects: setter('suspects'), setGuiltyId: setter('guiltyId'),
      setFeedback: noop, setSelectedSuspectId: noop, setIncorrectSuspectIds: noop, setPinnedEvidence: noop,
    });
    for (let sample = 0; sample < sampleCount; sample++) {
      build(); const max = [5, 8, 12, 20, 30][tier - 1];
      assert.ok(captured.evidence.every((item) => item.amount >= 1 && item.amount <= max));
      assert.equal(captured.suspects.length, 4);
      const totals = captured.evidence.map((item) => item.amount);
      const matches = captured.suspects.filter((suspect) => suspect.items.every((value, i) => value === totals[i]));
      assert.equal(matches.length, 1); assert.equal(matches[0].id, captured.guiltyId);
      assert.ok(captured.suspects.every((suspect) => suspect.items.every((value) => value >= 1 && value <= max)));
      if (tier <= 2) assert.equal(captured.chart, 'bar');
    }
  }
});
record(`Median Mountain source fixture (currently not routed): exact medians and fixed counts (${sampleCount * 5} cases)`, () => {
  sourceFiles.add('src/games/MedianMountainGame.tsx');
  for (let tier = 1; tier <= 5; tier++) {
    let captured;
    const build = capturedCallback('MedianMountainGame', 'generateLevel', {
      difficulty: tier, setCurrentLevelData: (data) => { captured = data; }, setUserAnswer: noop,
      setFeedback: noop, setIsSorted: noop, window: { setTimeout: noop }, inputRef: { current: null },
    });
    for (let sample = 0; sample < sampleCount; sample++) {
      build(sample + 100); assert.equal(captured.numbers.length, [3, 5, 7, 4, 6][tier - 1]);
      assert.ok(captured.numbers.every(({ value }) => value >= 1 && value <= [10, 20, 35, 50, 80][tier - 1]));
      const ordered = captured.numbers.map(({ value }) => value).sort((a, b) => a - b);
      const mid = Math.floor(ordered.length / 2); const expected = ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
      near(captured.median, expected, 'Median Mountain answer'); assert.equal(captured.isEven, ordered.length % 2 === 0);
    }
  }
});

const output = path.join(root, 'qa-artifacts/five-tier-difficulty');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), kind: 'source-only actual-generator property verification', sampleCount,
  browserContextsOpened: false, sourceFiles: [...sourceFiles].sort(), rows, failures: [],
  currentRouteCoverage: routeRenders.map(({ props: _props, ...route }) => route),
}, null, 2));
console.log(`PASS ${rows.length} checks; report qa-artifacts/five-tier-difficulty/report.json`);
