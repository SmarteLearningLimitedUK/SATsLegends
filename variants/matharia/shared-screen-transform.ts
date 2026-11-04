type ModulePath=(name:string)=>string;
function replaceRequired(code:string,from:string,to:string,label:string) {
  if(!code.includes(from))throw new Error(`Matharia ${label}: source presentation changed; review adapter.`);
  return code.replace(from,to);
}
/** The original state, scoring, progression and callbacks remain in their source components. */
export function adaptSharedScreen(code:string,file:string,root:string,modulePath:ModulePath):string|null {
  if(file===`${root}/src/components/game-ui/PracticeIntroPopup.tsx`){
    code=code.replace(/\r\n/g,'\n');
    const start=code.indexOf('  const popup = ('),end=code.indexOf('  return typeof document',start);
    if(start<0||end<start)throw new Error('Matharia practice briefing renderer changed.');
    code=code.slice(0,start)+`  const popup = <AnimatePresence>{visible&&<BriefingScene dialogRef={dialogRef} title={title} body={body} briefing={briefing} kind={kind} actionLabel={actionLabel} onAction={commitAction} avatarId={avatarId}/>}</AnimatePresence>;\n`+code.slice(end);
    code=code.replace("  kind?: 'practice' | 'help' | 'mock';","  kind?: 'practice' | 'help' | 'mock'; avatarId?: string;");
    code=code.replace("kind = 'practice' })","kind = 'practice', avatarId })");
    return `import BriefingScene from '${modulePath('shared/BriefingScene')}';\n`+code;
  }
  if(file===`${root}/src/screens/IslandLevels.tsx`){
    code=code.replace(/\r\n/g,'\n');
    code=replaceRequired(code,'  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);','', 'mission board selection owner');
    code=replaceRequired(code,'  useEffect(() => {\n    setExpandedGameId(null);\n  }, [island.id]);','', 'mission board initial expansion');
    const start=code.indexOf('  return (\n    <div\n      className="legend-island-root'),end=code.lastIndexOf('\n};\n\nexport default IslandLevels;');
    if(start<0||end<start)throw new Error('Matharia mission board renderer changed.');
    return `import IslandAdventureBoard from '${modulePath('shared/IslandAdventureBoard')}';\n`+code.slice(0,start)+`  return <IslandAdventureBoard key={island.id} island={island} avatarId={player.avatarId} groups={gameGroups} next={nextPlayableRow} earned={earnedBrainpowerTokens} total={totalBrainpowerTokens} onBack={onBack} onSelectLevel={onSelectLevel} levelLabel={getLevelDisplayLabel} mockKeys={islandMockKeys} wellbeingTitle={wellbeingTitle} wellbeingSubtitle={wellbeingSubtitle} wellbeingType={wellbeingType} onOpenWellbeing={onOpenWellbeing}/>;`+code.slice(end);
  }
  if(file===`${root}/src/components/results/LevelResultsModal.tsx`){
    code=code.replace(/\r\n/g,'\n').replace('label="Stars"','label="Tokens"');
    code=`import {ResultArtwork,AdventurePanelFrame,AdventureControlFrame} from '${modulePath('shared/AdventureArtwork')}';\nimport MatchResultSummary from '${modulePath('shared/MatchResultSummary')}';\nimport RoundResultSummary from '${modulePath('shared/RoundResultSummary')}';\nimport ResultGems from '${modulePath('shared/ResultGems')}';\nimport ResultXpBar from '${modulePath('shared/ResultXpBar')}';\nimport PresenceLayer from '${modulePath('PresenceLayer')}';\nimport {useRef} from 'react';\n`+code;
    code=replaceRequired(code,'{result.subtitle}',"{gameKey==='match3_equivalence'&&isVictory&&!isPractice?<MatchResultSummary score={result.score}/>:isMockAttempt||isPractice?result.subtitle:<RoundResultSummary score={result.score} subtitle={result.subtitle}/>}",'match score and star explanation');
    code=replaceRequired(code,'{result.stars === 3 ? (',"{result.stars === 3&&gameKey!=='match3_equivalence' ? (",'avoid duplicate Match star label');
    code=code.replace('  gameKey?: string;','  gameKey?: string;\n  avatarId?: string;').replace('  gameKey,\n','  gameKey,avatarId,\n');
    const start=code.indexOf('          <div className="pointer-events-none absolute inset-0">'),end=code.indexOf('          <motion.div\n            ref={dialogRef}',start);
    if(start<0||end<start)throw new Error('Matharia result scenery renderer changed.');
    code=code.slice(0,start)+`          <ResultArtwork gameKey={gameKey} avatarId={avatarId} victory={isVictory||isMockAttempt} practice={isPractice} xpGained={result.xpGained}/>\n`+code.slice(end);
    code=replaceRequired(code,'[isOpen, isPractice, reducedMotion, result]','[isOpen,isPractice,reducedMotion,result?.type,result?.title,result?.timeMs,result?.xpGained,result?.stars,result?.previousLevel,result?.newLevel]','stable reward reveal');
    code=replaceRequired(code,'  }, [result]);','  }, [result?.previousLevel,result?.previousXp,result?.xpGained]);','stable XP segments');
    code=replaceRequired(code,'<AnimatedStarDisplay stars={result.stars} play={playStars} />','<ResultGems stars={result.stars} play={playStars}/>','earned gem artwork');
    const statusStart=code.indexOf('                <span className={`level-result-status'),statusEnd=code.indexOf('</span>',statusStart)+7;
    if(statusStart<0||statusEnd<statusStart)throw new Error('Matharia result status renderer changed.');
    const status=code.slice(statusStart,statusEnd);code=code.slice(0,statusStart)+code.slice(statusEnd);
    code=replaceRequired(code,"<div className={gameKey?'level-result-toolbar':undefined}>",'<div className="level-result-toolbar">'+status,'result toolbar hierarchy');
    code=replaceRequired(code,'level-result-overlay fixed','level-result-overlay matharia-result-overlay fixed','result stage');
    code=replaceRequired(code,'  const reducedMotion = useReducedMotion();',`  const reducedMotion = useReducedMotion();
  const actionCommitted=useRef(false);
  useEffect(()=>{actionCommitted.current=false},[isOpen,result]);
  const captureResultAction=(event:React.MouseEvent<HTMLDivElement>)=>{
    if(!(event.target instanceof Element)||!event.target.closest('button'))return;
    if(actionCommitted.current){event.preventDefault();event.stopPropagation()}else actionCommitted.current=true;
  };`,'result action guard');
    code=replaceRequired(code,'        <motion.div\n          initial={{ opacity: 0 }}','        <PresenceLayer\n          onClickCapture={captureResultAction}\n          initial={reducedMotion?false:{ opacity: 0 }}','result presence');
    const close=code.lastIndexOf('</motion.div>');
    if(close<0)throw new Error('Matharia result presence closing tag changed.');
    code=code.slice(0,close)+'</PresenceLayer>'+code.slice(close+'</motion.div>'.length);
    code=replaceRequired(code,'            <div className="level-result-sheen','            <AdventurePanelFrame/>\n            <div className="level-result-sheen','result panel');
    code=code.replace(/(<button\s+[\s\S]*?className="ui-button-(primary|secondary|success)[\s\S]*?>)([\s\S]*?)(<\/button>)/g,(_all,open,kind,content,close)=>`${open}<AdventureControlFrame primary={${kind==='primary'}}/>${content}${close}`);
    code=replaceRequired(code,'              <span aria-hidden="true">×</span>','              <AdventureControlFrame/><span aria-hidden="true">×</span>','result close');
    code=replaceRequired(code,"                <ResultStatTile\n                  label=\"XP Earned\"\n                  value={`+${result.xpGained}`}\n                  tone=\"cyan\"\n                />", '', 'duplicate XP tile');
    code=code.replaceAll('XP Earned','XP Banked').replaceAll('Three-Star Clear','Three tokens earned').replace('<XpBar', '<ResultXpBar finish={{level:result.newLevel,xp:result.currentXp}}');
    return code;
  }
  return null;
}
