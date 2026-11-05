import {createHash} from 'node:crypto';
import {createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync, openSync, closeSync, rmSync} from 'node:fs';
import {spawnSync, spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const deviceTypes = {
  compact: 'com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation',
  mini: 'com.apple.CoreSimulator.SimDeviceType.iPhone-13-mini',
  reference: 'com.apple.CoreSimulator.SimDeviceType.iPhone-12',
  large: 'com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max',
  'ipad-mini': 'com.apple.CoreSimulator.SimDeviceType.iPad-mini-A17-Pro',
  'ipad-large': 'com.apple.CoreSimulator.SimDeviceType.iPad-Pro-13-inch-M4-16GB',
};

export function selectRuntime(runtimes, requested = 'latest') {
  const available = runtimes.filter(r => r.isAvailable && r.identifier.includes('.iOS-'));
  if (requested !== 'latest') return available.find(r => r.version === requested) ?? null;
  return available.sort((a, b) => b.version.localeCompare(a.version, undefined, {numeric: true}))[0] ?? null;
}

export function completeTestEvidence(summary, gameCases, scope) {
  const expected = scope === 'rotation' ? 3 : gameCases + 3 + (scope === 'smoke' ? 0 : 6);
  return !!summary && summary.totalTestCount === expected && summary.passedTests === expected &&
    summary.failedTests === 0 && summary.skippedTests === 0;
}

async function hash(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}

async function main() {
  if (process.platform !== 'darwin') throw Error('Native tests require a Mac with Xcode. No simulated success on Windows.');
  const profile = process.env.QA_DEVICE || 'reference';
  if (!deviceTypes[profile]) throw Error('Unknown device profile.');
  const scope = process.env.QA_SCOPE || 'games';
  if (!['smoke', 'games', 'all-tiers', 'rotation'].includes(scope)) throw Error('Unknown test scope.');
  const manifest = JSON.parse(readFileSync(process.env.QA_CANDIDATE_MANIFEST || 'variants/matharia/release/device-qa-candidate.json', 'utf8'));
  const zip = resolve(process.env.CANDIDATE_ZIP || '');
  if (!process.env.CANDIDATE_ZIP || !existsSync(zip)) throw Error('Download the pinned candidate first.');
  const out = resolve(`qa-artifacts/native-device-qa/${profile}`);
  mkdirSync(out, {recursive: true});
  const work = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'matharia-device-qa-'));
  const candidateRoot = join(work, 'candidate');
  mkdirSync(candidateRoot);
  const result = {profile, requestedDeviceType: deviceTypes[profile], requestedRuntime: process.env.QA_IOS || 'latest',
    scope, candidateSha256: manifest.sha256, ciCommit: process.env.GITHUB_SHA, ciRun: process.env.GITHUB_RUN_ID,
    startedAt: new Date().toISOString(), status: 'running', phase: 'candidate-verification', physicalDeviceVerified: false,
    limitations: ['Simulator does not establish hardware performance, haptics, real payment or Apple sign-in correctness.',
      'Screenshots require visual review; this suite does not automatically certify all text contrast or animation frames.',
      scope === 'rotation' ? 'Focused rotation regression only: opening upright, turning back upright during play, background/resume, already-sideways entry and portrait welcome. No game-completion or purchase certification.' : 'Game checks cover launch/help/rotation/background/navigation and available numeric entry, not every winning strategy.']};
  const save = () => writeFileSync(join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  const run = (command, args, {cwd = candidateRoot, log, allowed = false, timeout = scope === 'rotation' ? 900000 : 3600000} = {}) => {
    const fd = log ? openSync(join(out, log), 'w') : null;
    let p;
    try { p = spawnSync(command, args, {cwd, encoding: 'utf8', timeout, killSignal:'SIGKILL', maxBuffer: 64 * 1024 * 1024,
      stdio: fd === null ? 'pipe' : ['ignore', fd, fd]}); }
    finally { if (fd !== null) closeSync(fd); }
    if (p.error || p.status !== 0) {
      if (!allowed) {
        console.error(log ? readFileSync(join(out, log), 'utf8').split('\n').slice(-65).join('\n') : p.stderr?.slice(-5000));
        throw Error(`${command} ${args[0]} failed (${p.status}); see ${log || 'output'}`);
      }
    }
    return {status: p.status, stdout: p.stdout?.trim() || '', stderr: p.stderr || ''};
  };
  let device;
  let video;
  save();
  try {
    if (!/^[a-f0-9]{64}$/.test(manifest.sha256) || manifest.bundleId !== 'com.smartelearning.satslegends' || await hash(zip) !== manifest.sha256) throw Error('Candidate identity/checksum mismatch.');
    run('python3', ['-c', `import sys,zipfile,pathlib,stat
with zipfile.ZipFile(sys.argv[1]) as z:
 for i in z.infolist():
  p=pathlib.PurePosixPath(i.filename)
  assert not p.is_absolute() and '..' not in p.parts and '\\\\' not in i.filename and not stat.S_ISLNK(i.external_attr>>16)
 z.extractall(sys.argv[2])`, zip, candidateRoot]);
    const candidate = JSON.parse(readFileSync(join(candidateRoot, 'MATHARIA-CANDIDATE.json'), 'utf8'));
    if (candidate.sourceGitHead !== manifest.sourceGitHead || candidate.minimumIOS !== '16.4' || candidate.bundleId !== manifest.bundleId) throw Error('Candidate provenance mismatch.');
    const native = join(candidateRoot, 'variants/matharia/native/ios/App');
    const project = join(native, 'App.xcodeproj/project.pbxproj');
    if (await hash(project) !== candidate.nativeProjectSha256) throw Error('Native project checksum mismatch.');
    const publicRoot = join(native, 'App/public');
    if (Object.keys(candidate.webFiles).length < 500) throw Error('Incomplete candidate.');
    for (const [relative, expected] of Object.entries(candidate.webFiles)) {
      const file = resolve(publicRoot, relative);
      if (!file.startsWith(publicRoot + '/') || await hash(file) !== expected) throw Error(`Web checksum mismatch: ${relative}`);
    }
    result.verifiedWebFiles = Object.keys(candidate.webFiles).length;
    result.phase = 'simulator-discovery';
    result.xcode = run('xcodebuild', ['-version']).stdout;
    const inventory = {
      runtimes: JSON.parse(run('xcrun', ['simctl', 'list', 'runtimes', '--json']).stdout).runtimes,
      deviceTypes: JSON.parse(run('xcrun', ['simctl', 'list', 'devicetypes', '--json']).stdout).devicetypes,
    };
    writeFileSync(join(out, 'simulator-inventory.json'), JSON.stringify(inventory, null, 2));
    result.minimumIOS164RuntimeAvailable = !!selectRuntime(inventory.runtimes, '16.4');
    const runtime = selectRuntime(inventory.runtimes, result.requestedRuntime);
    const type = inventory.deviceTypes.find(t => t.identifier === deviceTypes[profile]);
    if (!runtime || !type) {
      result.status = 'unavailable';
      result.reason = !runtime ? 'Requested iOS runtime is not installed; no substitute counted as passed.' : 'Requested device type is unavailable; no substitute counted as passed.';
      save();
      throw Error(result.reason);
    }
    result.runtime = runtime;
    result.device = type;
    result.phase = 'test-project-preparation';
    const prepare = fileURLToPath(new URL('./native-device-tests/prepare-project.py', import.meta.url));
    run('python3', [prepare, candidateRoot, '--scope', scope]);
    const cases = JSON.parse(readFileSync(join(candidateRoot, 'selected-native-cases.json'), 'utf8'));
    writeFileSync(join(out, 'selected-cases.json'), JSON.stringify(cases, null, 2));
    result.plannedGameCases = cases.length;
    run('plutil', ['-lint', project]);
    device = run('xcrun', ['simctl', 'create', `Matharia QA ${profile}`, type.identifier, runtime.identifier]).stdout;
    result.simulatorUDID = device;
    const derived = join(work, 'DerivedData');
    const common = ['-project', join(native, 'App.xcodeproj'), '-scheme', 'MathariaDeviceQA', '-configuration', 'Debug',
      '-destination', `platform=iOS Simulator,id=${device}`, '-derivedDataPath', derived,
      'CODE_SIGNING_ALLOWED=YES', 'CODE_SIGNING_REQUIRED=YES', 'CODE_SIGN_IDENTITY=-',
      'CODE_SIGN_STYLE=Manual', 'DEVELOPMENT_TEAM='];
    result.phase = 'native-compilation';
    run('xcodebuild', [...common, 'build-for-testing'], {log: 'build.log'});
    result.compiled = true;
    const app = join(derived, 'Build/Products/Debug-iphonesimulator/App.app');
    run('codesign', ['--verify', '--deep', '--strict', app]);
    const signature = run('codesign', ['-d', '--verbose=4', app]);
    if (!signature.stderr.includes('Signature=adhoc')) throw Error('Simulator app must have an ad-hoc signature; no developer credential is used.');
    result.simulatorAdHocSignatureVerified = true;
    result.phase = 'simulator-boot';
    save();
    run('xcrun', ['simctl', 'boot', device]);
    run('xcrun', ['simctl', 'bootstatus', device, '-b']);
    const xcresult = join(out, 'DeviceTests.xcresult');
    result.phase = 'native-ui-tests';
    if (scope === 'smoke' && process.env.QA_RECORD_VIDEO === '1') {
      video = spawn('xcrun', ['simctl', 'io', device, 'recordVideo', '--codec=h264', join(out, 'native-smoke.mp4')], {stdio: 'ignore'});
      video.on('error', error => {result.videoError = error.message;});
    }
    const execution = run('xcodebuild', [...common, '-resultBundlePath', xcresult, '-parallel-testing-enabled', 'NO',
      '-maximum-concurrent-test-simulator-destinations', '1', 'test-without-building'], {log: 'tests.log', allowed: true, timeout: scope === 'rotation' ? 600000 : 6300000});
    result.testExitCode = execution.status;
    if (existsSync(xcresult)) {
      const summary = run('xcrun', ['xcresulttool', 'get', 'test-results', 'summary', '--path', xcresult], {allowed: true});
      if (summary.status === 0) {writeFileSync(join(out, 'test-summary.json'), summary.stdout); result.tests = JSON.parse(summary.stdout);}
      run('xcrun', ['xcresulttool', 'export', 'attachments', '--path', xcresult, '--output-path', join(out, 'screenshots')], {allowed: true});
    }
    run('xcrun', ['simctl', 'spawn', device, 'log', 'show', '--last', '15m', '--style', 'compact', '--predicate', 'process == "App" AND (eventMessage CONTAINS "Matharia access" OR messageType == error)'], {log: 'app-system.log', allowed: true});
    result.expectedTests = scope === 'rotation' ? 3 : cases.length + 3 + (scope === 'smoke' ? 0 : 6);
    const complete = completeTestEvidence(result.tests, cases.length, scope);
    result.status = execution.status === 0 && complete ? 'passed' : 'failed';
    result.nativeUIFlowChecksPassed = result.status === 'passed';
    if (result.status !== 'passed') throw Error('Native XCTest checks failed or required test evidence is incomplete; inspect xcresult and screenshots.');
  } catch (error) {
    if (result.status !== 'unavailable') result.status = 'failed';
    result.error = error.message;
    process.exitCode = 1;
  } finally {
    if (video && video.exitCode === null) {
      const closed = new Promise(resolve => video.once('close', resolve));
      video.kill('SIGINT');
      await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 5000))]);
      result.videoCaptured = existsSync(join(out, 'native-smoke.mp4'));
    }
    if (device) {
      save();
      run('xcrun', ['simctl', 'shutdown', device], {allowed: true, timeout:45000});
      run('xcrun', ['simctl', 'delete', device], {allowed: true, timeout:45000});
    }
    result.finishedAt = new Date().toISOString();
    save();
    console.log(JSON.stringify(result, null, 2));
    rmSync(work, {recursive: true, force: true});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
