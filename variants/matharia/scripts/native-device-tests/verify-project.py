"""Check test-only project generation without Xcode or touching the production project."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

repo = Path(__file__).resolve().parents[4]
templates = Path(__file__).resolve().parent
native = repo / 'variants/matharia/native/ios/App'
original = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in [native / 'App.xcodeproj/project.pbxproj', native / 'App/SceneDelegate.swift']}
catalogue = json.loads((templates / 'catalogue.json').read_text())
assert len(catalogue) == len({x['route'] for x in catalogue})
assert len({x['key'] for x in catalogue if not x['boss']}) == 35
scratch = repo / 'qa-artifacts/native-device-qa/harness'
scratch.mkdir(parents=True, exist_ok=True)
for scope in ['smoke', 'games', 'all-tiers']:
    with tempfile.TemporaryDirectory(prefix='project-', dir=scratch) as tmp:
        root = Path(tmp)
        (root / 'MATHARIA-CANDIDATE.json').write_text('{}')
        for relative in ['variants/matharia/native/ios/App/App.xcodeproj/project.pbxproj', 'variants/matharia/native/ios/App/App/SceneDelegate.swift', 'variants/matharia/release/subscriptions.json']:
            dst = root / relative
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes((repo / relative).read_bytes())
        subprocess.run(['python', str(templates / 'prepare-project.py'), str(root), '--scope', scope], check=True)
        generated = root / 'variants/matharia/native/ios/App'
        pbx = (generated / 'App.xcodeproj/project.pbxproj').read_text()
        definitions = re.findall(r'^\s*(B46A1105[A-F0-9]{16}) = \{ isa = ', pbx, re.M)
        assert len(definitions) == len(set(definitions)) == 16
        assert all(pbx.count(x) >= 2 for x in definitions), 'Dangling project object'
        scheme = ET.parse(generated / 'App.xcodeproj/xcshareddata/xcschemes/MathariaDeviceQA.xcscheme')
        assert scheme.find('.//TestableReference').get('parallelizable') == 'NO'
        assert scheme.find('.//TestAction').get('shouldUseLaunchSchemeArgsEnv') == 'YES'
        assert scheme.find('.//LaunchAction/StoreKitConfigurationFileReference') is not None
        assert 'CODE_SIGN_IDENTITY = "-"' in pbx, 'Simulator StoreKit needs a signed app identity, not an unsigned test runner'
        cases = json.loads((root / 'selected-native-cases.json').read_text())
        swift = (generated / 'MathariaUITests/MathariaUITests.swift').read_text()
        assert swift.count('func testGame_') == len(cases)
        assert swift.count('func testCalm_') == (0 if scope == 'smoke' else 6)
        assert 'GENERATED_GAME_TESTS' not in swift
        if scope == 'smoke': assert len(cases) == 3
        if scope == 'all-tiers': assert len(cases) == 178
        assert '#if DEBUG && targetEnvironment(simulator)' in (generated / 'App/SceneDelegate.swift').read_text()
        assert 'nativePromise' not in (generated / 'App/SceneDelegate.swift').read_text(), 'No native entitlement stub permitted'
        config = json.loads((generated / 'MathariaUITests/Matharia.storekit').read_text())
        assert len(config['subscriptionGroups'][0]['subscriptions']) == 2
assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest() == digest for p, digest in original.items())
print('PASS isolated project generation, catalogue, StoreKit IDs, and production files unchanged.')
