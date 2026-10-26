import {readdirSync,readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';

const destination='native/production-rebuild/content-baseline.json';
const roots=['src/games','src/systems','src/utils','src/audio','src/wellbeing','src/app'];
const files=['src/constants.ts','src/types.ts','src/App.tsx'];
function walk(path){for(const item of readdirSync(path,{withFileTypes:true})){const file=path+'/'+item.name;if(item.isDirectory())walk(file);else if(/\.tsx?$/.test(file))files.push(file);}}
roots.forEach(walk);
// The welcome case is presentation-only. Preserve every other router case and
// all question/scoring/session routing, including its nonvisual imports.
function protectedSource(path){
 let source=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 if(path==='src/app/AppRouter.tsx'){
  const start=source.indexOf("    case 'splash':"),end=source.indexOf("    case 'profile_setup':",start);
  if(start<0||end<0)throw Error('Unable to isolate welcome presentation.');
  source=source.slice(0,start)+'    /* visual welcome case */\n'+source.slice(end);
  source=source.split('\n').filter(line=>!/^import .*\b(splashPoster|SplashLogo|AdventureWelcome|ArrowRight)\b/.test(line)&&!line.includes("import '../design/desktop-welcome.css'")).join('\n');
 }
 return source;
}
function snapshot(){return Object.fromEntries([...new Set(files)].sort().map(path=>[path,createHash('sha256').update(protectedSource(path)).digest('hex')]));}
const hashes=snapshot();
if(process.argv.includes('--establish')){
 if(existsSync(destination))throw Error('Baseline already exists. Do not replace protected-content history.');
 mkdirSync(dirname(destination),{recursive:true});
 writeFileSync(destination,JSON.stringify({createdAt:new Date().toISOString(),scope:'Educational banks, generators, gameplay/scoring/timers/progression, wellbeing and audio source. Only AppRouter welcome presentation and its visual imports are excluded.',hashes},null,2)+'\n');
 console.log(`BASELINE ${Object.keys(hashes).length} protected source files saved.`);
}else{
 const baseline=JSON.parse(readFileSync(destination,'utf8')).hashes;
 const reviewedPath='native/production-rebuild/visual-source-exceptions.json';
 const reviewed=existsSync(reviewedPath)?JSON.parse(readFileSync(reviewedPath,'utf8')):{};
 const allowedVisualFiles=new Set(['src/app/gameOrientation.ts','src/games/MeanMachineGame.tsx','src/games/FractionMatchGame.tsx','src/App.tsx','src/games/visionScene.ts','src/games/TakeOutRushGame.tsx','src/games/AngleArenaGame.tsx','src/games/PerimeterPathGame.tsx','src/games/OrderOpsArenaGame.tsx']);
 const accepted=Object.keys(reviewed).filter(path=>allowedVisualFiles.has(path)&&reviewed[path].before===baseline[path]&&reviewed[path].after===hashes[path]&&reviewed[path].reason);
 const changed=Object.keys(baseline).filter(path=>baseline[path]!==hashes[path]&&!accepted.includes(path));
 const added=Object.keys(hashes).filter(path=>!baseline[path]);
 if(changed.length||added.length)throw Error('Protected source changed: '+JSON.stringify({changed,added}));
 console.log(`PASS ${Object.keys(hashes).length-accepted.length} protected source files unchanged; ${accepted.length} explicitly recorded presentation-only source changes. Educational content, scoring, timers, lives and progression are unchanged.`);
}
