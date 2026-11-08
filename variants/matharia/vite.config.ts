import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { rmSync } from 'node:fs';
import {adaptPresentation} from './presentation-transform';
import {releaseAssets} from './release-assets';
const repo = path.resolve(__dirname, '../..');
const replacements: Record<string,string> = {
 'src/website/WebsiteRoot': 'app/NativeAppRoot.tsx',
 'src/components/game-ui/ViewportQuestion':'QuestionDock.tsx',
 'src/components/game-ui/RevisionActivityPresentation':'screens/RevisionActivityScene.tsx',
 'src/components/game-ui/VisionCompanion':'StageHero.tsx',
 'src/components/game-ui/MonsterMindActor':'MonsterMindActor.tsx',
 'src/components/GameplayContentViewport':'GameplayContentViewport.tsx',
 'src/components/GameplayOrientationGate':'OrientationGate.tsx',
 'src/website/SplashLogo': 'SplashLogo.tsx',
 'src/assets/website/hero-action-wide.webp': '../assets/png/backgrounds/bg_acropolis_landscape@2x.png',
 'src/components/AssetIcon':'AssetIcon.tsx',
 'src/screens/WorldMap': 'WorldMap.tsx',
 'src/app/testingFlags': 'testingFlags.ts',
 'src/games/visionScene': 'VisionScene.ts',
 'src/games/GameSetStage': 'GameSetStage.tsx',
 'src/components/GameActionDock': 'GameActionDock.tsx',
 'src/components/UnifiedMiniGameHud': 'UnifiedMiniGameHud.tsx',
 'src/components/SceneEnvironment': 'SceneEnvironment.tsx',
};
export default defineConfig(() => {
 const env = {...loadEnv('production', repo, 'VITE_'), ...loadEnv('ios', repo, 'VITE_')};
 return {
 root: __dirname, envDir: repo, publicDir: path.join(repo,'public'), base:'/',
 plugins:[{name:'exclude-reference-contact-sheet',apply:'build',closeBundle() {
  // This review sheet is copied from public but never used by the app.
  rmSync(path.join(repo,'dist-matharia/reference-assets/new-sheet-2026-04-22/preview-contact-sheet.png'),{force:true});
 }},{name:'matharia-presentation',enforce:'pre', transform(code,id) {
  if (id.split('?')[0].replace(/\\/g,'/') === path.join(repo,'src/index.css').replace(/\\/g,'/')) {
   return adaptPresentation(code,id,repo,__dirname).replace('@import "tailwindcss";', `@import "tailwindcss";\n@source "${path.join(repo,'src').replace(/\\/g,'/')}";\n@source "${path.join(__dirname,'src').replace(/\\/g,'/')}";`);
  }
  return adaptPresentation(code,id,repo,__dirname);
 }, resolveId(source, importer) {
  if (!importer || !source.startsWith('.')) return;
  const absolute = path.resolve(path.dirname(importer.split('?')[0]), source).replace(/\\/g,'/').replace(/\.(tsx?|jsx?)$/,'');
  for (const [original,replacement] of Object.entries(replacements)) {
   if (absolute === path.join(repo,original).replace(/\\/g,'/')) return path.join(__dirname,'src',replacement).replace(/\\/g,'/');
  }
 }},react(),tailwindcss(),releaseAssets(repo,__dirname)],
 define:{...Object.fromEntries(Object.entries(env).map(([key,value])=>[`import.meta.env.${key}`,JSON.stringify(value)])), 'import.meta.env.VITE_APP_TARGET':JSON.stringify('ios'), 'import.meta.env.VITE_MATHARIA_TESTFLIGHT_ACCESS':JSON.stringify(process.env.MATHARIA_TESTFLIGHT_ALL_GAMES==='1')},
 resolve:{alias:{'@':repo}}, server:{host:'127.0.0.1',port:3014,fs:{allow:[repo]}},
 build:{outDir:path.join(repo,'dist-matharia'),emptyOutDir:true,rollupOptions:{output:{manualChunks:{motion:['motion/react'],charts:['recharts'],lucide:['lucide-react']}}}},
 };
});
