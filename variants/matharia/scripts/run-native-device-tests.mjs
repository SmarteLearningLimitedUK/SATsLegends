import {cpSync, existsSync} from 'node:fs';

const kinds = {reference: 'iPhone', 'ipad-large': 'iPad'};
process.env.MATHARIA_QA_SIMULATOR = kinds[process.env.QA_DEVICE];
process.argv.push('--simulator');

try {
  await import('./run-native-ci.mjs');
} finally {
  const evidence = 'qa-artifacts/ios-matharia/simulator';
  if (existsSync(evidence)) cpSync(evidence, 'qa-artifacts/native-device-qa/simulator', {recursive: true});
}