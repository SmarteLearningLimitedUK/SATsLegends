import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream, readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync, openSync, closeSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {IOS_APP_ID, IOS_BUNDLE_ID, IOS_TEAM_ID, NATIVE_PROJECT, signingConfiguration, connectToken, nextBuild, exportOptions} from './ios-testflight-config.mjs';
import {enableInternalTesting} from './testflight-availability.mjs';
import {subscriptionConfiguration, verifyLiveSubscriptions} from './subscription-config.mjs';

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

function run(command,args,{cwd=nativeRoot,log,timeout=1800000,env=process.env}={}) {
  const fd = log ? openSync(join(out,log),'w') : null;
  let result;
  try {result = spawnSync(command,args,{cwd,env,encoding:'utf8',timeout,killSignal:'SIGKILL',maxBuffer:32*1024*1024,
    stdio:log?['ignore',fd,fd]:'pipe'});}
  finally {if (fd !== null) closeSync(fd);}
  if (result.error || result.status !== 0) {
    if (log) console.error(readFileSync(join(out,log),'utf8').split('\n').slice(-65).join('\n'));
    else console.error((result.stderr || '').slice(-4000));
    throw Error(`${command} ${args[0]} failed (${result.error?.code || `exit ${result.status}`}; timeout ${timeout/1000}s); inspect ${log || 'the step output'}.`);
  }
  return result.stdout?.trim() || '';
}
async function hash(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}
const plist = (path,key) => run('plutil',['-extract',key,'raw','-o','-',path]);
const requiredSdk = '27.2';
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
  if (candidate.internalTestingOnly === true && release.internalTestingOnly !== true) throw Error('An internal review candidate must retain its internal-only export restriction.');
  if (candidate.closedBetaOnly === true && (release.closedBetaOnly !== true || release.internalTestingOnly === true)) throw Error('Closed-beta candidate must retain its explicit external closed-beta scope.');
  if (candidate.allGamesUnlockedForReview === true && release.internalTestingOnly !== true && !(candidate.closedBetaOnly === true && release.closedBetaOnly === true)) throw Error('An unlocked review bundle must be internal-only or explicitly scoped to a closed beta.');
  if (candidate.bundleId !== IOS_BUNDLE_ID || candidate.minimumIOS !== '16.4') throw Error('Wrong native candidate identity.');
  if (candidate.sourceGitHead !== release.sourceGitHead) throw Error('Candidate source provenance mismatch.');
  const subscriptions = subscriptionConfiguration(nativeRoot);
  // The CI checkout contains scripts/catalog only; native source stays in the
  // private checksum-pinned candidate rather than requiring public source files.
  const expectedSubscriptions = JSON.parse(readFileSync(new URL('../release/subscriptions.json', import.meta.url), 'utf8'));
  if (JSON.stringify(subscriptions) !== JSON.stringify(expectedSubscriptions)) throw Error('Candidate subscription configuration is stale.');
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
  result.xcode = xcode;
  const sdk = mode === '--simulator' ? 'iphonesimulator' : 'iphoneos';
  result.sdkVersion = run('xcrun',['--sdk',sdk,'--show-sdk-version']);
  if (result.sdkVersion !== requiredSdk) throw Error(`iOS SDK ${requiredSdk} is required. Found ${result.sdkVersion}.`);
  console.log(`Verified candidate and ${webFiles.length} web files. ${xcode.replaceAll('\n','; ')}`);

  if (mode === '--simulator' && release.nativeLaunchEvidence !== undefined) {
    // The same bundle can be tested across independent Mac jobs when CoreSimulator cannot run both in one session.
    const evidence = release.nativeLaunchEvidence;
    if (!Array.isArray(evidence) || evidence.length !== 2) throw Error('Expected two exact-package simulator receipts.');
    const kinds = new Set();
    for (const row of evidence) {
      if (row.candidateSha256 !== release.sha256 || row.sourceGitHead !== release.sourceGitHead ||
          row.bundleId !== IOS_BUNDLE_ID || row.minimumIOS !== '16.4' || row.scope !== 'simulator' ||
          row.verifiedWebFiles !== result.verifiedWebFiles || row.nativeCompiled !== true || row.xcode !== xcode ||
          row.sdkVersion !== requiredSdk ||
          !/^[0-9]+$/.test(row.ciRun) || !/^[a-f0-9]{40}$/.test(row.ciCommit) ||
          !['iPhone', 'iPad'].includes(row.device?.kind) || !row.device.name?.startsWith(row.device.kind) ||
          row.device.processSurvived !== true || kinds.has(row.device.kind)) {
        throw Error('Unverified or duplicate simulator receipt for the pinned package.');
      }
      kinds.add(row.device.kind);
    }
    result.devices = evidence.map(row => row.device);
    result.simulatorSourceRuns = evidence.map(row => ({kind: row.device.kind, run: row.ciRun, commit: row.ciCommit}));
    result.nativeCompiled = true;
    result.nativeInstallAndLaunchVerified = true;
    result.nativeGameplayVerified = false;
    result.nativeIOS164RuntimeVerified = false;
    result.scope = 'Verified exact-package iPhone and iPad install and launch from separate macOS runner reports.';
    console.log(`Validated ${evidence.map(row => `${row.device.kind} run ${row.ciRun}`).join(' and ')}.`);
  } else if (mode === '--simulator') {
    const derived = join(work,'DerivedData');
    run('xcodebuild',['-project',NATIVE_PROJECT,'-scheme','App','-configuration','Debug',
      '-sdk','iphonesimulator','-destination','generic/platform=iOS Simulator','-derivedDataPath',derived,
      'CODE_SIGNING_ALLOWED=NO','build'],{log:'build.log'});
    const app = join(derived,'Build/Products/Debug-iphonesimulator/App.app');
    const info = join(app,'Info.plist');
    if (plist(info,'CFBundleIdentifier') !== IOS_BUNDLE_ID || plist(info,'MinimumOSVersion') !== '16.4' ||
        plist(info,'DTSDKName') !== `iphonesimulator${requiredSdk}`) throw Error('Simulator app has wrong identity, minimum OS or SDK.');
    result.nativeCompiled = true; save();
    console.log('Native compilation passed; discovering simulator devices.');
    const devices = Object.entries(JSON.parse(run('xcrun',['simctl','list','devices','available','--json'])).devices)
      .filter(([runtime])=>runtime.endsWith(`.iOS-${requiredSdk.replaceAll('.','-')}`)).flatMap(([,items])=>items);
    result.devices = [];
    for (const kind of ['iPad','iPhone']) {
      const device = devices.find(d=>d.isAvailable && d.name.startsWith(kind));
      if (!device) throw Error(`No ${kind} simulator is available.`);
      const ownBoot = device.state !== 'Booted';
      let appLaunched = false;
      const sim = (stage,args,timeout) => {
        console.log(`${kind}: ${stage} (${device.name}; timeout ${timeout/1000}s).`);
        result.simulatorStage = {kind,name:device.name,stage,startedAt:new Date().toISOString()}; save();
        return run('xcrun',['simctl',...args],{timeout});
      };
      try {
        if (ownBoot) sim('boot',['boot',device.udid],240000);
        sim('wait for boot',['bootstatus',device.udid,'-b'],300000);
        sim('install',['install',device.udid,app],300000);
        const launched = sim('launch',['launch',`--stdout=${join(out,kind+'-stdout.log')}`,`--stderr=${join(out,kind+'-stderr.log')}`,device.udid,IOS_BUNDLE_ID],180000);
        const pid = launched.match(/:\s*(\d+)\s*$/)?.[1];
        if (!pid) throw Error(`No ${kind} launch PID.`);
        appLaunched = true;
        await new Promise(done=>setTimeout(done,15000));
        const processName = run('ps',['-p',pid,'-o','comm='],{timeout:15000});
        if (!processName.includes('App.app/App')) throw Error(`${kind} app did not survive launch.`);
        result.devices.push({name:device.name,kind,processSurvived:true});
        save(); console.log(`${kind}: app installed and survived launch.`);
        try {sim('screenshot',['io',device.udid,'screenshot',join(out,kind.toLowerCase()+'-native-launch.png')],45000);}
        catch(error) {
          (result.simulatorScreenshotWarnings ||= []).push({kind,name:device.name,error:error.message}); save();
          console.warn(`${kind}: simulator screenshot unavailable. App process survival has already been verified.`);
        }
      } catch(error) {
        result.simulatorFailure = {...result.simulatorStage,error:error.message}; save();
        throw error;
      } finally {
        if (ownBoot) {
          if (appLaunched) {
            try {sim('terminate app',['terminate',device.udid,IOS_BUNDLE_ID],60000);}
            catch(error) {
              (result.simulatorCleanupWarnings ||= []).push({kind,name:device.name,error:error.message}); save();
              console.warn(`${kind}: app termination failed; attempting simulator shutdown.`);
            }
          }
          try {sim('shutdown',['shutdown',device.udid],90000);}
          catch(error) {
            (result.simulatorCleanupWarnings ||= []).push({kind,name:device.name,error:error.message}); save();
            console.warn(`${kind}: simulator cleanup failed or timed out; validation results are retained.`);
          }
        }
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
    const transientAppleError = error => ['TimeoutError','TypeError'].includes(error.name) || /HTTP (429|5\d\d)\b/.test(error.message);
    async function apple(path,options={},readAttempts=3) {
      const url = new URL(path,'https://api.appstoreconnect.apple.com');
      if (url.origin !== 'https://api.appstoreconnect.apple.com') throw Error('Unexpected Apple API origin.');
      const attempts = (options.method || 'GET') === 'GET' ? readAttempts : 1;
      for (let attempt=1; attempt<=attempts; attempt++) {
        try {
          const response = await fetch(url,{...options,headers:{Authorization:`Bearer ${connectToken(signing)}`,...options.headers},
            redirect:'error',signal:AbortSignal.timeout(35000)});
          if (!response.ok) throw Error(`Apple record check failed (HTTP ${response.status}).`);
          return response.status===204?null:await response.json();
        } catch (error) {
          if (attempt===attempts || !transientAppleError(error)) throw error;
          console.warn(`Temporary App Store Connect read failure on ${url.pathname}; retrying.`);
          await new Promise(done=>setTimeout(done,2000*attempt));
        }
      }
    }
    let appleApp;
    try {
      appleApp = (await apple(`/v1/apps/${IOS_APP_ID}`,{},1)).data;
    } catch (error) {
      if (!transientAppleError(error)) throw error;
      const filter = encodeURIComponent(IOS_BUNDLE_ID);
      const apps = await apple(`/v1/apps?filter[bundleId]=${filter}&fields[apps]=bundleId,name&limit=2`);
      appleApp = apps.data?.find(app=>app.id===IOS_APP_ID);
    }
    if (appleApp?.id !== IOS_APP_ID || appleApp.attributes?.bundleId !== IOS_BUNDLE_ID) throw Error('Live Apple app does not match the existing SATs Legends record.');
    result.appStoreConnectRecordVerified = true;
    try {
      result.verifiedSubscriptionProducts = await verifyLiveSubscriptions((path,options)=>apple(path,options,1), subscriptions);
      result.subscriptionVerification = { mode:'live' };
    } catch (error) {
      const proof = release.verifiedSubscriptionReceipt;
      const transient = error.name==='TimeoutError' || /HTTP (429|5\d\d)\b/.test(String(error.message));
      const products = subscriptions.products.map(({id,appleId,period})=>({id,appleId,period}));
      const age = Date.now()-Date.parse(proof?.createdAt);
      const catalog = join(nativeRoot,'variants/matharia/release/subscriptions.json');
      const scopedBeta = candidate.closedBetaOnly===true && candidate.allGamesUnlockedForReview===true && release.closedBetaOnly===true;
      if (!transient || !scopedBeta || !proof || proof.appId!==IOS_APP_ID || proof.bundleId!==IOS_BUNDLE_ID ||
          !Number.isFinite(age) || age<0 || age>86400000 ||
          !/^[0-9]+$/.test(proof.ciRun) || proof.catalogSha256!==await hash(catalog) ||
          JSON.stringify(proof.products)!==JSON.stringify(products)) throw error;
      result.verifiedSubscriptionProducts = proof.products;
      result.subscriptionVerification = { mode:'prior-live-receipt', build:proof.build, run:proof.ciRun, verifiedAt:proof.createdAt, error:error.name==='TimeoutError'?'Apple subscription request timed out':String(error.message) };
      console.warn('Apple subscription metadata unavailable. Using same-catalog evidence for the explicitly scoped beta.');
    }
    result.appleAppName = appleApp.attributes.name;
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
    Object.assign(result,{version,build,internalTestingOnly:release.internalTestingOnly===true,uploadCommandSucceeded:false}); save();
    const keyPath = join(work,`AuthKey_${signing.keyId}.p8`),optionsPath = join(work,'ExportOptions.plist');
    writeFileSync(keyPath,signing.privateKey,{mode:0o600});
    writeFileSync(optionsPath,exportOptions(signing,{internalOnly:result.internalTestingOnly}).replace('<string>upload</string>','<string>export</string>'),{mode:0o600});
    const archive = join(work,'Matharia.xcarchive');
    const auth = ['-allowProvisioningUpdates','-authenticationKeyPath',keyPath,'-authenticationKeyID',signing.keyId,'-authenticationKeyIssuerID',signing.issuer];
    console.log(`Archiving Matharia ${version} (${build}) for existing app ${IOS_APP_ID}.`);
    run('xcodebuild',['-project',NATIVE_PROJECT,'-scheme','App','-configuration','Release',
      '-destination','generic/platform=iOS','-archivePath',archive,...auth,
      `DEVELOPMENT_TEAM=${IOS_TEAM_ID}`,'CODE_SIGN_STYLE=Automatic','CODE_SIGNING_ALLOWED=NO',
      `CURRENT_PROJECT_VERSION=${build}`,`PRODUCT_BUNDLE_IDENTIFIER=${IOS_BUNDLE_ID}`,`MARKETING_VERSION=${version}`,'archive'],{log:'archive.log'});
    const info = join(archive,'Products/Applications/App.app/Info.plist');
    for (const [key,expected] of [['CFBundleIdentifier',IOS_BUNDLE_ID],['CFBundleVersion',build],['CFBundleShortVersionString',version],['MinimumOSVersion','16.4'],['DTSDKName',`iphoneos${requiredSdk}`]]) {
      if (plist(info,key) !== expected) throw Error(`Archive ${key} mismatch.`);
    }
    result.archiveSdk = plist(info,'DTSDKName');
    result.nativeArchiveVerified = true; save();
    const exported = join(work,'export');
    run('xcodebuild',['-exportArchive','-archivePath',archive,'-exportPath',exported,'-exportOptionsPlist',optionsPath,...auth],{log:'export.log'});
    const ipas = readdirSync(exported).filter(file=>file.endsWith('.ipa'));
    if (ipas.length!==1) throw Error('Expected one signed Matharia IPA.');
    const ipa = join(exported,ipas[0]);
    const checked = join(work,'verified-ipa');
    run('ditto',['-x','-k',ipa,checked]);
    const exportedApp = join(checked,'Payload/App.app');
    const ipaInfo = join(exportedApp,'Info.plist');
    for (const [key,expected] of [['CFBundleIdentifier',IOS_BUNDLE_ID],['CFBundleVersion',build],['CFBundleShortVersionString',version],['MinimumOSVersion','16.4'],['DTSDKName',`iphoneos${requiredSdk}`]]) {
      if (plist(ipaInfo,key) !== expected) throw Error(`Exported IPA ${key} mismatch.`);
    }
    result.signedIPASdk = plist(ipaInfo,'DTSDKName');
    run('codesign',['--verify','--strict',exportedApp],{log:'codesign.log'});
    result.signedIPAVerified = true; save();
    console.log('Verified the signed IPA. Uploading through Apple altool.');
    run('xcrun',['altool','--upload-app','-f',ipa,'-t','ios','--apiKey',signing.keyId,'--apiIssuer',signing.issuer],{
      log:'upload.log',env:{...process.env,API_PRIVATE_KEYS_DIR:work}
    });
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
      if (release.testerNotes) {
        try {
          if (typeof release.testerNotes !== 'string' || release.testerNotes.length > 4000 || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(release.testerLocale || 'en-GB')) throw Error('Invalid TestFlight review notes.');
          const locale = release.testerLocale || 'en-GB';
          const localizations = await apple(`/v1/builds/${result.appleBuildId}/betaBuildLocalizations?limit=200`);
          const existing = localizations.data?.find(row => row.attributes.locale === locale);
          const data = existing ? {type:'betaBuildLocalizations',id:existing.id,attributes:{whatsNew:release.testerNotes}} :
            {type:'betaBuildLocalizations',attributes:{locale,whatsNew:release.testerNotes},relationships:{build:{data:{type:'builds',id:result.appleBuildId}}}};
          await apple(existing ? `/v1/betaBuildLocalizations/${existing.id}` : '/v1/betaBuildLocalizations',
            {method:existing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});
          result.testerNotesUpdated = true;
        } catch (error) { result.testerNotesError = error.message; }
        save();
      }
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
