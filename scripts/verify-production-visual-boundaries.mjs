import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hashes=JSON.parse(readFileSync('native/production-ui-v2/source-baseline.json')).hashes;
const source=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const check=(path,restored)=>{assert.equal(createHash('sha256').update(restored).digest('hex'),hashes[path],`Unexpected non-presentation edit in ${path}`);console.log('PASS exact pre-rebuild source reconstructed:',path);};
const foods=['burger_meal','ribs_plate','berry_dessert','salad_bowl','rice_bowl','pizza_slice','hotdog_combo','roast_chicken','fries'];
let food=source('src/games/TakeOutRushGame.tsx');
foods.forEach((name,i)=>food=food.replace(`../assets/production-ui-v2/food-${name}.svg`,`../assets/take_out/food/${i+1}.png`));
const takeoutFeedbackStart=food.indexOf('          <div className={`rush-feedback'),takeoutFeedbackEnd=food.indexOf('        <div className="rush-responses"',takeoutFeedbackStart);
const takeoutFeedback=food.slice(takeoutFeedbackStart,takeoutFeedbackEnd);
food=food.slice(0,takeoutFeedbackStart)+food.slice(takeoutFeedbackEnd);
food=food.replace('          <div className="rush-actions">',takeoutFeedback+'          <div className="rush-actions">');
check('src/games/TakeOutRushGame.tsx',food);
check('src/games/visionScene.ts',source('src/games/visionScene.ts').replace("import fantasyRocket from '../assets/production-ui-v2/rocket-fantasy-v2.webp';\n",'').replace("key === 'rocket' ? fantasyRocket : objects[",'objects['));
check('src/games/AngleArenaGame.tsx',source('src/games/AngleArenaGame.tsx').replace("import AngleWorkingDiagram from '../components/game-ui/AngleWorkingDiagram';\n",'').replace(' && !canvas.closest(\'[data-layout-revision="production-v2"]\')','').replace('<AngleWorkingDiagram prompt={activeQuestion?.prompt ?? \'\'} visible={gameState === \'awaitingAnswer\'} />','<div className="min-h-0 flex-1" />'));
check('src/games/PerimeterPathGame.tsx',source('src/games/PerimeterPathGame.tsx').replace('x={label.x-20} y={label.y-6} width="40" height="12"','x={label.x-14} y={label.y-5} width="28" height="10"').replace('y={label.y+3.3}','y={label.y+2.4}').replace('fontSize="10" fontWeight="600">{edge.label}','fontSize="7" fontWeight="800">{edge.label}'));
check('src/components/game-ui/SatsAnswerFields.tsx',source('src/components/game-ui/SatsAnswerFields.tsx').replace(" data-answer-length={value.length>8?'long':'short'}",''));
let order=source('src/games/OrderOpsArenaGame.tsx');
const feedbackStart=order.indexOf('        <AnimatePresence>\n          {feedback && ('),feedbackEnd=order.indexOf('        </AnimatePresence>',feedbackStart)+'        </AnimatePresence>\n'.length;
const feedback=order.slice(feedbackStart,feedbackEnd).replace('order-answer-feedback ','');
order=order.slice(0,feedbackStart)+order.slice(feedbackEnd);
order=order.replace('      </div>\n    </GameUiShell>',feedback+'      </div>\n    </GameUiShell>');
check('src/games/OrderOpsArenaGame.tsx',order);
let app=source('src/App.tsx');
app=app.replace('allowsAdaptiveGameOrientation, ','').replace(/^.*const compactPaperLandscape =.*\n/m,'').replace("compactPaperLandscape ? 'landscape' : ",'').replace("(!allowsAdaptiveGameOrientation(selectedLevel) || compactPaperLandscape) && ",'')
 .replace(/^.*const \[gameplayMenuOpen, setGameplayMenuOpen\].*\n/m,'').replace(/^.*setGameplayMenuOpen\(false\);.*\n/m,'')
 .replaceAll(' || gameplayMenuOpen','').replaceAll('gameplayMenuOpen, ','')
 .replace(/^.*const productionGameplay =.*\n/m,'').replace(/^.*data-layout-revision=\{productionGameplay.*\n/m,'')
 .replaceAll("!isStartScreen && screen !== 'settings'",'!isStartScreen')
 .replace("screen === 'parent_dashboard' || screen === 'settings' ||", "screen === 'parent_dashboard' ||")
 .replace(/^.*production=\{productionGameplay\}.*\n/m,'').replace(/^.*onPauseChange=\{setGameplayMenuOpen\}.*\n/m,'')
 .replace(/root\?\.querySelectorAll\('\[data-game-tip="true"\],[^']*'\)/,'root?.querySelectorAll(\'[data-game-tip="true"]\')');
check('src/App.tsx',app);
