import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

if (process.platform !== 'darwin') {
  console.error('Native simulator compilation requires macOS and Xcode 26+. Continue JavaScript development here; run this command on a Mac runner.');
  process.exit(1);
}
if (Number(process.versions.node.split('.')[0]) < 22) throw Error('Capacitor 8 requires Node 22+.');
const version = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' });
if (version.status !== 0 || Number(version.stdout.match(/Xcode (\d+)/)?.[1] || 0) < 26) throw Error('Select Xcode 26+ with xcode-select before building.');
mkdirSync('qa-artifacts/ios-simulator', { recursive: true });
const args = ['-project', 'native/ios/App/App.xcodeproj', '-scheme', 'App', '-configuration', 'Debug',
  '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator',
  '-derivedDataPath', 'qa-artifacts/ios-simulator/DerivedData', 'CODE_SIGNING_ALLOWED=NO', 'build'];
const result = spawnSync('xcodebuild', args, { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
