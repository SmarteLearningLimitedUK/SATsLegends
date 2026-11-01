import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream, readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync, openSync, closeSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {IOS_APP_ID, IOS_BUNDLE_ID, IOS_TEAM_ID, NATIVE_PROJECT, signingConfiguration, connectToken, nextBuild, exportOptions} from './ios-testflight-config.mjs';
import {enableInternalTesting} from './testflight-availability.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--simulator','--upload'].includes(mode)) throw Error('Use --simulator or --upload.');
if (process.platform !== 'darwin') throw Error('Native compilation requires the macOS runner.');
const release = JSON.parse(readFileSync(new URL('../release/candidate.json', import.meta.url), 'utf8'));
if (!/^[a-f0-9]{64}$/.test(release.sha256) || release.bundleId !== IOS_BUNDLE_ID || release.minimumIOS !== '16.4') throw Error('Invalid candidate manifest.');
const zipPath = resolve(process.env.CANDIDATE_ZIP || '');
if (!process.env.CANDIDATE_ZIP || !existsSync(zipPath)) throw Error('Download the pinned candidate first.');
const out = resolve('qa-artifacts/ios-matharia', mode.slice(2));
mkdirSync(out,{recursive:true});
const work = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(),'matharia-native-'));
const nativeRoot = join(work,'candidate');
mkdirSync(nativeRoot);

function run(command,args,{cwd=nativeRoot,log,timeout=1800000}={}) {
  const fd = log ? openSync(join(out,log),'w') : null;
  let result;
  try {result = spawnSync(command,args,{cwd,encoding:'utf8',timeout,maxBuffer:32*1024*1024,
    stdio:log?['ignore',fd,fd]:'pipe'});}
  finally {if (fd !== null) closeSync(fd);}
  if (result.error || result.status !== 0) {
    if (log) console.error(readFileSync(join(out,log),'utf8').split('\n').slice(-65).join('\n'));
    else console.error((result.stderr || '').slice(-4000));
    throw Error(`${command} ${args[0]} failed; inspect ${log || 'the step output'}.`);
  }
  return result.stdout?.trim() || '';
}
async function hash(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}
const plist = (path,key) => run('plutil',['-extract',key,'raw','-o','-',path]);
const result = {app:'Matharia',appId:IOS_APP_ID,bundleId:IOS_BUNDLE_ID,minimumIOS:'16.4',
  candidateSha256:release.sha256,sourceGitHead:release.sourceGitHead,ciCommit:process.env.GITHUB_SHA,
  ciRun:process.env.GITHUB_RUN_ID,createdAt:new Date().toISOString(),scope:mode.slice(2)};
const save = () => writeFileSync(join(out,'result.json'),JSON.stringify(result,null,2)+'\n');

try {
  if (await hash(zipPath) !== release.sha256) throw Error('Candidate checksum mismatch.');
  // Reject traversal/symlink entries before extracting this exact checksum-pinned package.
  run('python3',['-c',`import sys,zipfile,pathlib,stat
with zipfile.ZipFile(sys.argv[1]) as z:
 for i in z.infolist():
  p=pathlib.PurePosixPath(i.filename)
  assert not p.is_absolute() and '..' not in p.parts and '\\\\' not in i.filename
  assert not stat.S_ISLNK(i.external_attr>>16)
 z.extractall(sys.argv[2])`,zipPath,nativeRoot]);
  const candidate = JSON.parse(readFileSync(join(nativeRoot,'MATHARIA-CANDIDATE.json'),'utf8'));
  if (candidate.bundleId !== IOS_BUNDLE_ID || candidate.minimumIOS !== '16.4') throw Error('Wrong native candidate identity.');
  if (candidate.sourceGitHead !== release.sourceGitHead) throw Error('Candidate source provenance mismatch.');
  const project = join(nativeRoot,NATIVE_PROJECT,'project.pbxproj');
  if (await hash(project) !== candidate.nativeProjectSha256) throw Error('Native source hash mismatch.');
  const pbx = readFileSync(project,'utf8');
  if ((pbx.match(/IPHONEOS_DEPLOYMENT_TARGET = 16\.4;/g)||[]).length !== 4 ||
      (pbx.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.smartelearning\.satslegends;/g)||[]).length !== 2) throw Error('Native identity or minimum OS mismatch.');
  const config = JSON.parse(readFileSync(join(nativeRoot,'variants/matharia/native/ios/App/App/capacitor.config.json'),'utf8'));
  if (config.appId !== IOS_BUNDLE_ID || config.appName !== 'Matharia' || config.server?.url) throw Error('Candidate must contain the locally bundled Matharia app.');
  const publicRoot = join(nativeRoot,'variants/matharia/native/ios/App/App/public');
  const webFiles = Object.entries(candidate.webFiles);
  if (webFiles.length < 500) throw Error('Candidate web manifest is incomplete.');
  for (const [relative,expected] of webFiles) {
    const file = resolve(publicRoot,relative);
    if (!file.startsWith(publicRoot+'/') || await hash(file) !== expected) throw Error(`Web asset failed verification: ${relative}`);
  }
  result.verifiedWebFiles = webFiles.length;
  const xcode = run('xcodebuild',['-version']);
  if (Number(xcode.match(/Xcode (\d+)/)?.[1] || 0) < 26) throw Error('Xcode 26+ is required.');
  result.xcode = xcode;
  console.log(`Verified candidate and ${webFiles.length} web files. ${xcode.replaceAll('\n','; ')}`);

  if (mode === '--simulator') {
    const derived = join(work,'DerivedData');
    run('xcodebuild',['-project',NATIVE_PROJECT,'-scheme','App','-configuration','Debug',
      '-sdk','iphonesimulator','-destination','generic/platform=iOS Simulator','-derivedDataPath',derived,
      'CODE_SIGNING_ALLOWED=NO','build'],{log:'build.log'});
    const app = join(derived,'Build/Products/Debug-iphonesimulator/App.app');
    if (plist(join(app,'Info.plist'),'CFBundleIdentifier') !== IOS_BUNDLE_ID || plist(join(app,'Info.plist'),'MinimumOSVersion') !== '16.4') throw Error('Simulator app has wrong identity or minimum OS.');
    const devices = Object.entries(JSON.parse(run('xcrun',['simctl','list','devices','available','--json'])).devices)
      .filter(([runtime])=>runtime.includes('.iOS-')).flatMap(([,items])=>items);
    result.devices = [];
    for (const kind of ['iPhone','iPad']) {
      const device = devices.find(d=>d.isAvailable && d.name.startsWith(kind));
      if (!device) throw Error(`No ${kind} simulator is available.`);
      const ownBoot = device.state !== 'Booted';
      try {
        if (ownBoot) run('xcrun',['simctl','boot',device.udid]);
        run('xcrun',['simctl','bootstatus',device.udid,'-b']);
        run('xcrun',['simctl','install',device.udid,app]);
        const launched = run('xcrun',['simctl','launch',`--stdout=${join(out,kind+'-stdout.log')}`,`--stderr=${join(out,kind+'-stderr.log')}`,device.udid,IOS_BUNDLE_ID]);
        const pid = launched.match(/:\s*(\d+)\s*$/)?.[1];
        if (!pid) throw Error(`No ${kind} launch PID.`);
        await new Promise(done=>setTimeout(done,15000));
        run('xcrun',['simctl','io',device.udid,'screenshot',join(out,kind.toLowerCase()+'-native-launch.png')]);
        const processName = run('ps',['-p',pid,'-o','comm=']);
        if (!processName.includes('App.app/App')) throw Error(`${kind} app did not survive launch.`);
        result.devices.push({name:device.name,kind,processSurvived:true});
      } finally {
        if (ownBoot) run('xcrun',['simctl','shutdown',device.udid]);
      }
    }
    result.nativeCompiled = true;
    result.nativeInstallAndLaunchVerified = true;
    result.nativeGameplayVerified = false;
    result.nativeIOS164RuntimeVerified = false;
    result.scope = 'Native compilation, iPhone/iPad install, launch and process survival on runner runtimes. Screenshots require inspection. No native gameplay, StoreKit or iOS 16.4 runtime certification.';
    console.log('Native iPhone and iPad launch checks passed.');
  } else {
    const signing = signingConfiguration(process.env);
    async function apple(path,options={}) {
      const url = new URL(path,'https://api.appstoreconnect.apple.com');
      if (url.origin !== 'https://api.appstoreconnect.apple.com') throw Error('Unexpected Apple API origin.');
      const response = await fetch(url,{...options,headers:{Authorization:`Bearer ${connectToken(signing)}`,...options.headers},
        redirect:'error',signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw Error(`Apple record check failed (HTTP ${response.status}).`);
      return response.status===204?null:response.json();
    }
    const app = await apple(`/v1/apps/${IOS_APP_ID}?fields[apps]=bundleId,name`);
    if (app.data?.id !== IOS_APP_ID || app.data.attributes?.bundleId !== IOS_BUNDLE_ID) throw Error('Live Apple app does not match the existing SATs Legends record.');
    result.appStoreConnectRecordVerified = true;
    result.appleAppName = app.data.attributes.name;
    let page = await apple(`/v1/builds?filter[app]=${IOS_APP_ID}&sort=-uploadedDate&limit=200&include=preReleaseVersion`);
    const latest = page.data?.[0], included = page.included || [];
    const preRelease = included.find(item=>item.id===latest?.relationships?.preReleaseVersion?.data?.id && item.type==='preReleaseVersions');
    const version = preRelease?.attributes?.version || '1.0';
    if (!/^\d{1,4}(\.\d{1,4}){1,2}$/.test(version)) throw Error('Current Apple marketing version needs review.');
    const builds = [...(page.data || [])];
    let pages = 1;
    while (page.links?.next) {
      if (++pages > 25) throw Error('Build history requires a larger explicit review.');
      page = await apple(page.links.next); builds.push(...(page.data || []));
    }
    const build = nextBuild(builds.map(item=>item.attributes.version),process.env.GITHUB_RUN_NUMBER,process.env.GITHUB_RUN_ATTEMPT);
    Object.assign(result,{version,build,internalTestingOnly:true,uploadCommandSucceeded:false}); save();
    const keyPath = join(work,`AuthKey_${signing.keyId}.p8`),optionsPath = join(work,'ExportOptions.plist');
    writeFileSync(keyPath,signing.privateKey,{mode:0o600});
    writeFileSync(optionsPath,exportOptions(signing),{mode:0o600});
    const archive = join(work,'Matharia.xcarchive');
    const auth = ['-allowProvisioningUpdates','-authenticationKeyPath',keyPath,'-authenticationKeyID',signing.keyId,'-authenticationKeyIssuerID',signing.issuer];
    console.log(`Archiving Matharia ${version} (${build}) for existing app ${IOS_APP_ID}.`);
    run('xcodebuild',['-project',NATIVE_PROJECT,'-scheme','App','-configuration','Release',
      '-destination','generic/platform=iOS','-archivePath',archive,...auth,
      `DEVELOPMENT_TEAM=${IOS_TEAM_ID}`,'CODE_SIGN_STYLE=Automatic','CODE_SIGNING_ALLOWED=NO',
      `CURRENT_PROJECT_VERSION=${build}`,`PRODUCT_BUNDLE_IDENTIFIER=${IOS_BUNDLE_ID}`,`MARKETING_VERSION=${version}`,'archive'],{log:'archive.log'});
    const info = join(archive,'Products/Applications/App.app/Info.plist');
    for (const [key,expected] of [['CFBundleIdentifier',IOS_BUNDLE_ID],['CFBundleVersion',build],['CFBundleShortVersionString',version],['MinimumOSVersion','16.4']]) {
      if (plist(info,key) !== expected) throw Error(`Archive ${key} mismatch.`);
    }
    result.nativeArchiveVerified = true; save();
    run('xcodebuild',['-exportArchive','-archivePath',archive,'-exportPath',join(work,'export'),'-exportOptionsPlist',optionsPath,...auth],{log:'upload.log'});
    result.uploadCommandSucceeded = true; save();
    console.log('Apple upload command succeeded; waiting for the uploaded build record.');
    for (let attempt=0; attempt<30; attempt++) {
      await new Promise(done=>setTimeout(done,20000));
      const uploaded = await apple(`/v1/builds?filter[app]=${IOS_APP_ID}&filter[version]=${encodeURIComponent(build)}&limit=1`);
      const record = uploaded.data?.[0];
      if (!record) continue;
      Object.assign(result,{appleBuildId:record.id,processingState:record.attributes.processingState,
        usesNonExemptEncryption:record.attributes.usesNonExemptEncryption,expired:record.attributes.expired}); save();
      if (result.processingState === 'VALID') break;
      if (['FAILED','INVALID'].includes(result.processingState)) throw Error(`Apple processing returned ${result.processingState}.`);
    }
    result.processingState ||= 'PENDING';
    if(result.processingState==='VALID'){
      const availability=await enableInternalTesting({
        api:(path,options={})=>apple(path,{...options,
          body:options.body?JSON.stringify(options.body):undefined,
          headers:options.body?{'Content-Type':'application/json'}:{}}),
        buildId:result.appleBuildId,expectedVersion:version,expectedBuild:build,
        onProgress:part=>{result.testflightAvailability=part;save();}
      });
      result.usesNonExemptEncryption=availability.usesNonExemptEncryption;
      result.internalBuildState=availability.internalBuildState;
      result.availableForInternalTesting=availability.availableForInternalTesting;
    }
    console.log(`Uploaded ${version} (${build}). Apple processing: ${result.processingState}.`);
  }
  result.success = true; save();
} catch (error) {
  result.success = false; result.error = error.message; save(); throw error;
} finally {
  // Only this exact private temporary directory, created by mkdtemp above.
  rmSync(work,{recursive:true,force:true});
}
