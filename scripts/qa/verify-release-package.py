"""Check generated app resources and native metadata without requiring Xcode."""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import hashlib
import json
import plistlib
import re
from PIL import Image

root = Path(__file__).resolve().parents[2]
out = root / 'qa-artifacts/release-readiness-2026-11-04'
dist = root / 'dist-matharia'
assert dist.is_dir()
files = [p for p in dist.rglob('*') if p.is_file()]
paths = {p.relative_to(dist).as_posix() for p in files}
missing = []
for file in files:
    if file.suffix not in {'.js', '.css', '.html', '.json', '.svg'}:
        continue
    text = file.read_text(encoding='utf-8')
    # Vite-generated root-absolute resource URLs, including lookup maps and SVG hrefs.
    for match in re.finditer(r'''["'(](/(?:assets|reference-assets)/[^"'()\s<>]+)''', text):
        value = unquote(urlsplit(match.group(1)).path).lstrip('/')
        if value not in paths:
            missing.append({'from': file.relative_to(dist).as_posix(), 'url': value})
assert not missing, missing
native = root / 'variants/matharia/native/ios/App'
info = plistlib.loads((native / 'App/Info.plist').read_bytes())
privacy = plistlib.loads((native / 'App/PrivacyInfo.xcprivacy').read_bytes())
project = (native / 'App.xcodeproj/project.pbxproj').read_text(encoding='utf-8')
assert project.count('path = PrivacyInfo.xcprivacy;') == 1
assert 'PrivacyInfo.xcprivacy in Resources' in project
assert set(re.findall(r'IPHONEOS_DEPLOYMENT_TARGET = ([^;]+);', project)) == {'16.4'}
assert set(re.findall(r'PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);', project)) == {'com.smartelearning.satslegends'}
assert privacy['NSPrivacyTracking'] is False
assert {r['NSPrivacyCollectedDataType'] for r in privacy['NSPrivacyCollectedDataTypes']} == {'NSPrivacyCollectedDataTypeEmailAddress', 'NSPrivacyCollectedDataTypeUserID'}
assert len(info['UISupportedInterfaceOrientations']) == 3
icon = native / 'App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
with Image.open(icon) as image:
    assert image.size == (1024, 1024) and image.mode == 'RGB'
exclusions = json.loads((out / 'asset-exclusions.json').read_text(encoding='utf-8'))
retained_sources = []
for item in exclusions['excluded']:
    assert item['file'] not in paths
    sources = item['sourceFiles'] or ['../../public/' + item['file']]
    for source in sources:
        original = (root / 'variants/matharia' / source).resolve()
        assert original.is_relative_to(root) and original.is_file(), (item['file'], source)
        retained_sources.append({'output': item['file'], 'source': original.relative_to(root).as_posix(), 'sha256': hashlib.sha256(original.read_bytes()).hexdigest()})
baseline = json.loads((out / 'baseline-output.json').read_text(encoding='utf-8'))
manifest = {p.relative_to(dist).as_posix(): {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}
total = sum(f['bytes'] for f in manifest.values())
result = {'measurement': 'Uncompressed generated web output; not IPA or upload size', 'files': len(files), 'bytes': total, 'missingStaticAssets': missing, 'nativeMetadataChecksPassed': True, 'nativeCompilationVerified': False, 'retainedSources': retained_sources, 'filesManifest': manifest}
(out / 'final-output.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({'files': len(files), 'bytes': total, 'staticAssetReferencesValid': True, 'retainedExcludedSourceFiles': len(retained_sources), 'nativeMetadataChecksPassed': True}))
