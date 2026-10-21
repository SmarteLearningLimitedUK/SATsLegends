import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { IOS_APP_ID, IOS_BUNDLE_ID, signingConfiguration, connectToken, exportOptions, archiveArguments } from './ios-testflight-config.mjs';
import { loadEnv } from 'vite';
import { validateIOSInternalTestConfig } from './ios-release-config.mjs';

if (process.platform !== 'darwin') throw Error('Signed iOS packaging requires the prepared macOS runner with Xcode 26+.');
if (process.argv.slice(2).some(arg => arg !== '--upload')) throw Error('Only --upload is supported. Default mode exports without uploading.');
const upload=process.argv.includes('--upload');
const config=signingConfiguration(process.env);
const publicConfig={...loadEnv('production',process.cwd(),'VITE_'),...loadEnv('ios',process.cwd(),'VITE_'),...process.env};
const configErrors=validateIOSInternalTestConfig(publicConfig);
if(configErrors.length)throw Error('Release configuration is incomplete:\n'+configErrors.join('\n'));
function run(command,args,options={}) {
  const result=spawnSync(command,args,{stdio:'inherit',...options});
  if(result.error || result.status!==0)throw Error(`${command} failed; inspect this build step's logs.`);
  return result.stdout?.toString().trim();
}
const version=run('xcodebuild',['-version'],{stdio:'pipe'});
if(Number(version.match(/Xcode (\d+)/)?.[1] || 0)<26)throw Error('Select Xcode 26+ before packaging.');
// Confirm this key can see the exact app before granting Xcode provisioning access.
const response=await fetch(`https://api.appstoreconnect.apple.com/v1/apps/${IOS_APP_ID}?fields[apps]=bundleId,name`,{
  headers:{Authorization:`Bearer ${connectToken(config)}`},redirect:'error',signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error(`Apple app-record check failed (HTTP ${response.status}). Check API access and key role.`);
const record=await response.json();
if(record.data?.id!==IOS_APP_ID || record.data?.attributes?.bundleId!==IOS_BUNDLE_ID)throw Error('Apple app record does not match this project.');

const out=resolve('qa-artifacts/ios-testflight');mkdirSync(out,{recursive:true});
const privateDir=mkdtempSync(join(tmpdir(),'sats-ios-signing-'));
try {
  const keyPath=join(privateDir,`AuthKey_${config.keyId}.p8`),optionsPath=join(privateDir,'ExportOptions.plist'),archivePath=join(out,'SATsLegends.xcarchive');
  writeFileSync(keyPath,config.privateKey,{mode:0o600});
  writeFileSync(optionsPath,exportOptions(config,upload),{mode:0o600});
  run('xcodebuild',archiveArguments(config,keyPath,archivePath));
  const info=join(archivePath,'Products/Applications/App.app/Info.plist');
  for(const [key,expected] of [['CFBundleIdentifier',IOS_BUNDLE_ID],['CFBundleVersion',config.build],['CFBundleShortVersionString','1.0']]) {
    if(run('plutil',['-extract',key,'raw','-o','-',info],{stdio:'pipe'})!==expected)throw Error(`Archive ${key} does not match the requested build.`);
  }
  run('xcodebuild',['-exportArchive','-archivePath',archivePath,'-exportPath',join(out,'export'),'-exportOptionsPlist',optionsPath,
    '-allowProvisioningUpdates','-authenticationKeyPath',keyPath,'-authenticationKeyID',config.keyId,'-authenticationKeyIssuerID',config.issuer]);
  writeFileSync(join(out,'build-result.json'),JSON.stringify({appId:IOS_APP_ID,bundleId:IOS_BUNDLE_ID,version:'1.0',build:config.build,
    commit:process.env.GITHUB_SHA || null,internalTestingOnly:true,uploadCommandSucceeded:upload,createdAt:new Date().toISOString()},null,2));
  console.log(upload ? 'Upload command succeeded. Apple must process the build before it can be installed through TestFlight.' : 'Signed internal-test package exported. Nothing uploaded.');
} finally {
  // Only the exact temporary directory created above; no key material enters artifacts.
  rmSync(privateDir,{recursive:true,force:true});
}
