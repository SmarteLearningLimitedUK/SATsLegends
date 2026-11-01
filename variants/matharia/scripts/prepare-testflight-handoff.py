"""Package the synced local reskin for native compilation on a Mac runner.

The JavaScript is the already built/checked bundle; Xcode compiles the actual
native project. This does not claim a clean-source npm rebuild on CI.
"""
from pathlib import Path, PurePosixPath
from zipfile import ZipFile, ZIP_DEFLATED
import argparse
import hashlib
import json
import posixpath
import plistlib
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--tag', required=True)
args = parser.parse_args()
if not re.fullmatch(r'matharia-ci-[a-zA-Z0-9-]+', args.tag):
    raise SystemExit('Use a matharia-ci- prefixed candidate tag.')
root = Path(__file__).resolve().parents[3]
out = root / 'qa-artifacts/testflight'
out.mkdir(parents=True, exist_ok=True)
native = root / 'variants/matharia/native/ios'
plugin = root / 'node_modules/@capacitor/app'
web = native / 'App/App/public'
dist = root / 'dist-matharia'
bundle = 'com.smartelearning.satslegends'
pbx = (native / 'App/App.xcodeproj/project.pbxproj').read_text()
spm = (native / 'App/CapApp-SPM/Package.swift').read_text()
assert re.findall(r'IPHONEOS_DEPLOYMENT_TARGET = ([^;]+);', pbx) == ['16.4'] * 4
assert re.findall(r'PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);', pbx) == [bundle] * 2
assert '.iOS("16.4")' in spm
assert plistlib.loads((native / 'App/App/Info.plist').read_bytes()).get('ITSAppUsesNonExemptEncryption') is False, 'Record the reviewed encryption exemption in the native app.'
native_config = json.loads((native / 'App/App/capacitor.config.json').read_text())
assert native_config['appId'] == bundle
assert not native_config.get('server', {}).get('url'), 'Package must use bundled web assets.'
start_path = native_config.get('server', {}).get('appStartPath')
if start_path:
    assert (web / start_path.lstrip('/')).is_file(), 'Native appStartPath must name an existing bundled file, not a React route.'
plugin_relative = re.search(r'\.package\(name: "CapacitorApp", path: "([^"]+)"\)', spm).group(1)
assert posixpath.normpath(str(PurePosixPath('variants/matharia/native/ios/App/CapApp-SPM') / plugin_relative)) == 'node_modules/@capacitor/app'

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

web_hashes = {}
for path in sorted(dist.rglob('*')):
    if not path.is_file():
        continue
    relative = path.relative_to(dist).as_posix()
    assert (web / relative).is_file(), relative
    file_hash = digest(path)
    assert file_hash == digest(web / relative), relative
    web_hashes[relative] = file_hash
assert 'index.html' in web_hashes and len(web_hashes) > 500
source_head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
candidate = {'schema': 1, 'app': 'Matharia', 'bundleId': bundle, 'minimumIOS': '16.4',
             'sourceGitHead': source_head, 'workingTreeSnapshot': True,
             'sourceScope': 'Native source, local Swift plugin, and compiled web snapshot; not a clean npm source rebuild.',
             'webFiles': web_hashes, 'nativeProjectSha256': digest(native / 'App/App.xcodeproj/project.pbxproj')}
readme = f'''MATHARIA — EXISTING SATs LEGENDS TESTFLIGHT CANDIDATE

Unsigned native source and the exact compiled web bundle from the working checkout.
This is not an IPA or proof of upload.

Display name: Matharia
Upload bundle ID: {bundle}
App Store Connect app: 6825120444 (verified again by the upload job)
Minimum iOS/iPadOS: 16.4
Source checkout HEAD: {source_head}; includes the current uncommitted reskin snapshot.

GitHub workflow: .github/workflows/ios-testflight.yml.
Native simulator checks precede the existing protected ios-testflight environment.
The upload job reads the current Apple record/builds, chooses the next build number,
compiles/archives with Xcode 26+, then uses the existing automatic-signing method.
Export is internal TestFlight only. It does not submit a public App Store release.

For a manual Mac build, extract all folders and open
variants/matharia/native/ios/App/App.xcodeproj. Retain node_modules/@capacitor/app
in its included relative location. Resolve remote Capacitor through Swift PM.
Select the existing Apple team and an unused version/build before archiving.

This package contains prebuilt web files, not a full frontend development checkout.
Do not run npm ci or Capacitor sync here. Change source in the original checkout,
build/sync it, and create a new candidate. Native iOS compilation/launch and Apple
processing are established only by the workflow's resulting evidence.

No credentials, signing keys, profiles or environment files are included.
No external legacy assumptions were used.
'''
(out / 'MAC-HANDOFF.txt').write_text(readme, encoding='utf-8')
entries = []
for folder in (native, plugin):
    for path in sorted(folder.rglob('*')):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if set(relative.parts).intersection({'xcuserdata', 'DerivedData', 'build', '.git', '.build', '__pycache__'}):
            continue
        if path.name.startswith('.env') or path.suffix.lower() in {'.p8', '.p12', '.mobileprovision', '.pem', '.key'}:
            continue
        entries.append((path, relative.as_posix()))
assert any(name == 'node_modules/@capacitor/app/Package.swift' for _, name in entries)
zip_path = out / 'matharia-mac-testflight-candidate.zip'
with ZipFile(zip_path, 'w', ZIP_DEFLATED, compresslevel=1, allowZip64=True) as archive:
    for path, name in entries:
        archive.write(path, name)
    archive.writestr('MAC-HANDOFF.txt', readme)
    archive.writestr('MATHARIA-CANDIDATE.json', json.dumps(candidate, indent=2))
with ZipFile(zip_path) as archive:
    assert archive.testzip() is None
release = {'tag': args.tag, 'asset': zip_path.name, 'sha256': digest(zip_path),
           'bundleId': bundle, 'minimumIOS': '16.4', 'sourceGitHead': source_head}
release_path = root / 'variants/matharia/release/candidate.json'
release_path.parent.mkdir(parents=True, exist_ok=True)
release_path.write_text(json.dumps(release, indent=2) + '\n', encoding='utf-8')
manifest = {'status': 'Prepared unsigned candidate; native build and upload pending',
            'app': 'Matharia', 'bundleId': bundle, 'destinationChoiceConfirmed': True,
            'appStoreConnectRecordVerified': False, 'minimumIOS': '16.4',
            'versionAndBuild': 'Selected from live Apple record by protected CI upload job',
            'archive': zip_path.relative_to(root).as_posix(), 'archiveBytes': zip_path.stat().st_size,
            'archiveSha256': release['sha256'], 'files': len(entries) + 2,
            'webFilesHashVerified': len(web_hashes), 'localSwiftPackagePathVerified': True,
            'zipCRCVerified': True, 'secretsAndProfilesIncluded': False,
            'sourceGitHead': source_head, 'workingTreeSnapshot': True,
            'githubAccessVerified': True, 'protectedEnvironment': 'ios-testflight',
            'noExternalLegacyAssumptions': True}
(out / 'upload-readiness.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: manifest[key] for key in ['status', 'archiveBytes', 'files', 'webFilesHashVerified', 'archiveSha256']}))
