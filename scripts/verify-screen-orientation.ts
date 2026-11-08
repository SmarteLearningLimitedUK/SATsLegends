import assert from 'node:assert/strict';
import {COMPOSITIONS,compositionFor,rotationRequired,screenOrientationFor} from '../variants/matharia/src/compositions';

for(const screen of ['splash','avatar_selection','world_map','island_levels','profile','shop','settings','parent_dashboard','achievements_tracker','wellbeing_hub','level_result','unknown']){
 assert.equal(screenOrientationFor(screen,'number_line_ninja','peaceful_pond'),'portrait',screen);
 assert.equal(rotationRequired(undefined,screen,844,390),true,screen);
 assert.equal(rotationRequired(undefined,screen,390,844),false,screen);
}
for(const [key,composition] of Object.entries(COMPOSITIONS)){
 assert.equal(screenOrientationFor('gameplay',key),composition.orientation,key);
 assert.equal(rotationRequired(key,'gameplay',844,390),composition.orientation==='portrait',key);
 assert.equal(rotationRequired(key,'gameplay',390,844),composition.orientation==='landscape',key);
}
assert.equal(compositionFor('unknown-game').orientation,'portrait');
assert.equal(screenOrientationFor('gameplay','unknown-game'),'portrait');
assert.equal(screenOrientationFor('wellbeing_activity',undefined,'peaceful_pond'),'landscape');
for(const activity of ['breathing_bloom','candle_calm','constellation_connect','leaf_drift','thought_sort','unknown'])assert.equal(screenOrientationFor('wellbeing_activity',undefined,activity),'portrait');
assert.equal(rotationRequired(undefined,'world_map',0,0),false);
console.log(`PASS portrait defaults, ${Object.keys(COMPOSITIONS).length} explicit game orientations, Calm Grove exceptions and rotation guards`);
