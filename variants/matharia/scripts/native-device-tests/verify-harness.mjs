import assert from 'node:assert/strict';
import {selectRuntime, deviceTypes, completeTestEvidence} from '../run-native-device-tests.mjs';
const runtimes = [
  {identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-26-1', version: '26.1', isAvailable: true},
  {identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-26-2', version: '26.2', isAvailable: false},
  {identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-10', version: '18.10', isAvailable: true},
  {identifier: 'com.apple.CoreSimulator.SimRuntime.tvOS-27-0', version: '27.0', isAvailable: true},
];
assert.equal(selectRuntime(runtimes).version, '26.1');
assert.equal(selectRuntime(runtimes, '16.4'), null, 'Missing minimum runtime must not silently pass using a newer OS');
assert.equal(selectRuntime(runtimes, '26.2'), null, 'Unavailable runtime must not be selected');
assert.equal(selectRuntime([], 'latest'), null);
assert.equal(selectRuntime(runtimes, '18.10').version, '18.10');
assert.equal(Object.keys(deviceTypes).length, 6);
assert.equal(completeTestEvidence({totalTestCount:0,passedTests:0,failedTests:0,skippedTests:0},3,'smoke'),false);
assert.equal(completeTestEvidence({totalTestCount:6,passedTests:6,failedTests:0,skippedTests:0},3,'smoke'),true);
assert.equal(completeTestEvidence({totalTestCount:6,passedTests:5,failedTests:0,skippedTests:1},3,'smoke'),false);
assert.equal(completeTestEvidence({totalTestCount:82,passedTests:82,failedTests:0,skippedTests:0},73,'games'),true);
console.log('PASS native matrix selection: explicit availability, numeric version ordering, no silent substitutions.');
