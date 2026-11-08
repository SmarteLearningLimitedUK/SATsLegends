import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='qa-artifacts/release-readiness-2026-11-04';await mkdir(out+'/logs',{recursive:true});
const specs=[
 ['root-types',['node_modules/typescript/bin/tsc','--noEmit']],
 ['matharia-types',['node_modules/typescript/bin/tsc','--noEmit','-p','variants/matharia/tsconfig.json']],
 ['ios-minimum',['variants/matharia/scripts/ensure-ios-minimum.mjs','--check']],
 ...['five-tier-difficulty','ks2-content-generators'].map(n=>[n,[`scripts/verify-${n}.mjs`]]),
 ...['educational-integrity','learning-systems','revision-targets','calendar-pictogram','maths-construction','sats-content','sats-question-integrity','number-line-questions','rotation-transformations','scale-builder-math','order-ops-engine'].map(n=>[n,['--import','tsx',`scripts/verify-${n}.${n==='maths-construction'?'tsx':'ts'}`]]),
 ['testflight-config',['--test','variants/matharia/scripts/testflight-availability.test.mjs']],
];
const rows=process.env.QA_RESUME==='1'?JSON.parse(await readFile(out+'/unit-checks.json','utf8').catch(()=>'[]')):[];
const jobs=specs.filter(([name])=>!rows.some(r=>r.name===name&&r.code===0));
async function worker(){while(jobs.length){const[name,args]=jobs.shift(),started=Date.now();let log='';
 const code=await new Promise(resolve=>{const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe'],env:process.env});child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);child.on('close',resolve);child.on('error',e=>{log+=e.message;resolve(-1)});});
 await writeFile(`${out}/logs/${name}.log`,log);const row={name,args,code,seconds:(Date.now()-started)/1000};
 const old=rows.findIndex(r=>r.name===name);if(old>=0)rows[old]=row;else rows.push(row);
 await writeFile(out+'/unit-checks.json',JSON.stringify(rows,null,2));console.log(code===0?'PASS':'FAIL',name,code===0?'':log.slice(-700));
}}
await Promise.all([worker(),worker()]);if(rows.some(r=>r.code!==0))process.exitCode=1;
