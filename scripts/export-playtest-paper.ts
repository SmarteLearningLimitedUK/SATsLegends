import {writeFileSync} from 'node:fs';
import {buildSatsPaper} from '../src/systems/content/satsAdventure';
const [game,seedText,target]=process.argv.slice(2);
if(!['crystal_core','mirror_gate','matrix_match'].includes(game)||!Number.isFinite(Number(seedText))||!target)throw Error('Supply an existing paper key, seed and output path.');
writeFileSync(target,JSON.stringify(buildSatsPaper(game as 'crystal_core'|'mirror_gate'|'matrix_match',Number(seedText)),null,2));
