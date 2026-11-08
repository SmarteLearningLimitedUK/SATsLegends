import type {SatsMission} from '../content/satsAdventure';
import type {LearningEvidence,LearningState} from './types';
import {ADDITIONAL_SKILLS,AUTHORED_REVISION_FAMILIES} from './authoredSkills';

/** Reviewed family links, deliberately independent of game aliases and broad objective tags. */
export const REVISION_FAMILIES:Record<string,readonly string[]>={
 'number.write-digits':['revision-large-number-words','reading-number'],
 'number-line.whole':['depth-estimate-line'],
 'number-line.negative':['depth-negative-midpoint','negative'],
 'number.rounding':['depth-large-round','round'],
 'number.prime-recognition':['prime'],
 'fractions.add':['ar-fraction-add','ar-unlike-add','ar-mixed'],
 'fractions.subtract':['ar-fraction-sub','ar-unlike-sub'],
 'fractions.multiply':['ar-fraction-times','fraction-whole-mult'],
 'fractions.divide':['ar-fraction-div'],
 'fractions.common-factor':['simplify'],
 'fractions.equivalence-match':['equivalent','decimal-fraction','revision-fraction-equivalent','revision-fraction-shade'],
 'geometry.classify':['shape-classify','shape-name'],
 'geometry.count-properties':['solid'],
 'percentage.quantity':['ar-percentage-ten','ar-percent-quarter','ar-percent-fifteen','percent-back','sale'],
 'area.grid-compound':['compound-area'],
 'perimeter.boundary':['perimeter'],
 'geometry.transform':['reflect','translate'],
 'coordinates.follow-route':['coordinate'],
 'measurement.convert':['convert','imperial','revision-context-round'],
 'statistics.mean':['mean','depth-mean-zero-reason'],
 'statistics.bar-calculation':['bars'],
 'statistics.line-interpretation':['line'],
 'statistics.line-plot':['depth-line-build'],
 'statistics.pictogram':['depth-pictogram','revision-pictogram-build'],
 'factors.classification':['factor','depth-all-factors','factor-multiple'],
 'multiplication.column':['ar-short-mult','ar-long-mult-a','ar-long-mult-b'],
 'calculation.operation-order':['ar-brackets','ar-order','order'],
 'formula.apply-invert':['formula'],
 'division.remainder':['ar-short-div','ar-long-div-a','ar-long-div-b'],
 'division.decimal':['ar-decimal-div','ar-decimal-quotient'],
 'time.clock-setting':['clock','ext-clock-24'],
 'time.calendar-facts':['revision-month-days','revision-year-days'],
 'time.calendar-conversion':['revision-years-months','depth-calendar','time-seconds'],
 'ratio.recipe-construction':['recipe'],
 'ratio.unequal-sharing':['share'],
 'ratio.fraction-of-total':['ratio-fraction'],
 'ratio.scaled-dimensions':['scale','revision-unknown-scale'],
};

/** Existing playable destinations for each skill, including evidence originating in papers. */
export const REVISION_GAMES:Record<string,string>={
 'statistics.pie-interpretation':'data_detective','calculation.multi-step':'maths_vs_zombies','money.change':'change_counter',
 ...Object.fromEntries(["whole","compare","equivalent","fdp","line","reasoning"].map(kind=>[`fractions.visual-${kind}`,"shattered_whole"])),
 'number.write-digits':'place_value_panic','number.prime-recognition':'prime_pop','number.rounding':'rounding_rocket',
 ...Object.fromEntries(['whole','negative','decimal','fraction'].map(kind=>[`number-line.${kind}`,'number_line_ninja'])),
 ...Object.fromEntries(['mental','add','subtract','multiply','divide'].map(kind=>[`calculation.${kind}`,'maths_vs_zombies'])),
 'calculation.divide':'divide_conquer',
 ...Object.fromEntries(['add','subtract','multiply','divide','operation-construction'].map(kind=>[`fractions.${kind}`,'fraction_forge'])),
 'fractions.common-factor':'simplify_sprint','fractions.equivalence-match':'match3_equivalence','fractions.constrained-composition':'take_out_rush',
 'factors.missing':'factor_frenzy','factors.classification':'factor_frenzy','geometry.classify':'polygon_palace','geometry.count-properties':'polygon_palace',
 'percentage.quantity':'percent_power','angle.straight-line':'angle_arena','area.grid-compound':'area_architect','perimeter.boundary':'perimeter_path',
 'geometry.transform':'rotation_relay','coordinates.follow-route':'coordinates_quest','measurement.mass-composition':'conversion_canyon','measurement.convert':'unit_mixer',
 ...Object.fromEntries(['mean','missing','median','mode'].map(kind=>[`statistics.${kind}`,'mean_machine'])),
 'statistics.bar-calculation':'graph_grabber','statistics.pictogram':'graph_grabber','statistics.line-interpretation':'line_graph_lab','statistics.line-plot':'line_graph_lab',
 'multiplication.column':'multiplication_mine','calculation.operation-order':'order_ops_arena','formula.apply-invert':'formula_forge',
 'division.remainder':'remainder_run','division.decimal':'remainder_run','time.clock-setting':'time_keeper_cove',
 ...Object.fromEntries(['facts','conversion','duration','schedule'].map(kind=>[`time.calendar-${kind}`,'calendar_quest'])),
 'algebra.missing-sum':'problem_pyramid','ratio.recipe-construction':'potion_panic','ratio.unequal-sharing':'share_splitter','ratio.fraction-of-total':'ratio_fractions','ratio.scaled-dimensions':'scale_builder',
};

// Move a family to its reviewed subskill before extending the old mappings.
// A mixed whole-number product, for example, is not proper-fraction × fraction.
for(const ids of Object.values(AUTHORED_REVISION_FAMILIES))for(const id of ids){
 for(const skill of Object.keys(REVISION_FAMILIES))REVISION_FAMILIES[skill]=REVISION_FAMILIES[skill].filter(existing=>existing!==id);
}
for(const [skill,ids] of Object.entries(AUTHORED_REVISION_FAMILIES))REVISION_FAMILIES[skill]=[...(REVISION_FAMILIES[skill]??[]),...ids];
for(const [skill,definition] of Object.entries(ADDITIONAL_SKILLS))REVISION_GAMES[skill]=definition.game;

const familySkills=new Map<string,string>();
for(const [skill,ids] of Object.entries(REVISION_FAMILIES))for(const id of ids){
 if(familySkills.has(id))throw new Error(`Ambiguous revision family: ${id}`);
 familySkills.set(id,skill);
}
export function missionSkill(mission:SatsMission):string {
 return familySkills.get(mission.id)??mission.skillId??mission.reference;
}

/** Only authored family identities can disambiguate old objective-only evidence.
 * Unknown/ambiguous history and milestones remain broad; never infer mastery from stars. */
export function canonicalEvidence(event:LearningEvidence):LearningEvidence {
 if(event.skillId==='multiplication.column'&&event.gameKey==='multiplication_mine'&&event.tier===1&&event.context==='adventure')return {...event,skillId:'calculation.multiply',curriculumRefs:['4C6a']};
 if(event.skillId==='data.evidence-match')return {...event,skillId:'statistics.evidence-match'};
 if(!/^[3-6][NCFRAMGPS]\d/.test(event.skillId)&&!familySkills.has(event.familyId))return event;
 const skill=familySkills.get(event.familyId);
 return skill?{...event,skillId:skill}:event;
}
export function migrateLearningSkills(state:LearningState):LearningState {
 if(state.skillSchemaVersion===3)return state;
 return {...state,skillSchemaVersion:3,events:state.events.map(canonicalEvidence)};
}
