import {readFile,writeFile} from 'node:fs/promises';

// Capacitor 8 regenerates the SPM platform with the major version only.
// Keep the user-approved minimum consistent after sync/update, without
// changing the original SATs Legends project or dependency packages.
const minimum='16.4';
const platform=process.env.CAPACITOR_PLATFORM_NAME;
if(platform&&platform!=='ios')process.exit(0);
const check=process.argv.includes('--check');
const specs=[
  {url:new URL('../native/ios/App/App.xcodeproj/project.pbxproj',import.meta.url),
   pattern:/(\bIPHONEOS_DEPLOYMENT_TARGET\s*=\s*)[^;]+;/g,
   replace:(_all,prefix)=>`${prefix}${minimum};`},
  {url:new URL('../native/ios/App/CapApp-SPM/Package.swift',import.meta.url),
   pattern:/(\bplatforms\s*:\s*\[\s*\.iOS\()[^)]+(\)\s*\])/g,
   replace:(_all,prefix,suffix)=>`${prefix}"${minimum}"${suffix}`},
];
const plans=await Promise.all(specs.map(async spec=>{
  const source=await readFile(spec.url,'utf8'),matches=[...source.matchAll(spec.pattern)];
  if(!matches.length)throw Error(`Missing iOS minimum setting: ${spec.url.pathname}`);
  return{...spec,source,next:source.replace(spec.pattern,spec.replace),count:matches.length};
}));
if(check&&plans.some(p=>p.source!==p.next))throw Error(`Matharia native settings must all specify iOS ${minimum}. Run node scripts/ensure-ios-minimum.mjs.`);
for(const p of plans)if(p.next!==p.source)await writeFile(p.url,p.next,'utf8');
console.log(`Matharia minimum iOS ${minimum}: ${plans[0].count} Xcode settings and Swift package ${check?'verified':'aligned'}.`);
