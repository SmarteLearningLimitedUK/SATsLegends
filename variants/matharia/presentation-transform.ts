import path from 'node:path';
import {moveScreenTransition} from './frame-transform';
import {adaptSharedScreen} from './shared-screen-transform';
import {adaptNativeFlow} from './native-flow-transform';

/** Scoped build adapters keep the original app and all game logic unchanged. */
export function adaptPresentation(code:string,id:string,repo:string,variant:string){
 const file=id.split('?')[0].replace(/\\/g,'/'),root=repo.replace(/\\/g,'/');
 const modulePath=(name:string)=>path.join(variant,`src/${name}`).replace(/\\/g,'/');
 code=adaptNativeFlow(code,file,root,modulePath);
 if(file===`${root}/src/app/usePlayerProgression.ts`){
  const storage="export const PLAYER_STORAGE_KEY = 'maths_quest_player_v2';";
  if(!code.includes(storage))throw new Error('Native player storage adapter changed.');
  code=`import {NATIVE_PLAYER_KEY,migrateNativeDeviceSaves} from '${modulePath('app/nativeStorage')}';\n`+code.replace(storage,'migrateNativeDeviceSaves();\nexport const PLAYER_STORAGE_KEY = NATIVE_PLAYER_KEY;');
 }
 if(file===`${root}/src/store/useProgressionStore.ts`){
  const storage="const STORAGE_KEY = 'sats-legends-save';";
  if(!code.includes(storage))throw new Error('Native progression storage adapter changed.');
  code=`import {NATIVE_PROGRESSION_KEY,migrateNativeDeviceSaves} from '${modulePath('app/nativeStorage')}';\n`+code.replace(storage,'migrateNativeDeviceSaves();\nconst STORAGE_KEY = NATIVE_PROGRESSION_KEY;');
 }
 if(file.startsWith(`${root}/src/`)&&/\.tsx?$/.test(file))code=code.replaceAll('Take-Out Rush','Takeout Rush').replaceAll('Fredoka Variable','Matharia Rounded');
 const shared=adaptSharedScreen(code,file,root,modulePath);if(shared!==null)return shared;
 if(file===`${root}/src/components/results/level-results.css`)return '';
 if(file===`${root}/src/components/progression/XpBar.tsx`){
  code=code.replace('const duration = clamp(420 + (delta / segment.requiredXp) * 680, 420, 1100);',"const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:clamp(420 + (delta / segment.requiredXp) * 680, 420, 1100);");
  code=code.replace('const [fillPercent, setFillPercent] = useState(0);','const [fillPercent, setFillPercent] = useState(()=>segments[0]?segments[0].fromXp/segments[0].requiredXp:0);').replace('const [displayLevel, setDisplayLevel] = useState(1);','const [displayLevel, setDisplayLevel] = useState(()=>segments[0]?.level??1);').replace('const [displayXp, setDisplayXp] = useState(0);','const [displayXp, setDisplayXp] = useState(()=>segments[0]?.fromXp??0);');
 }
 if(file===`${root}/src/App.tsx`){
  const marker='  const canonicalGameTitle = getLevelGameTitle(selectedLevel);';
  if(!code.includes(marker))throw new Error('Matharia mission navigation adapter changed; inspect App source.');
  code=`import {useRememberActiveMission} from '${modulePath('shared/missionBoardNavigation')}';\n`+code.replace(marker,`  useRememberActiveMission(screen,selectedIsland?.id,selectedLevel);\n${marker}`)
   .replaceAll('<PracticeIntroPopup','<PracticeIntroPopup avatarId={player.avatarId}').replace('<LevelResultsModal','<LevelResultsModal avatarId={player.avatarId}');
 }
 // Existing game styles stay as defaults; the variant owns the composition.
 if(file===`${root}/src/index.css`)code=code.replace(/url\(['"]?\.\/assets\/reskin\/main_png\/(mission|booster_holder|text_box)\.png['"]?\)/g,'none');
 if(file===`${root}/src/layout/ScreenPrimitives.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const material='backgroundImage: `url(${asset})`';
  if(!code.includes(material))throw new Error('Shared panel material renderer changed.');
  // These old panel images contain a parchment/quill illustration, rather than blank panel material.
  code=code.replace(material,'backgroundImage: asset===GUI_SLICES.buttonPrimary||asset===GUI_SLICES.buttonSecondary?`url(${asset})`:undefined');
  code=`import MathariaControlFrame from '${modulePath('ArtworkFrame')}';\n`+code;
  for(const [kind,frame,color]of [['Primary','buttons/paper_gold_v3','#083b4d'],['Secondary','buttons/scale_key_v4','#fff4d0']]){
   const marker=`style={fillSlice(GUI_SLICES.button${kind})}\n  >\n    {children}`;
   if(!code.includes(marker))throw new Error(`Shared ${kind} control renderer changed.`);
   code=code.replace(marker,`style={{position:'relative',isolation:'isolate',background:'none',border:0,borderRadius:0,boxShadow:'none',fontFamily:'Matharia Rounded, sans-serif',fontWeight:650,lineHeight:1.25,color:'${color}'}}\n  >\n    <MathariaControlFrame name="${frame}" corner={.1} fit="height"/>\n    {children}`);
  }
 }
 if(file===`${root}/src/wellbeing/wellbeing.css`){const start=code.indexOf('/* Ten shuffled pads,');if(start>=0)code=code.slice(0,start);}
 if(file.startsWith(`${root}/src/`)&&file.endsWith('.css'))return code.replace(/#root\b/g,':where(#root)').replace(/!important\b/g,'').replaceAll('Fredoka Variable','Matharia Rounded');
 if(file===`${root}/src/app/testingFlags.ts`)return code.replace('LEVEL_TIMERS_DISABLED = import.meta.env.DEV','LEVEL_TIMERS_DISABLED = false');
 if(file===`${root}/src/wellbeing/activities/PeacefulPond.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const replacePond=(before:string,after:string)=>{if(!code.includes(before))throw new Error('Pond binding changed: '+before);code=code.replace(before,after);};
  replacePond("import { useReducedMotion } from 'motion/react';",`import {usePondReducedMotion as useReducedMotion} from '${modulePath('PondLayout')}';`);
  replacePond('const PAD_COUNT = 10;','const PAD_COUNT = 5;');
  replacePond('  const placePad = (id: number) => {',`  const clampPad = (value:number,axis:'x'|'y') => {
    const rect=pondRef.current?.getBoundingClientRect(),pad=pondRef.current?.querySelector<HTMLElement>('[data-pond-pad]');
    const dimension=rect?(axis==='x'?rect.width:rect.height):0,diameter=pad?(axis==='x'?pad.offsetWidth:pad.offsetHeight):0;
    const inset=dimension?Math.min(49,Math.max(9,(diameter/2+2)/dimension*100)):9;
    return Math.max(inset,Math.min(100-inset,clamp(value)));
  };
  const placePad = (id: number) => {`);
  code=code.replaceAll('clamp(point.x - drag.offsetX)',"clampPad(point.x - drag.offsetX,'x')").replaceAll('clamp(point.y - drag.offsetY)',"clampPad(point.y - drag.offsetY,'y')");
  replacePond('y: 14 + Math.floor(slot / 5) * 24,','y: 25,');
  replacePond('targetY: 62 + Math.floor(id / 5) * 24','targetY: 75');
  replacePond('length: 16','length: 5');
  replacePond('All ten lily pads are home','All five lily pads are home');
  replacePond('`Place lily pad ${completeCount + 1} of 10`','`Pad ${completeCount + 1} of ${PAD_COUNT} · Ready to guide`');
  replacePond('`Notice ${currentPrompt?.sense.toLowerCase()} before placing lily pad ${completeCount + 1}`','`Pad ${completeCount + 1} of ${PAD_COUNT} · Notice ${currentPrompt?.sense.toLowerCase()}`');
  replacePond('progress={completeCount * 10}','progress={completeCount / PAD_COUNT * 100}');
  replacePond('of 10</span>','of {PAD_COUNT}</span>');
  replacePond('data-pond-sense={currentPrompt?.sense.toLowerCase()}>','data-pond-sense={currentPrompt?.sense.toLowerCase()}><PondMaterialFrame name="frames/glacier_panel_v3" corner={.13}/>');
  replacePond('data-pond-target={pad.id + 1}','data-pond-target={pad.id + 1} data-pond-destination={pad.id===completeCount&&!pad.placed}');
  replacePond('data-pond-active={pad.id === completeCount && attentionReady}','data-pond-active={pad.id === completeCount && attentionReady} data-pond-current={pad.id===completeCount}');
  replacePond("{attentionReady ? 'Now guide the pad' : 'I noticed something'}",`<PondMaterialFrame name={attentionReady?'buttons/scale_key_v4':'buttons/paper_gold_v3'} corner={.1} fit="height"/>{attentionReady ? 'Ready to guide' : 'I noticed something'}`);
  replacePond('        </div> : null}\n        <div ref={pondRef}',`        </div> : <div className="pond-attention pond-resting" role="status"><PondMaterialFrame name="frames/glacier_panel_v3" corner={.13}/><strong>All five lily pads are home</strong><p>No rush. One thing at a time.</p></div>}\n        <div ref={pondRef}`);
  replacePond('placePad(pad.id);\n  };','placePad(pad.id);\n    else setPads(current=>current.map(item=>item.id===drag.id?{...item,x:drag.originX,y:drag.originY}:item));\n  };');
  code=`import {asset as pondAsset} from '${modulePath('assets')}';\nimport PondMaterialFrame from '${modulePath('ArtworkFrame')}';\n`+code;
  const start=code.indexOf('<svg viewBox="0 0 48 24">'),end=code.indexOf('</svg>',start);
  if(start<0||end<start)throw new Error('Pond fish renderer changed.');
  code=code.slice(0,start)+`<img className="matharia-pond-fish-art" src={pondAsset('characters','pond_fish_'+['gold','blue','coral','sage'][item.id%4]+'_v3')} alt="" draggable={false}/>`+code.slice(end+6);
 }
 if(file===`${root}/src/wellbeing/scenes.ts`){
  const original="import lanternCamp from '../assets/wellbeing/scenes/lantern-camp.webp';";
  if(!code.includes(original))throw new Error('Lantern Camp scenery binding changed; inspect source.');
  code=code.replace(original,`import lanternCamp from '${modulePath('../assets/png/backgrounds/bg_lantern_camp_v1@2x.webp')}';`);
 }
 if(file===`${root}/src/wellbeing/activities/CandleCalm.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const start=code.indexOf('      <div className="wellbeing-scene" data-camp-packed='),end=code.indexOf('\n    </WellbeingShell>',start);
  if(start<0||end<start)throw new Error('Lantern Camp presentation binding changed; inspect original activity.');
  code=`import LanternCampScene from '${modulePath('LanternCampScene')}';\n`+code.slice(0,start)+`      <LanternCampScene items={campItems} prompts={focusPrompts} packed={packed} brightness={brightness} ready={ready} finished={finished} onPack={packItem} onDim={dimLantern}/>`+code.slice(end);
 }
 if(file===`${root}/src/wellbeing/activities/ThoughtSort.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('      <div className="wellbeing-scene balloon-scene"'),end=code.indexOf('\n    </WellbeingShell>',start);
  if(start<0||end<start)throw new Error('Thought Release presentation binding changed; inspect original activity.');
  code=`import ThoughtRelease from '${modulePath('ThoughtRelease')}';\n`+code.slice(0,start)+`      <ThoughtRelease words={feelingWords} thoughts={balancedThoughts} selected={selected} balanced={balancedThought} finished={finished} onWord={selectWord} onThought={thought=>{setBalancedThought(thought);setMessage(selectedRef.current.length?'Release the balloon when you are ready.':'Choose a feeling to go with your thought.')}} onRelease={releaseBalloon}/>`+code.slice(end);
 }
 if(file===`${root}/src/wellbeing/activities/BreathingBloom.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const start=code.indexOf('        <div className="wellbeing-breath-cue"'),end=code.indexOf('\n      </div>\n    </WellbeingShell>',start);
  const detail=code.slice(start,end).match(/<strong>\{cue\}<\/strong><span>\{([\s\S]*?)\}<\/span>/)?.[1];
  const pace='<strong>{option.label}</strong><span>{option.inMs / 1000}s in · {option.outMs / 1000}s out</span>';
  if(start<0||end<start||!detail||!code.includes(pace))throw new Error('Bloom presentation bindings changed; inspect original activity.');
  code=code.slice(0,start)+`        <BloomControlPanel cue={cue} detail={${detail}} running={running} paused={paused} finished={finished} canFinish={completedCycles>=totalCycles} step={step} onPause={()=>setPaused(value=>!value)} onBegin={startCycle} onFinish={()=>finish(1200)}/>`+code.slice(end);
  code=code.replace(pace,`{paceId===option.id&&<BloomMaterialFrame name="buttons/paper_gold_v3" corner={.1} fit="height"/>}{paceId!==option.id&&<BloomMaterialFrame name="buttons/scale_key_v4" corner={.1} fit="height"/>}${pace}`);
  const gardenStart=code.indexOf('        <div className="wellbeing-bloom-garden"'),gardenEnd=code.indexOf('        <BloomControlPanel',gardenStart);
  if(gardenStart<0||gardenEnd<gardenStart)throw new Error('Bloom garden renderer changed; inspect original activity.');
  code=code.slice(0,gardenStart)+`        <BloomGarden count={Math.min(flowers.length,completedCycles+1)} bloomScale={bloomScale} paused={paused} phase={finished?'complete':step} artwork={bloomArtwork}/>\n`+code.slice(gardenEnd);
  code=`import BloomGarden from '${modulePath('BloomGarden')}';\nimport BloomControlPanel from '${modulePath('BloomControlPanel')}';\nimport BloomMaterialFrame from '${modulePath('ArtworkFrame')}';\n`+code;
 }
 if(file===`${root}/src/wellbeing/WellbeingShell.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('      <div className="wellbeing-landscape"'),end=code.indexOf('      <header className="wellbeing-header">',start);
  if(start<0||end<start)throw new Error('Wellbeing scenery renderer changed.');
  code=`import WellbeingScenery from '${modulePath('WellbeingScenery')}';\nimport WellbeingGuidance from '${modulePath('WellbeingGuidance')}';\nimport BloomMaterialFrame from '${modulePath('ArtworkFrame')}';\n`+code.slice(0,start)+`      <WellbeingScenery activityId={activityId}/>`+code.slice(end);
  code=code.replace('<header className="wellbeing-header">','<header className="wellbeing-header">{(activityId===\'breathing_bloom\'||activityId===\'leaf_drift\'||activityId===\'constellation_connect\')&&<BloomMaterialFrame name="frames/concept_hud_wide_v4" corner={.1} fit="height"/>}');
  code=code.replace('<footer className="wellbeing-footer">','<footer className="wellbeing-footer">{(activityId===\'breathing_bloom\'||activityId===\'peaceful_pond\'||activityId===\'candle_calm\'||activityId===\'leaf_drift\'||activityId===\'constellation_connect\')&&<BloomMaterialFrame name="frames/concept_hud_wide_v4" surface={activityId===\'peaceful_pond\'?\'#073b4a\':undefined} corner={.1} fit="height"/>}');
  code=code.replace('{subtitle ? <p className="wellbeing-how-to"','{subtitle && activityId!=="peaceful_pond" ? <p className="wellbeing-how-to"');
  code=code.replace('      <div className="wellbeing-content">',`      {activityId==='peaceful_pond'&&subtitle&&<aside className="matharia-pond-instructions"><BloomMaterialFrame name="frames/glacier_panel_v3" corner={.13}/><p data-wellbeing-instructions>{subtitle}</p></aside>}\n      <div className="wellbeing-content">`);
  code=code.replace('<WellbeingNotes purpose={purpose} fact={fact} affirmation={affirmation} paused={paused}/>',`<WellbeingGuidance purpose={purpose} fact={fact} affirmation={affirmation} paused={paused} instructions={activityId==='breathing_bloom'||activityId==='thought_sort'||activityId==='candle_calm'?subtitle:undefined}/>`);
  code=`import PondLayout from '${modulePath('PondLayout')}';\n`+code;
  code=code.replace('      <header className="wellbeing-header">',`      <PondLayout active={activityId==='peaceful_pond'}>\n      <header className="wellbeing-header">`).replace('    </section>','      </PondLayout>\n    </section>');
 }
 if(file===`${root}/src/App.tsx`){
  code=code.replace("title={isGameplayScreen ? canonicalGameTitle : 'SATs Legends'}","title={isGameplayScreen ? canonicalGameTitle : screen === 'wellbeing_activity' && wellbeingActivityId === 'breathing_bloom' ? 'Breath Bloom' : screen === 'wellbeing_activity' && wellbeingActivityId === 'peaceful_pond' ? 'Peaceful Pond' : screen === 'wellbeing_activity' && wellbeingActivityId === 'thought_sort' ? 'Thought Release' : screen === 'wellbeing_activity' && wellbeingActivityId === 'candle_calm' ? 'Lantern Camp' : screen === 'wellbeing_activity' && wellbeingActivityId === 'constellation_connect' ? 'Star Path' : screen === 'wellbeing_activity' && wellbeingActivityId === 'leaf_drift' ? 'Leaf Drift' : 'SATs Legends'}");
  code=`import MathariaArtworkFrame from '${modulePath('ArtworkFrame')}';\nimport {UserRound as MathariaMapUser,Trophy as MathariaMapTrophy,ClipboardList as MathariaMapReport} from 'lucide-react';\n`+code;
  code=code.replace('<div className="legend-map-dock">','<div className="legend-map-dock"><span className="legend-map-dock-art" aria-hidden="true"><MathariaArtworkFrame name="frames/concept_hud_wide_v4" corner={.45} horizontalCorner={.14}/></span>');
  for(const [icon,replacement]of [['user','MathariaMapUser'],['trophy','MathariaMapTrophy'],['doc','MathariaMapReport']])code=code.replace(`<AssetIcon name="${icon}" className={mapDockIconClass} />`,`<MathariaArtworkFrame name="buttons/scale_key_v4" corner={.07} fit="height"/><${replacement} className={mapDockIconClass} />`);
  code=code.replace('<TreePine className={mapDockIconClass} />','<MathariaArtworkFrame name="buttons/scale_key_v4" corner={.07} fit="height"/><TreePine className={mapDockIconClass} />');

  const gate="const gameplayRotationRequired = screen === 'gameplay' && viewportSize.width > 0 && viewportSize.width < 700 && viewportSize.height > viewportSize.width;";
  if(!code.includes(gate))throw new Error('Matharia orientation adapter needs review: original gate changed.');
  code=`import {rotationRequired,measuredLayoutFor} from '${path.join(variant,'src/compositions').replace(/\\/g,'/')}';\n`+code.replace(gate,"const gameplayRotationRequired = rotationRequired(selectedLevel?.blueprintKey, screen, viewportSize.width, viewportSize.height) || (screen === 'wellbeing_activity' && wellbeingActivityId === 'peaceful_pond' && viewportSize.height > viewportSize.width);");
  code=code.replace('<GameplayOrientationGate onBack={goToIslandLevels} />',`<GameplayOrientationGate onBack={screen==='wellbeing_activity'?returnFromWellbeing:goToIslandLevels} />`);
  code=code.replace('data-active-game={isGameplayScreen ? selectedLevel?.blueprintKey : undefined}', 'data-active-game={isGameplayScreen ? selectedLevel?.blueprintKey : undefined} data-measured-scene={isGameplayScreen && measuredLayoutFor(selectedLevel?.blueprintKey) ? "true" : undefined}');
  code=code.replace("const useUnboundedStageShell = screen === 'parent_dashboard'", "const useUnboundedStageShell = isGameplayScreen || isIslandLevelsScreen || screen === 'parent_dashboard'");
  code=`import PresentationScreenFrame from '${modulePath('PresentationScreenFrame')}';\n`+moveScreenTransition(code);
 }
 if(file===`${root}/src/games/FractionMatchGame.tsx`){
  const gemStart=code.indexOf('const BevelledGem: React.FC<'),shellStart=code.indexOf('const MatchGameShell: React.FC<'),gameStart=code.indexOf('const FractionMatchGame: React.FC<');
  if(gemStart<0||shellStart<gemStart||gameStart<shellStart)throw new Error('Match presentation adapter needs review: source boundaries changed.');
  code=`import {MatchScene as MatchGameShell,MatchGem as BevelledGem} from '${modulePath('screens/MatchScene')}';\n`+code.slice(0,gemStart)+code.slice(gameStart);
  code=code.replace("import './fraction-match.css';",'');
  // Shared HUD updates recreate the shell callbacks; keep them current without
  // restarting the board's one-second timeout on every shell-clock update.
  code=code.replace('  const finalizeRound = useCallback((finalScore: number) => {', '  const matchVictoryRef = useRef(onVictory);\n  const matchGameOverRef = useRef(onGameOver);\n  matchVictoryRef.current = onVictory;\n  matchGameOverRef.current = onGameOver;\n  const finalizeRound = useCallback((finalScore: number) => {');
  code=code.replace('      onVictory(stars, finalScore);','      matchVictoryRef.current(stars, finalScore);').replace('    onGameOver(finalScore);','    matchGameOverRef.current(finalScore);').replace('[isMatchMastery, onGameOver, onVictory, resolvedLevel, targetScore]', '[isMatchMastery, resolvedLevel, targetScore]');
  // The board and shared session have separate deadlines. Show the earlier
  // active deadline so one timer accurately represents when play can end.
  code=code.replace('      timeLeft={timeLeft}', '      timeLeft={isPractice || import.meta.env.DEV ? timeLeft : Math.min(timeLeft, sessionState?.timeLeft ?? timeLeft)}');
  // Keep the visible goal on the controller's own score/final-challenge state.
  code=code.replace('      completionProgress={completionProgress}', '      completionProgress={isMatchMastery&&resolvedLevel===5?Math.min(completionProgress,successfulSwaps/MIN_COLOURLESS_MATCHES*100):completionProgress} goalLabel={isMatchMastery&&resolvedLevel===5?`${Math.min(successfulSwaps,MIN_COLOURLESS_MATCHES)}/${MIN_COLOURLESS_MATCHES} matches · ${targetScore} pts`:`Goal ${targetScore} pts`}');
  code=code.replace('<BevelledGem type={cell.type} label={cell.label}', '<BevelledGem type={cell.type} label={cell.label} disabled={isProcessing || Boolean(sessionState?.paused)}');
 }
 if(file===`${root}/src/games/PrimePopGame.tsx`){
  code=code.replace(/\r\n/g,'\n');
  code=code.replace("import { GameQuestionCard } from '../components/game-ui/GameUiKit';",`import {PrimeQuestionCard as GameQuestionCard,PrimeOrb,PrimeDangerRail} from '${modulePath('screens/PrimeScene')}';`);
  code=code.replace("import './prime-pop.css';",'').replace(/^import primePop(?:Desktop)?Background from .*;\r?\n/gm,'');
  const bubbleStart=code.indexOf('const PrimeBubble: React.FC<'),gameStart=code.indexOf('const PrimePopGame: React.FC<');
  if(bubbleStart<0||gameStart<bubbleStart)throw new Error('Prime Pop presentation adapter needs review: source boundaries changed.');
  const bubble=code.slice(bubbleStart,gameStart),returnStart=bubble.indexOf('  return (');
  if(returnStart<0)throw new Error('Prime Pop sprite adapter needs review: source renderer changed.');
  code=code.slice(0,bubbleStart)+bubble.slice(0,returnStart)+`  return <PrimeOrb value={bubble.value} tint={bubble.tint} size={size} labelSize={\`${'${labelSize}'}rem\`}/>;\n};\n\n`+code.slice(gameStart);
  code=code.replace(/\s*style=\{\{ '--prime-pop-portrait':[\s\S]*?as React.CSSProperties\}/,'');
  code=code.replace('<div className="relative z-10 flex h-full min-h-0 w-full flex-col pt-[env(safe-area-inset-top)]">','<div data-prime-scene-content className="relative z-10 flex h-full min-h-0 w-full flex-col">');
  code=code.replace('className="relative min-h-0 flex-1 overflow-hidden bg-transparent pt-1"','data-prime-playfield className="relative min-h-0 flex-1 overflow-hidden bg-transparent pt-1"');
  code=code.replace(/<div className="prime-pop-ward-rail">[\s\S]*?<\/div>/,'<PrimeDangerRail/>');
  code=code.replace("import { AnimatePresence, motion }", "import { AnimatePresence, motion, useReducedMotion }");
  code=code.replace('  const config = useMemo', '  const reducedMotion=useReducedMotion();\n  const config = useMemo');
  code=code.replace('animate={screenShake ?', 'animate={!reducedMotion && screenShake ?');
  code=code.replace('initial={{ scale: 0.5, opacity: 0 }}','initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}');
  code=code.replace('                    mistakeBubbleId === bubble.id\n','                    reducedMotion ? {opacity:1} : mistakeBubbleId === bubble.id\n');
  code=code.replace('exit={{ scale: 0.28, opacity: 0, rotate: 30 }}','exit={reducedMotion ? {opacity:0} : { scale: 0.28, opacity: 0, rotate: 30 }}');
  code=code.replace('transition={{ duration: 0.12 }}','transition={{ duration: reducedMotion ? 0 : 0.12 }}');
  code=code.replace('initial={{ opacity: 0, y: 8 }}','initial={reducedMotion ? false : { opacity: 0, y: 8 }}').replace('exit={{ opacity: 0, y: -8 }}','exit={reducedMotion ? {opacity:0} : { opacity: 0, y: -8 }}');
  code=code.replace('aria-label={`Pop number ${bubble.value}`}','aria-label={`Pop number ${bubble.value}`} disabled={Boolean(sessionState?.paused) || mistakeBubbleId === bubble.id}');
  code=code.replaceAll('confetti({','confetti({disableForReducedMotion:true,');
 }
 if(file===`${root}/src/games/FractionForgeGame.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const renderStart=code.indexOf('  return (\n    <div className="fraction-forge-game'),renderEnd=code.lastIndexOf('\n};\n\nexport default FractionForgeGame;');
  if(renderStart<0||renderEnd<renderStart)throw new Error('Fraction Forge presentation adapter needs review: source renderer changed.');
  code=`import ForgeScene from '${modulePath('screens/ForgeScene')}';\n`+code.slice(0,renderStart)+`  return <ForgeScene round={round} tier={tier} roundIndex={roundIndex} totalRounds={totalRounds} score={score} heatPercent={heatPercent} slots={slots} strikeState={strikeState} strikeTick={strikeTick} resolving={resolving} feedback={feedback} completed={completed} heroId={originalHeroId(avatarId)} paused={Boolean(sessionState?.paused)||showPracticeIntro} gameTitle={gameTitle} showPracticeIntro={showPracticeIntro} practiceBriefing={practiceBriefing} onDismissIntro={()=>setShowPracticeIntro(false)} cardAllowedInNextSlot={cardAllowedInNextSlot} onAdd={addIngredient} onRemove={removeIngredient} onClear={()=>{setSlots(Array(round.solutionIds.length).fill(null));setFeedback(null);setStrikeState('idle');}} onStrike={strike}/>;`+code.slice(renderEnd);
  code=code.replace("import './fraction-forge.css';",'');
  const pendingStart=code.indexOf('  const clearPending = useCallback('),pendingEnd=code.indexOf('  const beginRound = useCallback(',pendingStart);
  if(pendingStart<0||pendingEnd<pendingStart)throw new Error('Fraction Forge pause adapter needs review: timer helper changed.');
  code=`import {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,pendingStart)+`  const transitionClock=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro);\n  const clearPending=transitionClock.clear,delay=transitionClock.schedule;\n`+code.slice(pendingEnd);
  code=code.replace("    playGameSound('impact');", "    delay(()=>playGameSound('impact'),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:440);");
 }
 if(file===`${root}/src/games/PlaceValuePanicGame.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const start=code.lastIndexOf('  return (\n    <div\n      className="relative z-20 h-full'),end=code.lastIndexOf('\n};\n\nexport default PlaceValuePanicGame;');
  if(start<0||end<start)throw new Error('Place Value presentation adapter needs review: source render boundary changed.');
  code=`import PlaceValueScene from '${modulePath('screens/PlaceValueScene')}';\n`+code.slice(0,start)+`  return <PlaceValueScene question={question} prompt={questionPrompt} placeNames={PLACE_NAMES} targetSlots={targetSlots} sourceSlots={sourceSlots} drag={dragState} completed={correctAnswers} total={GOBLIN_MAX_HEALTH} health={goblinHealth} effect={goblinEffect} speech={enemySpeech} pulse={slotPulseKey} shake={boardShake} wrong={wrongFlash} resolving={isResolving} paused={Boolean(sessionState?.paused)||showPracticeIntro} canSubmit={canSubmit} feedback={feedback} playfieldRef={playfieldRef} relativePoint={getRelativePoint} onBegin={beginDrag} onMove={moveDrag} onFinish={finishDrag} onCancel={cancelDrag} onTap={tapToken} onSubmit={handleSubmit} showIntro={showPracticeIntro} briefing={practiceBriefing} onDismiss={()=>setShowPracticeIntro(false)}/>;`+code.slice(end);
  code=code.replace("import './place-value-panic.css';",'');
  const pendingStart=code.indexOf('  const clearRoundTimeouts = useCallback('),pendingEnd=code.indexOf('  useEffect(() => clearRoundTimeouts',pendingStart);
  if(pendingStart<0||pendingEnd<pendingStart)throw new Error('Place Value pause adapter needs review: source timer helper changed.');
  code=`import {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,pendingStart)+`  const transitionClock=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro);\n  const clearRoundTimeouts=transitionClock.clear,scheduleRound=transitionClock.schedule;\n`+code.slice(pendingEnd);
 }
 if(file===`${root}/src/games/NumberLineNinjaGame.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const start=code.indexOf('  return (\n    <div\n      ref={playfieldRef}'),end=code.lastIndexOf('\n};\n\nexport default NumberLineNinjaGame;');
  if(start<0||end<start)throw new Error('Number Line presentation adapter needs review: source render boundary changed.');
  code=`import NinjaScene from '${modulePath('screens/NinjaScene')}';\n`+code.slice(0,start)+`  return <NinjaScene question={question} selected={selectedAnswer} feedback={feedbackState} locked={locked} complete={didComplete} failed={didFail} active={isSessionActive} present={isPresent} paused={Boolean(sessionState?.paused)||showPracticeIntro} shake={lineShake} correct={correctCount} goal={goalCorrect} health={monsterRemainingHealth} reaction={monsterReaction} reactionKey={monsterReactionKey} speech={monsterSpeech} playfieldRef={playfieldRef} missingRef={missingSlotRef} optionRefs={optionButtonRefs} flight={flyingAnswer} onLand={markFlightLanded} onAnswer={handleAnswerDrop} showIntro={showPracticeIntro} briefing={practiceBriefing} onDismiss={()=>setShowPracticeIntro(false)}/>;`+code.slice(end);
  code=code.replace("import './number-line-ninja.css';",'');
  const pendingStart=code.indexOf('  const queueTimeout = ('),pendingEnd=code.indexOf('  const clearMonsterReactionTimeout =',pendingStart);
  if(pendingStart<0||pendingEnd<pendingStart)throw new Error('Number Line pause adapter needs review: source queue changed.');
  code=`import {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,pendingStart)+`  const transitionClock=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro);\n  const queueTimeout=(fn:()=>void,delay:number)=>transitionClock.schedule(()=>{if(presentRef.current&&!runEndedRef.current)fn()},delay);\n  const clearQueuedTimeouts=()=>{transitionClock.clear();pendingCorrectAdvanceRef.current=null};\n`+code.slice(pendingEnd);
  code=code.replace('const monsterReactionTimeoutRef = useRef<number | null>(null);','const monsterReactionTimeoutRef = useRef<(() => void) | null>(null);');
  code=code.replace('window.clearTimeout(monsterReactionTimeoutRef.current);','monsterReactionTimeoutRef.current();');
  code=code.replace('monsterReactionTimeoutRef.current = window.setTimeout(', 'monsterReactionTimeoutRef.current = reactionClock.schedule(');
  code=code.replace('  const transitionClock=usePausedTimers', '  const reactionClock=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro);\n  const transitionClock=usePausedTimers');
  code=code.replace('  const isSessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;', '  const isSessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;\n  const observedLiveSession=useRef(false);');
  code=code.replace('    if (isSessionActive) return;', '    if (isSessionActive) {observedLiveSession.current=true;return;}\n    if (!observedLiveSession.current) return;');
 }
 if(file===`${root}/src/games/MathsVsZombiesGame.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const start=code.indexOf('  return (\n    <div\n      className="maths-vs-zombies'),end=code.lastIndexOf('\n};\n\nexport default MathsVsZombiesGame;');
  if(start<0||end<start)throw new Error('Zombies presentation adapter needs review: source renderer changed.');
  code=`import ZombiesScene from '${modulePath('screens/ZombiesScene')}';\n`+code.slice(0,start)+`  return <ZombiesScene question={question} zombies={zombies} tier={tier} score={XP} targetScore={victoryTargetScore} time={timeLeft} timerLabel={timerLabel} stopped={zombiesDefeated} paused={paused} locked={locked} active={gameActive} present={isPresent} practice={isPractice} canSelect={canSelectTarget} selected={selectedTargetId} selectedAnswer={selectedAnswer} casting={isCasting} feedback={feedback} enemyScene={enemyScene} enemySource={zombieEnemy} title={gameTitle} shot={spellShot} spellStyle={spellStyle} fieldRef={playfieldRef} playerRef={playerRef} onAim={id=>{if(!canSelectTarget||paused||locked||!gameActive||zombies.find(z=>z.id===id)?.state==='die')return;selectedTargetRef.current=id;setSelectedTargetId(id)}} onAnswer={handleAnswer} showIntro={showPracticeIntro} briefing={practiceBriefing} onDismiss={()=>setShowPracticeIntro(false)}/>;`+code.slice(end);
  code=code.replace("import './maths-vs-zombies.css';",'');
  code=code.replace("playerRef.current?.querySelector('img')", "playerRef.current?.querySelector('[data-spell-origin]')");
  code=`import {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code;
  code=code.replace('  const pausedRef = useRef(paused);', '  const presentationClock=usePausedTimers(paused);\n  const pausedRef = useRef(paused);');
  for(const name of ['answerTimerRef','spellImpactTimerRef','spellClearTimerRef']){
   code=code.replace(`const ${name} = useRef<number | null>(null);`,`const ${name} = useRef<(() => void) | null>(null);`);
   code=code.replaceAll(`window.clearTimeout(${name}.current)`,`${name}.current()`);
   code=code.replaceAll(`${name}.current = window.setTimeout(`,`${name}.current = presentationClock.schedule(`);
  }
 }
 if(file===`${root}/src/games/TakeOutRushGame.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const start=code.indexOf('  return (\n    <FoodGameShell gameType="take_out_rush"'),end=code.lastIndexOf('\n};\n\nexport default TakeOutRushGame;');
  if(start<0||end<start)throw new Error('Takeout presentation adapter needs review: source renderer changed.');
  code=`import TakeoutScene from '${modulePath('screens/TakeoutScene')}';\n`+code.slice(0,start)+`  return <TakeoutScene target={order.target} total={runningTotal} items={availableItems} tray={trayGroups} format={asDisplayFraction} orderId={order.id} time={timeLeft} served={ordersServed} combo={Combo} pressure={rushPressure} wrong={wrongOrders} score={XP} selected={selectedIds.length} queued={queuedCustomers} elapsed={shiftElapsed} customerLine={customerLine} cast={CUSTOMER_CAST} customerScene={customerScene} over={overTarget} exact={isExact} constraintsMet={constraintsMet} minItems={activeConstraints.minItems} minValues={activeConstraints.minValues} limits={activeConstraints.limits} counts={selectedCounts} submitLabel={submitLabel} trayHint={trayHint} banned={activeConstraints.bannedIds} practice={isPractice} blocked={sharedLivesBlocked} resolving={isResolvingOrder} finished={roundFinished} present={isPresent} canSubmit={canSubmit} paused={Boolean(sessionState?.paused)||scene.paused} preparation={preparation?.sequence??0} cooking={selectedIds.length>0&&!isResolvingOrder} celebration={showCelebrationSplash} feedback={feedback} onAdd={addItem} onRemove={removeSelectedItem} onClear={clearTray} onSubmit={submitOrder}/>;`+code.slice(end);
  code=code.replace("import './takeout-diner.css';",'');
  code=`import {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code;
  code=code.replace('  const sharedLivesBlocked =', '  const presentationClock=usePausedTimers(Boolean(sessionState?.paused)||scene.paused);\n  const sharedLivesBlocked =');
  for(const name of ['feedbackTimeoutRef','unlockTimeoutRef']){
   code=code.replace(`const ${name} = useRef<number | null>(null);`,`const ${name} = useRef<(() => void) | null>(null);`);
   code=code.replaceAll(`window.clearTimeout(${name}.current)`,`${name}.current()`);
   code=code.replaceAll(`${name}.current = window.setTimeout(`,`${name}.current = presentationClock.schedule(`);
  }
 }
 if(file===`${root}/src/games/PercentPowerGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div className="reactor-game pp-game'),end=code.lastIndexOf('\n};\n\nexport default PercentPowerGame;');
  if(start<0||end<start)throw new Error('Percent presentation adapter needs review: source renderer changed.');
  code=`import PercentScene from '${modulePath('screens/PercentScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <PercentScene question={question} tier={resolvedLevel} correct={correctAnswers} total={totalRounds} round={roundNumber} charge={chargePercent} selected={selectedIndex} feedback={feedback} status={statusText} locked={isLocked} ended={didEndRef.current} paused={Boolean(sessionState?.paused)||showPracticeIntro} showIntro={showPracticeIntro} briefing={practiceBriefing} title={gameTitle} onDismiss={()=>setShowPracticeIntro(false)} onAnswer={handleAnswer}/>;`+code.slice(end);
  code=code.replace("import './percent-power.css';",'');
  code=code.replace('  const timersRef = useRef<number[]>([]);', '  const presentationClock=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro);\n  const timersRef=useRef<(() => void)[]>([]);');
  code=code.replace('timersRef.current.forEach(window.clearTimeout)','timersRef.current.forEach(cancel=>cancel())');
  code=code.replaceAll('timersRef.current.push(window.setTimeout(','timersRef.current.push(presentationClock.schedule(');
 }
 if(file===`${root}/src/games/SimplifySprintGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div\n      className="simplify-sprint-game'),end=code.lastIndexOf('\n};\n\nexport default SimplifySprintGame;');
  if(start<0||end<start)throw new Error('Sprint presentation adapter needs review: source renderer changed.');
  code=`import SprintScene from '${modulePath('screens/SprintScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <SprintScene pair={currentPair} gates={gates} phase={phase} lane={selectedLane} target={runnerTarget} round={roundIndex} total={totalRounds} cleared={cleared} combo={combo} score={score} time={timeLeft} tier={tier} practice={Boolean(isPractice)} paused={Boolean(sessionState?.paused)||showPracticeIntro} disabled={locked||showPracticeIntro||gcd(currentPair.numerator,currentPair.denominator)===1||Boolean(sessionState?.paused)} feedback={feedback} arenaRef={arenaRef} runnerRef={runnerRef} showIntro={showPracticeIntro} briefing={practiceBriefing} title={gameTitle} onDismiss={()=>setShowPracticeIntro(false)} onGate={chooseGate}/>;`+code.slice(end);
  code=code.replace("import './simplify-sprint.css';",'');
  code=code.replace("  const heroImage = useTrimmedImageSource(avatar.image);",'');
  const pendingStart=code.indexOf('  const clearPending = useCallback('),pendingEnd=code.indexOf('  useEffect(() => {',pendingStart);
  if(pendingStart<0||pendingEnd<pendingStart)throw new Error('Sprint pause adapter needs review: source queue changed.');
  code=code.slice(0,pendingStart)+`  const presentationClock=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro);\n  const clearPending=presentationClock.clear,delay=presentationClock.schedule;\n\n`+code.slice(pendingEnd);
 }
 if(file===`${root}/src/components/game-ui/useDialogFocus.ts`){
  const marker="      const preferred = dialogRef.current?.querySelector<HTMLElement>('[data-dialog-primary]');";
  if(!code.includes(marker))throw new Error('Dialog focus presentation adapter needs review: source hook changed.');
  code=code.replace(marker,"      // Respect a field selected before the scheduled opening focus runs.\n      if(document.activeElement!==dialogRef.current&&dialogRef.current?.contains(document.activeElement))return;\n"+marker);
 }
 if(file===`${root}/src/components/game-ui/SatsAnswerFields.tsx`){
  code=code.replace(/\r\n/g,'\n').replace("import { useState }", "import { useState,useContext }").replace(" const [active,setActive]", " const paper=useContext(PaperPresentationContext);\n const [active,setActive]").replace('>Answer pad</button>', '>{paper>0&&<ArtworkFrame name="buttons/paper_purple_v3" corner={.16} fit="height"/>}Answer pad</button>');
  code=code.replace('choice?<div className="sats-answer-options">','choice?paper>0?<PaperChoiceField label={field.label} options={getMissionFieldChoices(mission,i)} value={values[i]||""} onChange={value=>onChange(value,i)}/>:<div className="sats-answer-options">');
  code=code.replace('}Answer pad</button>','}<span className="paper-pad-label">Answer pad</span><PaperKeyboard className="paper-pad-icon" aria-hidden="true"/></button>');
  code="import {Keyboard as PaperKeyboard} from 'lucide-react';\n"+code;
  code=`import PaperChoiceField from '${modulePath('screens/PaperChoiceField')}';\nimport {PaperPresentationContext} from '${modulePath('screens/paperContext')}';\nimport ArtworkFrame from '${modulePath('ArtworkFrame')}';\n`+code;
 }
 if(file===`${root}/src/games/ratioFractionsRace/useSideScrollingRace.ts`){
  return code.replace('const offset=1.9+((.5+p.distance)%1.9);','const offset=1+(((p.distance-.5)*.12)%2);').replace('offset/6*100','offset/4*100');
 }
 if(file===`${root}/src/games/ratioFractionsRace/RaceFuelMix.tsx`){
  code=`import {asset} from '${modulePath('assets')}';\nconst raceCanisters=['red','blue','gold','violet'].map(k=>asset('props', 'race_canister_'+k+'_v3'));\n`+code;
  return code.replace('src={canister}','src={raceCanisters[i]??raceCanisters[0]}');
 }
 if(file===`${root}/src/games/RatioRacerGame.tsx`){
  code=code.replace("import './ratioFractionsRace/ratio-racer.css';",'').replace("import './ratioFractionsRace/ratio-racer-restored.css';",'');
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <GameUiShell overlayDisabled className="bg-transparent">'),end=code.lastIndexOf('\n};');
  if(start<0||end<start)throw new Error('Race renderer changed; review presentation adapter.');
  code=`import RaceScene from '${modulePath('screens/RaceScene')}';\n`+code.slice(0,start)+`  return <RaceScene question={question} player={avatarId} rival={avatarId==='bran'?'mochi':'bran'} progress={raceProgress} phase={raceState} countdown={countdown} attempts={attempts} correct={correctCount} selected={selected} locked={locked} paused={Boolean(sessionState?.paused)} present={isPresent} lives={lives} feedback={feedback} world={raceWorld} worldHost={raceWorldHost} sceneRef={raceSceneRef} onAnswer={handleAnswer}/>;`+code.slice(end);
  code=code.replace("import castleBackground from '../assets/ratio-racer/premium/side-scroll-circuit-v2.png';",`import {asset as raceAsset} from '${modulePath('assets')}'; const castleBackground=raceAsset('backgrounds','bg_race_v3');`).replace('const COURSE_TILE_WIDTH = 2;','const COURSE_TILE_WIDTH = 1;').replace('const COURSE_TILES = [0, 1, 2];','const COURSE_TILES = [0, 1, 2, 3];').replace('const COURSE_TILE_OVERLAP = 0.1;','const COURSE_TILE_OVERLAP = 0;').replace('style={{ marginRight:', 'style={{ transform:tile%2?undefined:"scaleX(-1)", marginRight:');
  code=code.replace("if (!canContinueRace() || answerLockedRef.current","if (pausedRef.current || !canContinueRace() || answerLockedRef.current");
  code=`import {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code;
  code=code.replace('  const schedule = (callback: () => void, delay: number) => {', '  const raceTimers=usePausedTimers(Boolean(sessionState?.paused)||!isPresent);\n  const schedule = (callback: () => void, delay: number) => {');
  const timerStart=code.indexOf('    let remaining=delay,previous=performance.now();'),timerEnd=code.indexOf('\n  };',timerStart);
  if(timerStart<0||timerEnd<0)throw new Error('Race feedback scheduler changed.');
  code=code.slice(0,timerStart)+`    raceTimers.schedule(()=>{if(canContinueRace())callback()},delay);`+code.slice(timerEnd);

 }
 if(file===`${root}/src/games/ScaleNumberPad.tsx`){
  code=`import ArtworkFrame from '${modulePath('ArtworkFrame')}';\n`+code;
  return code.replace('<button key={value}', '<button data-button-skin="none" key={value}').replace('>{value}</button>','><ArtworkFrame name="buttons/scale_key_v4" corner={.07} fit="height"/>{value}</button>');
 }
 if(file===`${root}/src/games/ScaleBlueprintBoard.tsx`){
  code=code.replace('shape,baseLength,baseWidth,length,width,unit,showBase,locked,onResize}:Props','shape,baseLength,baseWidth,length,width,unit,showBase,locked,onResize,activeAxis=0}:Props').replace(' shape: \'rect\'', ' activeAxis?:0|1; shape: \'rect\'').replace('([0,1] as const).map(axis=>','([0,1] as const).filter(axis=>Math.hypot(w/2,h/2)>=hitRadius*2.36||axis===activeAxis).map(axis=>');
  code=`import {useBlueprintViewport} from '${modulePath('useBlueprintViewport')}';\n`+code.replace("{useId}","{useId,useLayoutEffect,useRef,useState}");
  code=code.replace(" const id=useId()",` const svgRef=useRef<SVGSVGElement>(null),[hitRadius,setHitRadius]=useState(30);
 useBlueprintViewport(svgRef,[shape,baseLength,baseWidth,length,width,unit,showBase].join(':'));
 useLayoutEffect(()=>{const e=svgRef.current;if(!e)return;const update=()=>{const m=e.getScreenCTM();if(m)setHitRadius(Math.max(14,23/Math.hypot(m.a,m.b)))};update();const ro=new ResizeObserver(update),mo=new MutationObserver(update);ro.observe(e);mo.observe(e,{attributes:true,attributeFilter:['viewBox']});return()=>{ro.disconnect();mo.disconnect()}},[]);
 const id=useId()`);
  code=code.replace('<svg className=', '<svg ref={svgRef} className=').replace('viewBox="0 0 320 320"','viewBox="0 -30 320 320"').replace('<rect x="1" y="1" width="318" height="318" rx="18" fill="#102e49" stroke="#8ccddb" strokeWidth="2"/>','').replace('<circle r="30" fill="transparent"/>','<circle r={hitRadius} fill="transparent"/>');return code;
 }
 if(file===`${root}/src/games/ScaleBuilderGame.tsx`){
  code=code.replace("import './scale-builder.css';",'');
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return <GameUiShell className="scale-numeric-game"'),end=code.lastIndexOf('\n};');
  if(start<0||end<start)throw new Error('Scale renderer changed.');
  const completeStart=code.indexOf("{gameState==='complete'&&<div ref={completionRef}"),completeEnd=code.indexOf('\n  </GameUiShell>',completeStart);const complete=code.slice(completeStart,completeEnd).trim().replace('<Trophy size={48}', '<ArtworkFrame name="frames/potion_panel_v3" corner={.12}/><Trophy size={48}');
  code=`import ArtworkFrame from '${modulePath('ArtworkFrame')}';\nimport ScaleScene from '${modulePath('screens/ScaleScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\nimport {useIsPresent} from 'motion/react';\n`+code.slice(0,start)+`  return <ScaleScene project={currentLevelIdx+1} factor={currentLevel.targetScale} baseLength={baseLength} baseWidth={baseWidth} length={length} width={width} values={values} phase={gameState} mistakes={mistakeCount} paused={Boolean(sessionState?.paused)||!isPresent} showBase={showBase} canCheck={result.complete&&checkedSignature!==signature} feedback={feedback} board={<ScaleBlueprintBoard activeAxis={active} shape={currentLevel.shape.type} baseLength={baseLength} baseWidth={baseWidth} length={length} width={width} unit={unit} showBase={showBase} locked={!playing} onResize={(axis,value)=>{setActive(axis);changeAnswer(axis,formatBlueprintValue(value));}}/>} pad={<ScaleNumberPad values={values} active={active} locked={!playing} onActive={setActive} onChange={changeAnswer} onSubmit={verifyScale}/>} intro={<PracticeIntroPopup open={showPracticeIntro} title="Scale Builder" body={SCALE_BUILDER_INTRO} briefing={practiceBriefing} onAction={()=>setShowPracticeIntro(false)}/>} completion=${complete} onToggleBase={()=>setShowBase(n=>!n)} onClear={resetAnswer} onCheck={verifyScale}/>;`+code.slice(end);
  code=code.replace("  const playing = gameState==='playing' && !sessionState?.paused;","  const isPresent=useIsPresent(),scaleTimers=usePausedTimers(Boolean(sessionState?.paused)||!isPresent);\n  const playing = gameState==='playing' && !sessionState?.paused && isPresent;");
  code=code.replace("if (gameState !== 'success' || sessionState?.paused) return;","if (gameState !== 'success') return;").replace('const timer = window.setTimeout(() => {','const cancel = scaleTimers.schedule(() => {').replace('return () => window.clearTimeout(timer);','return cancel;').replace('[gameState, currentLevelIdx, tierLevels.length, sessionState?.paused]','[gameState, currentLevelIdx, tierLevels.length, scaleTimers]');
 }
 if(file===`${root}/src/games/ShareSplitterGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <GameUiShell'),end=code.lastIndexOf('\n};');
  if(start<0||end<start)throw new Error('Share renderer changed; review presentation adapter.');
  code=`import ShareScene from '${modulePath('screens/ShareScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\nimport {useIsPresent} from 'motion/react';\n`+code.slice(0,start)+`  return <ShareScene id={challenge.id} prompt={promptText} story={challenge.prompt} ratios={challenge.ratios} targets={challenge.targetCounts} plates={plates} remaining={remainingSlices} round={roundSolved} score={xpEarned} attempts={attempts} selected={sourceSelected} hover={hoverPlateIndex} locked={locked} paused={presentationPaused} validation={validationActive} feedback={feedback} tone={feedbackTone} drag={dragSlice} intro={<PracticeIntroPopup open={showPracticeIntro} title="Share Splitter" body="Share the cakes between the guests. Drag a cake to a plate, or choose the tray and then a plate. Match the ratio from left to right." briefing={practiceBriefing} onAction={()=>setShowPracticeIntro(false)}/>} stageRef={stageRef} questionRef={questionCardRef} plateRefs={plateRefs} sourceRef={cakeSourceButtonRef} onSourceDown={handleSourcePointerDown} onSource={selectCakeSource} onPlate={choosePlate} onReset={resetAllocation} onCheck={checkAllocation}/>;`+code.slice(end);
  code=code.replace('  const reducedMotion = useReducedMotion();','  const reducedMotion = useReducedMotion();\n  const isPresent=useIsPresent(),presentationPaused=Boolean(sessionState?.paused)||showPracticeIntro||!isPresent;\n  const shareClock=usePausedTimers(presentationPaused);');
  code=code.replace('useRef<ReturnType<typeof setTimeout> | null>(null)','useRef<(() => void) | null>(null)').replaceAll('clearTimeout(timeoutRef.current)','timeoutRef.current()').replaceAll('setTimeout(', 'shareClock.schedule(');
  code=code.replaceAll('if (locked ||', 'if (presentationPaused || locked ||');
  code=code.replace('  const placeOnPlate =', '  useEffect(()=>{if(presentationPaused){dragCleanupRef.current?.();setDragSlice(null);setHoverPlateIndex(null)}},[presentationPaused]);\n  const placeOnPlate =');
 }
 if(file===`${root}/src/games/PotionPanicGame.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const start=code.indexOf('  return (\n    <GameUiShell className={`potion-panic-scene'),end=code.lastIndexOf('\n};');
  if(start<0||end<start)throw new Error('Potion renderer changed; review presentation adapter.');
  code=`import PotionScene from '${modulePath('screens/PotionScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <PotionScene id={challenge.id} title={challenge.orderTitle} prompt={challenge.orderPrompt} flavor={challenge.orderFlavor} ratio={ratioText} totalDrops={challenge.totalDrops} round={correctSolved} total={roundsToWin} active={activeTargets} lockedIngredients={lockedIngredientIds} reveal={challenge.revealTargets} locked={locked} ended={endedRef.current} paused={Boolean(sessionState?.paused)} feedback={feedback} feedbackText={feedbackMessage} hasBrewed={hasBrewed} mixColor={mixColor} currentTotal={currentTotal} drops={droplets} onAdd={addIngredient} onReset={resetCurrent} onBrew={onBrew}/>;`+code.slice(end);
  code=code.replace('const reducedMotion = useReducedMotion();','const reducedMotion = useReducedMotion();\n  const potionClock=usePausedTimers(Boolean(sessionState?.paused));');
  code=code.replace('useRef<ReturnType<typeof setTimeout> | null>(null)','useRef<(() => void) | null>(null)').replace('clearTimeout(feedbackTimerRef.current)','feedbackTimerRef.current()').replaceAll('setTimeout(', 'potionClock.schedule(');
  code=code.replaceAll('if (locked || endedRef.current', 'if (sessionState?.paused || locked || endedRef.current');
  code=code.replace('  const endedRef = useRef(false);','  const endedRef = useRef(false);\n  const observedLiveSession=useRef(false);').replace('    if (!sessionState || endedRef.current) return;','    if (!sessionState || endedRef.current) return;\n    if(sessionState.timeLeft>0&&sessionState.lives>0){observedLiveSession.current=true;return;}\n    if(!observedLiveSession.current)return;');
 }
 if(file===`${root}/src/games/BossEncounterGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return <div className={`sats-mock'),end=code.lastIndexOf('\n};\nexport default BossEncounterGame;');if(start<0||end<start)throw new Error('SATs paper presentation requires review: original renderer changed.');const introA=code.indexOf('<PracticeIntroPopup',start),introB=code.indexOf('/>',introA)+2,intro=code.slice(introA,introB),reviewA=code.indexOf("{phase === 'review' ? ",introB)+"{phase === 'review' ? ".length,reviewB=code.indexOf(' : <div className="sats-mock-content">',reviewA),review=code.slice(reviewA,reviewB).trim();const modelA=code.indexOf('{isConstructionMission(q.id)',code.indexOf('<div className="sats-model">',start)),modelB=code.indexOf('}</div></div>',modelA)+1,model=code.slice(modelA,modelB),fieldsA=code.indexOf('{isConstructionMission(q.id)',code.indexOf('<form className="sats-response',start)),fieldsB=code.indexOf('<SatsTapWorkpad',fieldsA),fields=code.slice(fieldsA,fieldsB),overlays=code.slice(code.indexOf('      {navOpen ?',fieldsB),code.lastIndexOf('\n    </div>}\n  </div>'));
  code=`import PaperScene from '${modulePath('screens/PaperScene')}';\nimport {useAssessmentDeadline} from '${modulePath('screens/useAssessmentDeadline')}';\n`+code.slice(0,start)+`  return <PaperScene number={paper.number} construction={isConstructionMission(q.id)} denseModel={q.visual.type==="equation"&&(q.visual.lines.length>3||q.visual.lines.some(line=>line.length>36))} modelType={q.visual.type} fieldCount={q.fields.filter((f,i)=>f.response!=="working"&&!(/^ar-long-(mult|div)-/.test(q.id)&&i===0)).length} phase={phase} mission={q.id} index={index} marks={q.marks} total={paper.missions.length} completed={completed} pulse={pulse} prompt={q.prompt} paused={Boolean(sessionState?.paused)||!isPresent} intro={${intro}} review={${review}} model={<>${model}</>} fields={<>${fields}</>} overlays={<>${overlays}</>} notice={notice} work={draftWorkpad} onWork={setDraftWorkpad} onSubmit={submit} onLater={()=>go((index+1)%paper.missions.length)} onNav={()=>{save();setNavOpen(true)}} onFinish={()=>{save();setFinishOpen(true)}}/>;`+code.slice(end);
  code=code.replace('motion, useReducedMotion','motion, useReducedMotion, useIsPresent').replace('gameType, levelId, sessionEvents, onVictory, onGameOver','gameType, levelId, sessionEvents, sessionState, onVictory, onGameOver').replace('  const reduced = useReducedMotion();','  const reduced = useReducedMotion();\n  const isPresent=useIsPresent();\n  const presentationPaused=useAssessmentDeadline(deadline,phase,Boolean(sessionState?.paused)||!isPresent);').replace('    const tick = () => {','    const tick = () => {\n      if(presentationPaused.current)return;').replace('[key, seed, phase, index, answers, workpad, draft, draftWorkpad]','[key, seed, phase, index, answers, workpad, draft, draftWorkpad, sessionState?.paused]').replace('  const update = (value: string, fieldIndex: number) => setDraft(old => { const next = [...old]; next[fieldIndex] = value; return next; });','  const update = (value: string, fieldIndex: number) => {if(presentationPaused.current||!isPresent||phase!=="play")return;setDraft(old => { const next = [...old]; next[fieldIndex] = value; return next; });};');
 }
 if(file===`${root}/src/games/ChangeCounterGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <GameScreenShell className="market-game'),end=code.lastIndexOf('\n};\n\nexport default ChangeCounterGame;');if(start<0||end<start)throw new Error('Change Counter presenter requires review: source renderer changed.');const a=code.indexOf('<PracticeIntroPopup',start),b=code.indexOf('/>',a)+2,intro=code.slice(a,b).replace('title="Monster Market"','title="Change Counter"');
  code=`import ChangeScene from '${modulePath('screens/ChangeScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <ChangeScene question={question} index={roundIndex} total={TOTAL_ROUNDS} lives={lives} score={score} correct={correctCount} coins={coinOptions} selected={selectedCoins} selectedTotal={selectedTotal} canEdit={canEditTill} paused={Boolean(sessionState?.paused)||showPracticeIntro||!isPresent} tone={feedbackTone} feedback={feedbackText} intro={${intro}} money={formatMoney} coinName={coinName} titleCase={titleCase} onAdd={addCoin} onRemove={removeCoin} onUndo={undoCoin} onClear={resetCoins} onSubmit={handOverChange}/>;`+code.slice(end);
  code=code.replace('  const timersRef = useRef(new Set<number>());','  const presentationTimers=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro||!isPresent);\n  const timersRef = useRef(new Set<()=>void>());').replace('window.clearTimeout(timerId)','timerId()').replaceAll('window.setTimeout(', 'presentationTimers.schedule(').replace('isPresent && !locked && !answerLockRef.current','isPresent && !sessionState?.paused && !showPracticeIntro && !locked && !answerLockRef.current').replace('if (!presentRef.current || locked || answerLockRef.current', 'if (!presentRef.current || sessionState?.paused || showPracticeIntro || locked || answerLockRef.current').replace("import './monster-market.css';",'').replace("import './change-counter-shop.css';",'');
 }
 if(file===`${root}/src/games/LavaPathGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <GameScreenShell className="lava-crossing-game'),end=code.lastIndexOf('\n};\nexport default LavaPathGame;');if(start<0||end<start)throw new Error('Lava Path presenter requires review: source renderer changed.');const a=code.indexOf('<PracticeIntroPopup',start),b=code.indexOf('/>',a)+2,intro=code.slice(a,b);
  code=`import LavaScene from '${modulePath('screens/LavaScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <LavaScene question={question} points={DISPLAY_STONES} step={currentStep} total={TOTAL_STEPS} tier={tier} score={score} wrongs={wrongCount} selected={selectedIndex} feedback={feedback} locked={locked} finished={finishedRef.current} paused={Boolean(sessionState?.paused)||showPracticeIntro||!isPresent} intro={${intro}} onAnswer={handleAnswer}/>;`+code.slice(end);
  code=code.replace('  const timersRef = useRef<number[]>([]);','  const presentationTimers=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro||!isPresent);\n  const timersRef = useRef<(()=>void)[]>([]);').replace('timersRef.current.forEach(window.clearTimeout)','timersRef.current.forEach(cancel=>cancel())').replaceAll('window.setTimeout(', 'presentationTimers.schedule(').replace('  const platformArtwork = useTrimmedImageSource(lavaPlatform);','').replace("import './game-refinements.css';",'');
 }
 if(file===`${root}/src/games/ProblemPyramidGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <GameUiShell className="bg-transparent" overlayDisabled>'),end=code.lastIndexOf('\n};\n\nexport default ProblemPyramidGame;');if(start<0||end<start)throw new Error('Problem Pyramid presenter requires review: source renderer changed.');const a=code.indexOf('<PracticeIntroPopup',start),b=code.indexOf('/>',a)+2,intro=code.slice(a,b);
  code=`import PyramidScene from '${modulePath('screens/PyramidScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <PyramidScene round={round} index={roundIndex} correct={correctCount} attempts={attempts} steps={steps} step={stepIndex} completed={completedSteps} selected={selected} locked={locked} glow={glow} feedback={feedback} tone={feedbackTone} paused={Boolean(sessionState?.paused)||showPracticeIntro||!isPresent} intro={${intro}} onAnswer={handleAnswer}/>;`+code.slice(end);
  code=code.replace('multiStep = false','multiStep = true').replace('motion, useReducedMotion','motion, useReducedMotion, useIsPresent').replace('  sessionEvents,\n})','  sessionEvents,\n  sessionState,\n})').replace('  const answerPendingRef = useRef(false);','  const answerPendingRef = useRef(false);\n  const isPresent=useIsPresent();\n  const presentationTimers=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro||!isPresent);').replace('if (locked || answerPendingRef.current) return;', 'if (locked || answerPendingRef.current || sessionState?.paused || showPracticeIntro || !isPresent) return;').replaceAll('window.setTimeout(', 'presentationTimers.schedule(').replace('if(completesRound)confetti({','if(completesRound&&!reducedMotion)confetti({').replace("import './problem-pyramid.css';",'');
 }
 if(file===`${root}/src/games/ChronoDashGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div className="chrono-game'),end=code.lastIndexOf('\n};\nfunction ControlButton');if(start<0||end<start)throw new Error('Chrono Dash presenter requires review: source renderer changed.');const a=code.indexOf('<svg viewBox="0 0 200 200"',start),b=code.indexOf('</svg>',a)+6;if(a<0||b<a)throw new Error('Original live clock SVG changed.');
  const clock=code.slice(a,b).replace('href={chronometerArtwork} x="0" y="3.5"',`href={asset('props','chrono_clock_v4')} x="0.3" y="2.6"`).replace(/<motion\.g data-clock-(hour|minute)-hand animate=\{\{rotate:(rotationHours|rotationMinutes)\}\}[\s\S]*?style=\{\{transformOrigin:'50% 50%',transformBox:'view-box'\}\}>/g,(_match,part,angle)=>`<ChronoHand data-clock-${part}-hand angle={${angle}} paused={Boolean(sessionState?.paused)||!isPresent} reduced={Boolean(reducedMotion)}>`).replaceAll('</motion.g>','</ChronoHand>').replace('const outer = 61;', 'const outer = 62;').replace('index%5 === 0 ? 54 : 58','index%5 === 0 ? 58 : 60').replace('index%5 === 0 ? 2.6 : 1','index%5 === 0 ? 1.6 : 1').replaceAll('Math.sin(angle)*46','Math.sin(angle)*50').replaceAll('Math.cos(angle)*46','Math.cos(angle)*50').replace("variant.face === 'roman' ? 11 : 14","variant.face === 'roman' ? 10.5 : 13").replace('fontWeight="850"','fontWeight="650"').replace('M100 64L104 73V108H96V73Z','M100 69L102.5 75V108H97.5V75Z').replace('M100 44L103 53V112H97V53Z','M100 57L101.8 63V111H98.2V63Z').replace('stroke="#173744" strokeWidth="2"','stroke="#173744" strokeWidth="1.3"').replace('r="7" fill="#183944"','r="6" fill="#183944"');if(clock.includes('<motion.g')||!clock.includes('<ChronoHand'))throw new Error('Clock hand presentation adapter requires review.');
  code=`import ChronoScene from '${modulePath('screens/ChronoScene')}';\nimport ChronoHand from '${modulePath('screens/ChronoHand')}';\nimport {asset} from '${modulePath('assets')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <ChronoScene question={clockQuestion(targetTime,variant.question)} target={targetTime} current={currentTime} clock={${clock}} face={variant.face} format={variant.question} step={minuteStep} tier={tier} feedback={feedback} score={XP} time={timeLeft} correct={correctCountRef.current} disabled={disabled||!isPresent} paused={Boolean(sessionState?.paused)||!isPresent} state={gameState} onAdjust={adjustTime} onRestore={checkTime} onReset={startGame}/>;`+code.slice(end);
  code=code.replace('  const feedbackTimerRef = useRef<number|null>(null);','  const presentationTimers=usePausedTimers(Boolean(sessionState?.paused)||!isPresent);\n  const feedbackTimerRef = useRef<(()=>void)|null>(null);').replace('window.clearTimeout(feedbackTimerRef.current)','feedbackTimerRef.current()').replaceAll('window.setTimeout(', 'presentationTimers.schedule(').replace('window.setInterval(', 'presentationTimers.interval(').replace('return () => window.clearInterval(timerId);','return timerId;').replace("if (!isPresent || gameState !== 'playing' || sessionState?.paused) return undefined;", "if (!isPresent || gameState !== 'playing') return undefined;").replace('[gameState,isPresent,sessionState?.paused]','[gameState,isPresent]').replace("import './game-refinements.css';",'');
 }
 if(file===`${root}/src/games/RemainderRunGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div className="remainder-harbour'),end=code.lastIndexOf('\n};\n\nexport default RemainderRunGame;');if(start<0||end<start)throw new Error('Remainder Run presenter requires review: source renderer changed.');
  code=`import RemainderScene from '${modulePath('screens/RemainderScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <RemainderScene problem={problem} working={working} groups={DIVISION_GROUPS} feedback={feedback} selected={selectedAnswer} time={timeLeft} score={XP} correct={correctCount} solved={solvedCount} tier={baseLevel} locked={isLocked} finished={roundOver} present={isPresent} paused={Boolean(sessionState?.paused)||showPracticeIntro||!isPresent} practice={Boolean(isPractice)} intro={<PracticeIntroPopup open={showPracticeIntro} title="Remainder Run" body="Get the harbour supplies moving! Choose the right shipment. On harder orders, load batches of full boxes, leave fewer crates than one box holds, then send the shipment." briefing={practiceBriefing} onAction={()=>setShowPracticeIntro(false)}/>} onBatch={takeGroups} onReset={()=>setWorking({remaining:problem.dividend,quotient:0,steps:[]})} onAnswer={evaluateAnswer}/>;`+code.slice(end);
  code=code.replace('  const timeoutRefs = useRef<number[]>([]);','  const presentationTimers=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro||!isPresent);\n  const timeoutRefs = useRef<(()=>void)[]>([]);').replace('  const questionStartRef = useRef<number>(Date.now());','  const questionStartRef = useRef<number>(0);').replace('  const answerLockRef = useRef(false);','  if(questionStartRef.current===0)questionStartRef.current=presentationTimers.now();\n  const answerLockRef = useRef(false);').replace('window.clearTimeout(timer)','timer()').replaceAll('window.setTimeout(', 'presentationTimers.schedule(').replace('window.setInterval(', 'presentationTimers.interval(').replace('return () => window.clearInterval(interval);','return interval;').replace('roundOver || isPractice || showPracticeIntro || sessionState?.paused || !isPresent','roundOver || isPractice || showPracticeIntro || !isPresent').replace('[isPractice, isPresent, roundOver, sessionState?.paused, showPracticeIntro]','[isPractice, isPresent, roundOver, showPracticeIntro]').replaceAll('questionStartRef.current = Date.now()','questionStartRef.current = presentationTimers.now()').replace('Date.now() - questionStartRef.current','presentationTimers.now() - questionStartRef.current').replace("import './remainder-run.css';",'');
 }
 if(file===`${root}/src/games/FormulaForgeGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <GameScreenShell\n      className="formula-forge-scene'),end=code.lastIndexOf('\n};\n\nexport default FormulaForgeGame;');if(start<0||end<start)throw new Error('Formula Forge presenter requires review: source renderer changed.');
  code=`import FormulaScene from '${modulePath('screens/FormulaScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <FormulaScene round={round} number={roundNumber} total={totalRounds} prompt={formatFantasyPrompt(buildQuestionStem(round))} diagram={<FormulaShapePanel round={round}/>} feedback={feedback} selected={selectedChoice} score={XP} lives={lives} correct={correctCount} finished={isFinished} present={isPresent} paused={Boolean(_sessionState?.paused||!isPresent||(_sessionState&&(_sessionState.lives<=0||_sessionState.timeLeft<=0)))} onAnswer={handleAnswer}/>;`+code.slice(end);
  code=code.replace('  const timersRef = useRef<number[]>([]);','  const presentationTimers=usePausedTimers(Boolean(_sessionState?.paused)||!isPresent);\n  const timersRef = useRef<(()=>void)[]>([]);').replace('window.clearTimeout(id)','id()').replaceAll('window.setTimeout(', 'presentationTimers.schedule(').replace('if (!presentRef.current || answerLockRef.current || feedback || isFinished) return;', 'if (!presentRef.current || answerLockRef.current || feedback || isFinished || _sessionState?.paused) return;').replace("import './forge-potion-layout.css';",'').replace("import './formula-forge.css';",'');
 }
 if(file===`${root}/src/games/OrderOpsArenaGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <GameUiShell overlayDisabled'),end=code.lastIndexOf('\n};\n\nexport default OrderOpsArenaGame;');if(start<0||end<start)throw new Error('Order Ops Arena presenter requires review: source renderer changed.');
  code=`import OpsScene from '${modulePath('screens/OpsScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <OpsScene expression={displayExpression} tokens={tokens} choices={operationChoices} notice={stepNotice} hint={round.hint} feedback={feedback} round={questionCount} health={enemyHealth} total={maxEnemyHealth} score={XP} combo={Combo} hearts={hearts} finished={isFinished} paused={Boolean(sessionState?.paused)} onChoose={handleAnswer}/>;`+code.slice(end);
  code=code.replace('  const timersRef = useRef<number[]>([]);','  const presentationTimers=usePausedTimers(Boolean(sessionState?.paused));\n  const timersRef = useRef<(()=>void)[]>([]);').replace('window.clearTimeout(timerId)','timerId()').replaceAll('window.setTimeout(', 'presentationTimers.schedule(');
 }
 if(file===`${root}/src/games/MultiplicationMineGame.tsx`){
  code=code.replaceAll("playGameSound('impact');",'/* Pick contact is timed by MineScene. */');
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div className="multiplication-mine mine-academy"'),end=code.lastIndexOf('\n};\n\nexport default MultiplicationMineGame;');if(start<0||end<start)throw new Error('Multiplication Mine presenter requires review: source renderer changed.');
  const introStart=code.indexOf('<PracticeIntroPopup',start),introEnd=code.indexOf('/>',introStart)+2,intro=code.slice(introStart,introEnd);
  code=`import MineScene from '${modulePath('screens/MineScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <MineScene a={question.a} b={question.b} tier={tier} step={columnStep} steps={methodSteps.length} working={<MultiplicationColumns a={question.a} b={question.b} completed={columnStep}/>} choices={displayedOptions} prompt={tier===1?'Choose the product to mine a crystal.':currentStep.prompt} feedback={feedback} defaultFeedback={tier===1?'Four correct products uncover the crystals.':currentStep.kind==='placeholder'?'The zero shifts the tens row left.':currentStep.kind==='sum'?'Add matching place-value columns.':'Write the digit; carry any tens.'} selected={selectedChoice} locked={locked} phase={phase} ended={runEnded} present={isPresent} paused={Boolean(sessionState?.paused||(sessionState&&(sessionState.lives<=0||sessionState.timeLeft<=0)))} correct={correctCount} health={rockHealth} score={scoreRef.current} intro={${intro}} onAnswer={solveColumn}/>;`+code.slice(end);
  code=code.replace('  const timersRef = useRef(new Set<number>());','  const presentationTimers=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro);\n  const timersRef = useRef(new Set<()=>void>());').replace('timersRef.current.forEach((timer) => window.clearTimeout(timer));','timersRef.current.forEach((cancel) => cancel());');
  const timerStart=code.indexOf('  const schedule = (callback: () => void, delay: number) => {'),timerEnd=code.indexOf('\n\n  useLayoutEffect',timerStart);if(timerStart<0||timerEnd<timerStart)throw new Error('Multiplication Mine active-time scheduler changed.');code=code.slice(0,timerStart)+`  const schedule=(callback:()=>void,delay:number)=>{const cancel=presentationTimers.schedule(()=>{timersRef.current.delete(cancel);if(canContinue())callback();},delay);timersRef.current.add(cancel);};`+code.slice(timerEnd);
  code=code.replace('  const sessionRef = useRef(sessionState);','  const sessionRef = useRef(sessionState);\n  const observedLiveSession=useRef(false);').replace('    if (!sessionState || (sessionState.lives > 0 && sessionState.timeLeft > 0)) return;','    if(sessionState&&sessionState.lives>0&&sessionState.timeLeft>0){observedLiveSession.current=true;return;}\n    if(!sessionState||!observedLiveSession.current)return;').replace('      endedRef.current = false;\n      answerLockRef.current = false;','      endedRef.current = false;\n      observedLiveSession.current = false;\n      answerLockRef.current = false;');
  code=code.replace(/  useEffect\(\(\) => \{\n    \/\/ Static states[\s\S]*?  \}, \[\]\);/,'').replace("import './multiplication-mine.css';",'');
 }
 if(file===`${root}/src/games/FactorFrenzyGame.tsx`){
  code=code.replace('      confetti({','      if(finished)confetti({').replace("playGameSound('impact');",'/* Contact is timed to the visible pulse by FactorScene. */');
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div className="factor-frenzy-game'),end=code.lastIndexOf('\n};\n\nexport default FactorFrenzyGame;');if(start<0||end<start)throw new Error('Factor Frenzy presenter requires review: source renderer changed.');
  code=`import FactorScene from '${modulePath('screens/FactorScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <FactorScene problem={problem} status={state.status} score={state.XP} remaining={state.timeLeft} runRemaining={import.meta.env.DEV ? undefined : sessionState?.timeLeft} limit={levelConfig.timeLimit} health={state.enemyHealth} total={ENEMY_MAX_HEALTH} selected={selectedOptions} instruction={instruction} feedback={feedback} hit={showHitFx} paused={paused} onToggle={toggleOption} onSubmit={checkAnswer} onClaim={submitRun} onRestart={()=>{window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));startGame()}}/>;`+code.slice(end);
  code=code.replace('  const paused = Boolean(sessionState?.paused || scene.paused);','  const paused = Boolean(sessionState?.paused || scene.paused);\n  const presentationTimers=usePausedTimers(paused);').replaceAll('useRef<number | null>(null)','useRef<(()=>void) | null>(null)').replace('window.clearInterval(timerRef.current)','timerRef.current()').replace('window.clearTimeout(advanceRef.current)','advanceRef.current()').replace('window.setInterval(() => {','presentationTimers.interval(() => {').replace("if (state.status !== 'playing' || paused) return;","if (state.status !== 'playing') return;").replaceAll('[state.status, paused]);','[state.status]);').replace("if (paused || (state.status !== 'correct' && state.status !== 'incorrect')) return;","if (state.status !== 'correct' && state.status !== 'incorrect') return;").replace('advanceRef.current = window.setTimeout','advanceRef.current = presentationTimers.schedule').replace('const timeout = window.setTimeout(() => setShowHitFx(false), 520);','const timeout = presentationTimers.schedule(() => setShowHitFx(false), 520);').replace('return () => window.clearTimeout(timeout);','return timeout;').replace("import './factor-frenzy.css';",'');
 }
 if(file===`${root}/src/games/DataDetectiveGame.tsx`){
  code=code.replace(/\r\n/g,'\n').replace('  sessionEvents,\n  onVictory,','  sessionEvents,\n  sessionState,\n  onVictory,');
  const start=code.indexOf('  return (\n    <div className="data-detective-game'),end=code.lastIndexOf('\n};\n\nexport default DataDetectiveGame;');if(start<0||end<start)throw new Error('Data Detective presentation adapter needs review: source renderer changed.');
  const introStart=code.indexOf('<PracticeIntroPopup',start),introEnd=code.indexOf('/>',introStart)+2,intro=code.slice(introStart,introEnd);
  code=`import DataScene from '${modulePath('screens/DataScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <DataScene items={currentCase} suspects={suspects} selected={selectedSuspect} phase={gameState} level={level} total={caseLimit} score={XP} lives={lives} mode={caseMode} brief={caseBrief} type={chartType} ticks={barTicks} maximum={barAxisMax} pinned={pinnedEvidence} incorrect={incorrectSuspectIds} caught={gameState==='success'?guiltyId:null} feedback={feedback} paused={Boolean(sessionState?.paused)} intro={${intro}} dossierRef={dossierRef} onInspect={handleSuspectClick} onAccuse={handleAccuse} onClose={()=>setSelectedSuspectId(null)} onNext={nextCase} onPin={name=>setPinnedEvidence(value=>value===name?null:name)}/>;`+code.slice(end);
  code=code.replace(`  useEffect(() => {
    if (selectedSuspectId === null) return;
    const previous = document.activeElement as HTMLElement | null;
    dossierRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, [selectedSuspectId]);`, '');
  code=code.replace('  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(useSharedTopHud));','  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(useSharedTopHud));\n  const presentationTimers=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro);').replace('window.setTimeout(() => onGameOver(XP), 450)','presentationTimers.schedule(() => onGameOver(XP), 450)').replace("import './data-detective.css';",'').replace("import '../components/game-ui/arcade-amendments.css';",'');
 }
 if(file===`${root}/src/games/LineGraphLabGame.tsx`){
  code=code.replace(/\r\n/g,'\n');code=code.replace('  practiceBriefing,\n  sessionEvents,','  practiceBriefing,\n  sessionState,\n  sessionEvents,');const start=code.indexOf('  return (\n    <GameUiShell backgroundImage={lineGraphLabBackground}'),end=code.lastIndexOf('\n};\n\nexport default LineGraphLabGame;');
  if(start<0||end<start)throw new Error('Line graph presentation adapter needs review: source renderer changed.');
  const introStart=code.indexOf('<PracticeIntroPopup',start),introEnd=code.indexOf('/>',introStart)+2,intro=code.slice(introStart,introEnd);
  code=`import LineScene from '${modulePath('screens/LineScene')}';\n`+code.slice(0,start)+`  return <LineScene question={round?.question??'Loading readings…'} helper={round?.helper??''} points={displayedGraph} ticks={yTicks} highlight={round?.highlightIndex} plotIndex={round?.plotIndex} options={round?.options??[]} selected={selectedAnswer} feedback={feedback} phase={gameState} round={level} total={MAX_LEVEL} score={XP} attempts={wrongAttempts} paused={Boolean(sessionState?.paused)} intro={${intro}} onChoose={chooseOption} onSubmit={()=>{if(selectedAnswer!==null)handleAnswer(selectedAnswer)}} onNext={nextLevel}/>;`+code.slice(end);
  code=code.replace("import './line-graph-lab.css';",'');
 }
 if(file===`${root}/src/games/GraphGrabberGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div data-graph-round='),end=code.lastIndexOf('\n};\n\nexport default GraphGrabberGame;');
  if(start<0||end<start)throw new Error('Graph presentation adapter needs review: source renderer changed.');
  const introStart=code.indexOf('<PracticeIntroPopup',start),introEnd=code.indexOf('/>',introStart)+2,intro=code.slice(introStart,introEnd);
  code=`import GraphScene from '${modulePath('screens/GraphScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\nimport {useIsPresent,useReducedMotion} from 'motion/react';\n`+code.slice(0,start)+`  return <GraphScene id={round.id} title={round.title} prompt={round.prompt} support={round.support} caption={round.chartCaption} bars={round.bars} difficulty={levelId} options={round.options} feedback={feedback} locked={isLocked} finished={isFinished} paused={Boolean(sessionState?.paused)||showPracticeIntro||!presentationPresent} score={XP} time={timeLeft} hearts={hearts} round={roundNumber} total={totalRounds} intro={${intro}} onAnswer={handleOptionClick}/>;`+code.slice(end);
  code=code.replace('  const timeoutsRef = useRef<number[]>([]);','  const timeoutsRef = useRef<(() => void)[]>([]);').replace('  const [isLocked, setIsLocked] = useState(false);',`  const [isLocked, setIsLocked] = useState(false);\n  const presentationPresent=useIsPresent(),presentationReduced=useReducedMotion();\n  const presentationClock=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro||!presentationPresent);\n  const timingCallbacks=useRef({onGameOver,XP});timingCallbacks.current={onGameOver,XP};`);
  code=code.replace('timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))','timeoutsRef.current.forEach(cancel=>cancel())').replaceAll('const timeoutId = window.setTimeout(', 'const timeoutId = presentationClock.schedule(').replace('const timerId = window.setInterval(', 'const timerId = presentationClock.interval(').replaceAll('window.clearInterval(timerId)','timerId()');
  const ts=code.indexOf('  useEffect(() => {\n    if (isPractice || isFinished)'),te=code.indexOf('\n  const finishVictory',ts);if(ts<0||te<ts)throw new Error('Graph local-clock adapter needs review.');
  code=code.slice(0,ts)+code.slice(ts,te).replace('onGameOver(XP)','timingCallbacks.current.onGameOver(timingCallbacks.current.XP)').replace('[XP, isFinished, isPractice, onGameOver]','[XP, isFinished, isPractice]')+code.slice(te);
  code=code.replaceAll('    confetti({','    if(!presentationReduced)confetti({').replace("import './graph-grabber.css';",'');
 }
 if(file===`${root}/src/games/MeanMachineGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div className="relative h-full w-full overflow-hidden select-none text-white" data-mean-game'),end=code.lastIndexOf('\n};\n\nexport default MeanMachineGame;');
  if(start<0||end<start)throw new Error('Mean presentation adapter needs review: source renderer changed.');
  const introStart=code.indexOf('<PracticeIntroPopup',start),introEnd=code.indexOf('/>',introStart)+2,intro=code.slice(introStart,introEnd);
  code=`import MeanScene from '${modulePath('screens/MeanScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <MeanScene mode={round?.mode??'mean'} title={modeCopy.title} instruction={modeCopy.prompt} phase={gameState} readings={reelDisplay} active={round?.activeReelIndexes??[]} choices={round?.options??[]} selected={selectedAnswer} feedback={feedback} score={XP} round={level} total={TOTAL_LEVELS} lifeActive={sessionActive} paused={Boolean(sessionState?.paused)} shake={machineShake&&!reducedMotion} jackpot={showJackpot} glitch={showGlitch} intro={${intro}} onScan={handleSpin} onAnswer={handleAnswer}/>;`+code.slice(end);
  code=code.replace('  const timersRef = useRef<number[]>([]);','  const presentationClock=usePausedTimers(Boolean(sessionState?.paused)||showPracticeIntro);\n  const timersRef = useRef<(() => void)[]>([]);').replace('timersRef.current.forEach((id) => window.clearTimeout(id))','timersRef.current.forEach(cancel=>cancel())').replace('const id = window.setTimeout(callback, delay)','const id = presentationClock.schedule(callback, delay)').replace("import './mean-machine.css';",'');
 }
 if(file===`${root}/src/games/ConversionCanyonGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div\n      ref={rootRef}'),end=code.lastIndexOf('\n};\n\nexport default ConversionCanyonGame;');
  if(start<0||end<start)throw new Error('Conversion presentation adapter needs review: source renderer changed.');
  code=`import ConversionScene from '${modulePath('screens/ConversionScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <ConversionScene rootRef={rootRef} dropRef={dropRef} tier={clampStage(levelId)+1} round={roundIndex+1} total={TOTAL_ROUNDS} target={round.targetGrams} targetLabel={toKgLabel(round.targetGrams)} grams={currentGrams} tokens={allTokens} placed={placedIds} groups={[...placedGroups.values()]} score={XP} success={successPulse} broken={broken} feedback={feedback} paused={Boolean(sessionState?.paused)} label={n=>getMeasurementDisplay(n).primary} inside={isInsideDrop} onPlace={placeToken} onRemove={removePlacedToken} onReset={handleResetScale} onSubmit={handleSubmit}/>;`+code.slice(end);
  code=code.replace('  const timerRef = useRef<number | null>(null);','  const presentationClock=usePausedTimers(Boolean(sessionState?.paused));\n  const timerRef = useRef<(() => void) | null>(null);').replaceAll('window.clearTimeout(timerRef.current)','timerRef.current()').replace('timerRef.current = window.setTimeout(', 'timerRef.current = presentationClock.schedule(');
  code=code.replace("import './conversion-canyon.css';",'').replace("import '../components/game-ui/arcade-amendments.css';",'');
 }
 if(file===`${root}/src/games/PerimeterPathGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div className="perimeter-game'),end=code.lastIndexOf('\n};\n\nexport default PerimeterPathGame;');
  if(start<0||end<start)throw new Error('Perimeter presentation adapter needs review: source renderer changed.');
  code=`import PerimeterScene,{PerimeterPlot} from '${modulePath('screens/PerimeterScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <PerimeterScene id={question.id} tier={tier} prompt={stripLegacyWorldPrefix(question.prompt)} hint={question.hint} diagram={<PerimeterPlot shape={question.shape} selectedEdgeIds={selectedEdgeIds} disabled={locked||Boolean(sessionState?.paused)} onSelectEdge={toggleEdge} labelFor={getEdgeLabelPosition}/>} edges={question.shape.edges} checked={selectedEdgeIds} options={question.options} unit={question.answerUnit} selected={selectedOption} feedback={feedback} locked={locked} paused={Boolean(sessionState?.paused)} score={XP} completed={correctCount} total={TARGET_CORRECT} onAnswer={handleAnswer} onToggle={toggleEdge}/>;`+code.slice(end);
  code=code.replace('  const timersRef = useRef<number[]>([]);','  const presentationClock=usePausedTimers(Boolean(sessionState?.paused));\n  const timersRef = useRef<(() => void)[]>([]);').replace('timersRef.current.forEach(window.clearTimeout)', 'timersRef.current.forEach(cancel=>cancel())').replace('timersRef.current.push(window.setTimeout(', 'timersRef.current.push(presentationClock.schedule(');
 }
 if(file===`${root}/src/games/TreasurePathGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <GameScreenShell backgroundImage={coordinateQuestBackground}'),end=code.lastIndexOf('\n};\n\nexport default TreasurePathGame;');
  if(start<0||end<start)throw new Error('Coordinates presentation adapter needs review: source renderer changed.');
  code=`import CoordinatesScene from '${modulePath('screens/CoordinatesScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  if(multiStepRoutes)return <CoordinatesScene id={roundIndex+':'+round.promptText} title={round.promptTitle} prompt={round.promptText} minimum={minimumCoordinate} maximum={maximumCoordinate} start={round.start} selected={selectedTile} diagram={<CoordinateGrid minimum={minimumCoordinate} maximum={maximumCoordinate} start={round.start} selected={selectedTile} feedback={feedback} onSelect={handleTileTap}/>} feedback={feedback} paused={Boolean(sessionState?.paused)} score={XP} round={roundIndex+1} time={timeLeft} onSelect={handleTileTap}/>;\n`+code.slice(start);
  const ts=code.indexOf('  const timersRef = useRef(new Set<number>());'),te=code.indexOf('  useLayoutEffect(() =>',ts);
  const performanceStart=code.indexOf('  const performanceStars =',ts),performanceEnd=code.indexOf('  const clearTimers =',performanceStart);
  if(ts<0||te<ts||performanceStart<ts||performanceEnd<performanceStart)throw new Error('Coordinates queue adapter needs review.');
  const keeper=code.slice(ts,performanceEnd).replace('  const timersRef = useRef(new Set<number>());','  const presentationClock=usePausedTimers(Boolean(sessionState?.paused));');
  code=code.slice(0,ts)+keeper+`  const clearTimers=presentationClock.clear;\n  const queueTimeout=(callback:()=>void,delay:number)=>presentationClock.schedule(()=>{if(presentRef.current&&!endedRef.current)callback()},delay);\n`+code.slice(te);
  code=code.replace('const timer = setInterval(', 'const timer = presentationClock.interval(').replaceAll('clearInterval(timer)','timer()');
  // HUD callback identities change each second; do not restart the local one-second clock.
  code=code.replace('  const targetScore = 950 + levelId * 100;', '  const targetScore = 950 + levelId * 100;\n  const timingCallbacks=useRef({onVictory,onGameOver,sessionEvents});\n  timingCallbacks.current={onVictory,onGameOver,sessionEvents};');
  const cs=code.indexOf('  useEffect(() => {\n    if (isGameOver ||'),ce=code.indexOf('\n  const handleAdvance',cs);
  if(cs<0||ce<cs)throw new Error('Coordinates local clock adapter needs review.');
  const clock=code.slice(cs,ce).replaceAll('onVictory(', 'timingCallbacks.current.onVictory(').replaceAll('onGameOver(', 'timingCallbacks.current.onGameOver(').replaceAll('emitMiniGameSessionEvent(sessionEvents,', 'emitMiniGameSessionEvent(timingCallbacks.current.sessionEvents,').replace('onGameOver, onVictory, sessionEvents, ', '');
  code=code.slice(0,cs)+clock+code.slice(ce);

 }
 if(file===`${root}/src/games/RotationStationGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('    return <div className="rotation-station-game'),end=code.lastIndexOf('\n};\nexport default RotationStationGame;');
  const svgStart=code.indexOf('<svg ref={svgRef}',start),svgEnd=code.indexOf('</svg>',svgStart)+6;
  const controlStart=code.indexOf('<div className="rs-status">',svgEnd),controlEnd=code.indexOf('</section></div></main></div>;',controlStart);
  const promptStart=code.indexOf('<GameQuestionCard title="Transformation Station">',start)+'<GameQuestionCard title="Transformation Station">'.length,promptEnd=code.indexOf('</GameQuestionCard>',promptStart);
  if(start<0||end<start||svgStart<start||svgEnd<svgStart||controlStart<0||controlEnd<controlStart||promptEnd<promptStart)throw new Error('Transformation presentation adapter needs review: source renderer changed.');
  const prompt=code.slice(promptStart,promptEnd),hintStart=prompt.indexOf('<span className="rs-question-hint">'),hintEnd=prompt.lastIndexOf('</span>')+7;if(hintStart<0||hintEnd<hintStart)throw new Error('Transformation hint adapter needs review.');const hint=prompt.slice(hintStart,hintEnd);
  let controls=code.slice(controlStart,controlEnd).replace('<span>{timeLeft}s</span>','');const cs=controls.indexOf('<div className="rs-cursor">'),ce=controls.indexOf('<div className="rs-actions">',cs);
  if(cs<0||ce<cs)throw new Error('Transformation cursor adapter needs review.');const cursor=controls.slice(cs,ce);controls=controls.slice(0,cs)+controls.slice(ce);
  const svg=code.slice(svgStart,svgEnd).replace('<rect width="400" height="400" rx="16" fill="#0a263c"/>','').replace("            if (['ArrowLeft'", "            if(paused)return;\n            if (['ArrowLeft'");
  code=`import TransformationScene from '${modulePath('screens/TransformationScene')}';\n`+code.slice(0,start)+`    return <TransformationScene id={question.id} mode={question.mode} prompt={question.instruction} hint={showHint&&feedback===null?${hint}:null} onCloseHint={()=>setShowHint(false)} diagram={${svg}} controls={<>${controls}</>} cursor={question.mode!=='describe'&&feedback===null?${cursor}:null} selected={LETTERS[selected]} placed={placed.filter(Boolean).length} feedback={feedback} paused={paused} score={results.score} correct={results.correct}/>;`+code.slice(end);
  code=code.replace("import './rotation-station.css';",'');
  code=code.replace('    const reducedMotion = useReducedMotion()', '    const observedLiveSession=useRef(false);\n    const reducedMotion = useReducedMotion()');
  code=code.replace('        if (timeLeft > 0 || ended.current)', '        if(timeLeft>0){observedLiveSession.current=true;return;}\n        if (!observedLiveSession.current || ended.current)');
  code=code.replace('<g key={n}><path', '<g key={n} data-grid-tick={n}><path');
  code=code.replace('<text x="389" y="382">x</text><text x="20" y="23">y</text>', '<text x="380" y={project({x:0,y:0}).y+5}>x</text><text x={project({x:0,y:0}).x-6} y="23">y</text>');
 }
 if(file===`${root}/src/games/AreaArchitectGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return <GameUiShell backgroundImage={areaBackdrop}'),end=code.lastIndexOf('\n};\nexport default AreaArchitectGame;');
  const svgStart=code.indexOf('<svg viewBox=',start),svgEnd=code.indexOf('</svg>',svgStart)+6;
  if(start<0||end<start||svgStart<start||svgEnd<svgStart)throw new Error('Area presentation adapter needs review: source renderer changed.');
  const diagram=code.slice(svgStart,svgEnd).replace('viewBox={`0 0 ${(width+2)*24} ${(height+2)*24}`}','viewBox={`22 22 ${width*24+4} ${height*24+4}`}').replace(/\{rectangle&&<>[\s\S]*?<\/>\}/,'');
  code=`import AreaScene from '${modulePath('screens/AreaScene')}';\n`+code.slice(0,start)+`  return <AreaScene id={question.id} tier={levelId} round={roundIndex+1} total={ROUNDS_TO_WIN} diagram={${diagram}} rectangle={rectangle} shaded={Boolean(question.backgroundCells)} prompt={question.prompt} width={width} height={height} options={options} selected={selected} wrong={wrong} solved={solved} feedback={feedback} paused={Boolean(sessionState?.paused)} showIntro={showIntro} briefing={practiceBriefing} onDismiss={()=>setShowIntro(false)} onAnswer={choose}/>;`+code.slice(end);
  code=code.replace(/import '\.\/area-[^']+\.css';/,'');
 }
 if(file===`${root}/src/games/AngleArenaGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <GameUiShell className="bg-transparent'),end=code.lastIndexOf('\n};\n\nexport default AngleArenaGame;');
  if(start<0||end<start)throw new Error('Angle presentation adapter needs review: source renderer changed.');
  code=`import AngleScene from '${modulePath('screens/AngleScene')}';\nimport {angleArenaLayout,drawAngleProp,drawAngleTower,angleImpactFrame,drawAngleShot,type AngleMaterials} from '${modulePath('screens/angle-artwork')}';\nimport {asset} from '${modulePath('assets')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <AngleScene canvasRef={canvasRef} enemyRef={enemyActorFrameRef} enemy={<MonsterMindActor soundMode="off" src={goblinMonster} alt="Goblin guarding the angle target" reaction={gameState==='levelComplete'?'defeated':enemyReaction} reactionKey={enemyReactionKey}/>} state={gameState} present={isPresent} question={questionIndex} total={questions.length} prompt={activeQuestion?.prompt??'Choose the correct angle for the glowing ball.'} options={activeQuestion?.options??[]} selected={selectedAnswer} feedback={feedback} paused={Boolean(sessionState?.paused)} showAnswers={showPromptAndAnswers} hintOpen={hintOpen} hintText={hintText} known={knownAngle?Number(knownAngle[1]):null} knownRadians={knownRadians} onHint={()=>setHintOpen(open=>!open)} onCloseHint={()=>setHintOpen(false)} onAnswer={handleAnswer} onNext={handleNext} onReset={resetForNext}/>;`+code.slice(end);
  code=code.replace("import './angle-arena.css';",'').replace("import { angleArenaLayout } from './angleArena/layout';",'');
  code=code.replace('  const arenaPlinthRef =','  const angleClock=usePausedTimers(Boolean(sessionState?.paused));\n  const arenaMaterialsRef=useRef<AngleMaterials>({});\n  const arenaPlinthRef =');
  code=code.replace('  const terminalRef = useRef(false);','  const terminalRef = useRef(false);\n  const observedLiveSession=useRef(false);');
  code=code.replace('    if (sessionState.timeLeft <= 0 || sessionState.lives <= 0) {','    if(sessionState.timeLeft>0&&sessionState.lives>0){observedLiveSession.current=true;return;}\n    if(!observedLiveSession.current)return;\n    if (sessionState.timeLeft <= 0 || sessionState.lives <= 0) {');
  for(const name of ['settleTimeoutRef','autoAdvanceTimeoutRef','aimTimeoutRef']){
   code=code.replace(`const ${name} = useRef<number | null>(null);`,`const ${name} = useRef<(() => void) | null>(null);`).replaceAll(`window.clearTimeout(${name}.current)`,`${name}.current()`).replaceAll(`${name}.current = window.setTimeout(`,`${name}.current = angleClock.schedule(`);
  }
  code=code.replace('      const projectile = projectileRef.current;','      const projectile = projectileRef.current;\n      canvas.dataset.arenaProjectile=projectile?JSON.stringify([projectile.x,projectile.y,projectile.active]):\"none\";');
  code=code.replace('      const delta = timestamp - lastFrameRef.current;', '      const delta = document.hidden||canvas.closest(\'[data-stage-paused="true"]\')?0:timestamp-lastFrameRef.current;');
  code=code.replace('hitShakeRef.current = performance.now()','hitShakeRef.current = angleClock.now()').replace('    const draw = (timestamp: number) => {','    const draw = (_frameTimestamp: number) => {\n      const timestamp=angleClock.now();');
  const loadStart=code.indexOf("  useEffect(() => {\n    const load = (key: CannonSpriteKey"),loadEnd=code.indexOf('  const resetForNext =',loadStart);
  if(loadStart<0||loadEnd<loadStart)throw new Error('Angle artwork loader needs review: source boundaries changed.');
  code=code.slice(0,loadStart)+`  useEffect(()=>{const images:HTMLImageElement[]=[];const load=(src:string,ready:(im:HTMLImageElement)=>void)=>{const im=new Image();images.push(im);im.decoding='async';im.onload=()=>ready(im);im.src=src};load(getVisionObject('ice-cannon')!,im=>{cannonSpritesRef.current={right:im,left:im,up:im}});load(getVisionEnvironment('angle_arena')!,im=>{arenaBackdropRef.current=im});load(asset('props','angle_platform_v4'),im=>{arenaPlinthRef.current=im});for(const key of ['beam','post','ice','stone'] as const)load(asset('props','angle_'+key+'_v5'),im=>{arenaMaterialsRef.current[key]=im});return()=>images.forEach(im=>{im.onload=null})},[]);\n\n`+code.slice(loadEnd);
  const ringStart=code.indexOf('      // A quiet targeting ring'),ringEnd=code.indexOf('      const cannonTowerWidth',ringStart);
  if(ringStart<0||ringEnd<ringStart)throw new Error('Angle foreground anchors need review.');code=code.slice(0,ringStart)+code.slice(ringEnd);
  const podiumStart=code.indexOf('      const cannonTowerWidth'),podiumEnd=code.indexOf("      if ((gameState === 'aiming'",podiumStart);
  code=code.slice(0,podiumStart)+`      const cannonTowerHeight=layout.cannonPodiumHeight;\n      drawAngleProp(ctx,arenaPlinthRef.current,-viewWidth*.01,viewHeight*.718,viewWidth*.285,viewHeight*.12);\n\n`+code.slice(podiumEnd);
  code=code.replace('drawCannonSprite(ctx, 35,','drawCannonSprite(ctx, 55,').replace('    drawCannonVector(ctx, angleDeg);','');
  const towerStart=code.indexOf('      const enemyTowerWidth'),towerEnd=code.indexOf('      // One stable DOM actor',towerStart);
  if(towerStart<0||towerEnd<towerStart)throw new Error('Angle opponent anchors need review.');code=code.slice(0,towerStart)+`      const enemyTowerHeight=layout.enemyPodiumHeight;\n      const impactAge=impactResultRef.current==='hit'?Math.max(0,timestamp-(hitShakeRef.current??timestamp)+HIT_SHAKE_DURATION):null;\n      const fall=angleImpactFrame(impactAge,Boolean(reducedMotion),viewWidth,viewHeight);\n      drawAngleProp(ctx,arenaPlinthRef.current,viewWidth*.55,viewHeight*.675,viewWidth*.43,viewHeight*.10);\n      canvas.dataset.angleStructure=JSON.stringify(drawAngleTower(ctx,arenaMaterialsRef.current,viewWidth,viewHeight,impactAge,Boolean(reducedMotion)));\n`+code.slice(towerEnd);
  code=code.replace('const podiumSurface = arenaPlinthRef.current ? enemyTowerHeight * (-.04 + 1.12 * .18) : 0;','const podiumSurface=viewWidth*.20*(18/776)*(1-fall.progress);');
  code=code.replace('`${enemyScreen.x / viewWidth * 100}%`','`${(enemyScreen.x+fall.dx) / viewWidth * 100}%`').replace('enemyScreen.y + podiumSurface + enemySize * .041','enemyScreen.y + podiumSurface + enemySize * .041 + fall.dy');
  code=code.replace("        enemyFrame.style.visibility = 'visible';", "        enemyFrame.style.visibility = 'visible';\n        enemyFrame.style.transformOrigin='50% 94%';enemyFrame.style.rotate=fall.rotation+'deg';enemyFrame.dataset.angleFall=JSON.stringify(fall);");
  code=code.replace('      if (projectile) {\n        projectile.trail.forEach','      if (projectile?.active) {\n        projectile.trail.forEach').replace('drawGlowingBallProjectile(ctx, PROJECTILE_RADIUS + 2, pulse);','drawAngleShot(ctx, PROJECTILE_RADIUS + 2, pulse);');
 }
 if(file===`${root}/src/games/PolygonPalaceGame.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return (\n    <div className="relative z-20 h-full w-full overflow-hidden bg-[#08162c]'),end=code.lastIndexOf('\n};\n\nexport default PolygonPalaceGame;');
  if(start<0||end<start)throw new Error('Polygon presentation adapter needs review: source renderer changed.');
  code=`import PolygonScene,{polygonViewBox} from '${modulePath('screens/PolygonScene')}';\nimport {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,start)+`  return <PolygonScene question={question} diagram={<ShapePreview question={question} pulseTone={pulseTone}/>} selected={selectedChoiceIds} locked={isLocked} over={roundOver} paused={Boolean(sessionState?.paused)} score={XP} correct={correctCount} time={timeLeft} feedback={feedback} onChoice={onChoiceTap} onSubmit={submitProperties}/>;`+code.slice(end);
  code=code.replace("import './polygon-palace.css';",'').replace('  sessionEvents,','  sessionEvents,sessionState,');
  code=code.replace(`viewBox={shape.kind === 'solid' ? \"-72 -66 144 132\" : \"-62 -62 124 124\"}`, 'viewBox={polygonViewBox(shape)}');
  code=code.replace('  const initialRoundSeconds =','  const {schedule:schedulePresentation,now:activeNow}=usePausedTimers(Boolean(sessionState?.paused));\n  const initialRoundSeconds =');
  code=code.replaceAll('Date.now() - questionStartRef.current','activeNow() - questionStartRef.current').replaceAll('questionStartRef.current = Date.now()','questionStartRef.current = activeNow()').replace('questionStartRef = useRef<number>(Date.now())','questionStartRef = useRef<number>(activeNow())');
  code=code.replace('const timeoutsRef = useRef<number[]>([]);','const timeoutsRef = useRef<(() => void)[]>([]);').replace('window.clearTimeout(timer)','timer()').replaceAll('window.setTimeout(','schedulePresentation(');
  const timer="    const interval = window.setInterval(() => {\n      setTimeLeft((previous) => Math.max(0, previous - 1));\n    }, 1000);\n    return () => window.clearInterval(interval);\n  }, [isPractice, roundOver]);";
  if(!code.includes(timer))throw new Error('Polygon presentation clock needs review: source interval changed.');
  code=code.replace(timer,"    let cancel=()=>{};const tick=()=>{cancel=schedulePresentation(()=>{setTimeLeft(previous=>Math.max(0,previous-1));tick()},1000)};tick();\n    return()=>cancel();\n  }, [isPractice, roundOver,schedulePresentation]);");
  code=code.replace('  }, [baseLevel, timeLeft]);','  }, [baseLevel, timeLeft,schedulePresentation,activeNow]);');
  code=code.replace('question, roundOver, Combo, sessionEvents, XP]);','question, roundOver, Combo, sessionEvents, XP,schedulePresentation,activeNow]);');
 }
 if(file===`${root}/src/games/RoundingRocketGame.tsx`){
  code=code.replace(/\r\n/g,'\n');
  const start=code.indexOf('  return <div className="rr-game"'),end=code.lastIndexOf('\n};\nexport default RoundingRocketGame;');
  if(start<0||end<start)throw new Error('Rocket presentation adapter needs review: source render boundary changed.');
  code=`import {RocketGameScene} from '${modulePath('screens/RocketScene')}';\n`+code.slice(0,start)+`  return <RocketGameScene round={round} state={rocketState} selected={selectedPad} feedback={feedbackText} installed={correctAnswers} total={goalCorrect} partNames={ROCKET_PART_NAMES} scene={<RoundingRocketScene installed={correctAnswers} total={goalCorrect} launch={launching} paused={paused} failed={rocketState==='failed'} reacting={rocketState==='arming'||launching} onLaunchComplete={completeRun}/>} launching={launching} disabled={inputLocked||!isSessionActive||didComplete||paused} onAnswer={handlePadTap} showIntro={showPracticeIntro} briefing={practiceBriefing} onDismiss={()=>setShowPracticeIntro(false)}/>;`+code.slice(end);
  const transitionStart=code.indexOf("  useEffect(() => {\n    if (rocketState !== 'arming'"),transitionEnd=code.indexOf('  const completeRun =',transitionStart);
  if(transitionStart<0||transitionEnd<transitionStart)throw new Error('Rocket pause adapter needs review: source feedback clock changed.');
  code=`import {usePausedTimers} from '${modulePath('usePausedTimers')}';\n`+code.slice(0,transitionStart)+`  const feedbackClock=usePausedTimers(paused);\n  useEffect(()=>{if(rocketState!=='arming'&&rocketState!=='failed')return;return feedbackClock.schedule(()=>{if(rocketState==='arming')setRound(generateRound(Math.max(1,levelId),Math.max(1,levelId)));setRocketState('idle');setSelectedPad(null);setFeedbackText(null);locked.current=false;},rocketState==='arming'?CORRECT_RESET_MS:FAILED_RESET_MS);},[rocketState,levelId,feedbackClock]);\n\n`+code.slice(transitionEnd);
 }
 if(file===`${root}/src/games/RoundingRocketScene.tsx`){
  code=code.replace(/\r\n/g,'\n');const start=code.indexOf('  return <div className={`rr-scene'),end=code.lastIndexOf('\n}');
  if(start<0||end<start)throw new Error('Rocket world adapter needs review: source renderer changed.');
  code=`import {RocketWorld} from '${modulePath('screens/RocketScene')}';\n`+code.slice(0,start)+`  return <RocketWorld installed={installed} total={total} phase={phase} countdown={countdown} stopped={stopped} failed={failed} flightMs={flightMs}/>;`+code.slice(end);
  code=code.replace("import './rounding-rocket.css';",'');
 }
 if(file===`${root}/src/app/AppRouter.tsx`){
  const padding=/style=\{\{\s*paddingTop: 'var\(--game-shell-top-inset\)',\s*paddingBottom: 'var\(--game-shell-bottom-inset\)',\s*paddingLeft: '0\.3rem',\s*paddingRight: '0\.3rem',\s*\}\}/;
  if(!padding.test(code))throw new Error('Matharia viewport adapter needs review: source shell changed.');
  code=code.replace(padding,'');
  const ambientStart=code.indexOf('{adaptPortraitGame && selectedLevel && GAME_SCENE_META[selectedLevel.gameType]?.background ? (');
  const contractStart=code.indexOf('<div className="game-shell-contract',ambientStart);
  if(ambientStart<0||contractStart<ambientStart)throw new Error('Matharia scenery adapter needs review: source ambient shell changed.');
  // One clean scenery plate is rendered by App. The old wide-screen ambient
  // image would otherwise paint a second blurred scene over that plate.
  code=code.slice(0,ambientStart)+code.slice(contractStart);
 }
 if(file===`${root}/src/main.tsx`){
  const omit=['./design/legend-theme.css','./design/island-game-theme.css','./games/review-polish.css','./games/presentation-quality.css','./games/qa-readability-fixes.css','./components/game-ui/viewport-question.css'];
  code=code.split('\n').filter(line=>!omit.some(p=>line.includes(`'${p}'`))).join('\n');
 }
 return code;
}
