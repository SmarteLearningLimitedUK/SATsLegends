import type {Plugin} from 'vite';
import {existsSync,readdirSync,readFileSync,rmSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const groups='backgrounds,heroes,portraits,map,branding,characters,props,food,illustrated_ui,frames,gameplay,buttons,runes,icons';
const library=`../assets/png/{${groups}}/*.{png,webp}`;
const textTypes=new Set(['.js','.css','.html','.json','.svg','.webmanifest']);
const binaryTypes=new Set(['.png','.webp','.jpg','.jpeg','.gif','.mp3','.wav','.ogg','.woff','.woff2','.ttf']);
function files(root:string):string[]{return readdirSync(root,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(root,entry.name)):[path.join(root,entry.name)]);}

/** A release-only exclusion pass. Original source/library assets are never changed. */
export function releaseAssets(repo:string,variant:string):Plugin {
 const out=path.resolve(repo,'dist-matharia');
 const originals=new Map<string,string[]>();
 return {name:'matharia-release-assets',apply:'build',enforce:'pre',
  transform(code,id){
   if(path.resolve(id.split('?')[0])!==path.join(variant,'src/assets.ts'))return;
   // asset() always chooses WebP before its matching PNG. Keep PNG-only
   // fallbacks, but do not import redundant PNG encodings into the bundle.
   const duplicates=groups.split(',').flatMap(group=>{
    const folder=path.join(variant,'assets/png',group);if(!existsSync(folder))return [];
    return readdirSync(folder).filter(name=>name.endsWith('.png')&&existsSync(path.join(folder,name.replace(/\.png$/,'.webp')))).map(name=>`!../assets/png/${group}/${name}`);
   });
   const source=`import.meta.glob('${library}'`;
   if(!code.includes(source))throw Error('Matharia asset library changed; review release fallback filtering.');
   return code.replace(source,`import.meta.glob(${JSON.stringify([library,...duplicates])}`);
  },
  generateBundle(_options,bundle){
   for(const [name,item]of Object.entries(bundle))if(item.type==='asset')originals.set(name,item.originalFileNames);
  },
  closeBundle(){
   if(!existsSync(out))return;
   const all=files(out);
   const text=all.filter(file=>textTypes.has(path.extname(file))).map(file=>readFileSync(file,'utf8')).join('\n');
   const retained:string[]=[],excluded:{file:string;bytes:number;sourceFiles:string[];reason:string}[]=[];
   const remove=(file:string,reason:string)=>{
    const absolute=path.resolve(file);
    if(!absolute.startsWith(out+path.sep))throw Error('Release exclusion escaped generated output.');
    const relative=path.relative(out,absolute).replaceAll('\\','/');
    excluded.push({file:relative,bytes:statSync(file).size,sourceFiles:originals.get(relative)||[],reason});
    rmSync(absolute);
   };
   for(const file of all){
    const name=path.basename(file),relative=path.relative(out,file).replaceAll('\\','/');
    // Public review/lesson directories also contain a few runtime GUI slices.
    // Keep any referenced slice; directory names alone do not prove it unused.
    const websiteOnly=/^(?:lessons\/|reference-assets\/|\.htaccess$|_headers$)/.test(relative);
    if(websiteOnly){
     if(text.includes('/'+relative)||text.includes(encodeURI('/'+relative))){retained.push(relative);continue;}
     remove(file,'Website hosting, lesson or review resource; no app runtime reference');continue;
    }
    if(!relative.startsWith('assets/')||!binaryTypes.has(path.extname(file)))continue;
    // Hashed generated URLs (including runtime lookup maps) must occur in the
    // emitted JS/CSS/HTML/JSON/SVG. Check encoded and unencoded filenames.
    if(text.includes(name)||text.includes(encodeURI(name))||text.includes(encodeURIComponent(name)))retained.push(relative);
    else remove(file,'No reference in emitted app code, styles or resource manifests');
   }
   const audit=path.join(repo,'qa-artifacts/release-readiness-2026-11-04');mkdirSync(audit,{recursive:true});
   writeFileSync(path.join(audit,'asset-exclusions.json'),JSON.stringify({retainedBinaryFiles:retained.length,excluded,excludedBytes:excluded.reduce((sum,item)=>sum+item.bytes,0),sourceAssetsDeleted:false},null,2));
  },
 };
}
