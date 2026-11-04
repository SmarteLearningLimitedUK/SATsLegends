"""Instrument only an extracted, unsigned simulator copy; never the release project."""
import argparse
import json
from pathlib import Path
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('candidate', type=Path)
parser.add_argument('--scope', choices=['smoke', 'games', 'all-tiers'], default='games')
args = parser.parse_args()
templates = Path(__file__).resolve().parent
root = args.candidate.resolve()
assert (root / 'MATHARIA-CANDIDATE.json').is_file(), 'Only instrument an extracted candidate.'
project = root / 'variants/matharia/native/ios/App'
pbx_path = project / 'App.xcodeproj/project.pbxproj'
pbx = pbx_path.read_text()
assert 'MathariaUITests' not in pbx, 'Test project already prepared.'
tests = project / 'MathariaUITests'
tests.mkdir()

catalogue = json.loads((templates / 'catalogue.json').read_text())
if args.scope == 'smoke':
    selected = [x for x in catalogue if x['key'] in ['number_line_ninja', 'prime_pop', 'angle_arena'] and x['tier'] == 1 and not x['practice']]
else:
    selected = [x for x in catalogue if not x['practice'] and (args.scope == 'all-tiers' or x.get('tier') in [1, 5] or x['boss'])]
assert selected, 'No catalogue cases selected.'
source = (templates / 'MathariaUITests.swift').read_text()
methods = '\n'.join(f'    func testGame_{i:03d}_{x["key"]}() throws {{ try exercise(route: "{x["route"]}", title: {json.dumps(x["title"], ensure_ascii=False)}, orientation: "{x["orientation"]}") }}' for i, x in enumerate(selected))
if args.scope != 'smoke':
    calm = [('breathing_bloom', 'Breath Bloom', 'portrait'), ('peaceful_pond', 'Peaceful Pond', 'landscape'),
            ('candle_calm', 'Lantern Camp', 'portrait'), ('constellation_connect', 'Star Path', 'portrait'),
            ('leaf_drift', 'Leaf Drift', 'portrait'), ('thought_sort', 'Thought Release', 'portrait')]
    methods += '\n' + '\n'.join(f'    func testCalm_{key}() {{ exerciseCalm(title: "{title}", orientation: "{orientation}") }}' for key, title, orientation in calm)
(tests / 'MathariaUITests.swift').write_text(source.replace('// GENERATED_GAME_TESTS', methods))
(root / 'selected-native-cases.json').write_text(json.dumps(selected, indent=2))

# A local Xcode StoreKit environment, never an App Store transaction or entitlement bypass.
products = json.loads((root / 'variants/matharia/release/subscriptions.json').read_text())
store = {'identifier': 'MathariaSimulatorOnly', 'nonRenewingSubscriptions': [], 'products': [],
    'settings': {'_applicationInternalID': products['appId'], '_developerTeamID': 'D8L3PZ8Y72',
                 '_failTransactionsEnabled': False, '_locale': 'en_GB', '_storefront': 'GBR'},
    'subscriptionGroups': [{'id': 'MathariaLocalGroup', 'name': 'Matharia Full Access', 'localizations': [],
        'subscriptions': [{'adHocOffers': [], 'codeOffers': [], 'displayPrice': p['approvedBasePrice'],
            'familyShareable': False, 'groupNumber': 1, 'internalID': p['appleId'], 'introductoryOffer': None,
            'localizations': [{'description': 'Local simulator testing only', 'displayName': 'Full access', 'locale': 'en_GB'}],
            'productID': p['id'], 'recurringSubscriptionPeriod': 'P1M' if p['period'] == 'ONE_MONTH' else 'P1Y',
            'referenceName': p['period'], 'subscriptionGroupID': 'MathariaLocalGroup', 'type': 'RecurringSubscription'}
            for p in products['products']]}], 'version': {'major': 3, 'minor': 0}}
(tests / 'Matharia.storekit').write_text(json.dumps(store, indent=2))

# Fixture only supplies an isolated local learner and initial route. The real native
# StoreKit plugin still decides access. This code never enters a production archive.
scene = project / 'App/SceneDelegate.swift'
swift = scene.read_text()
anchor = 'bridge?.registerPluginInstance(MathariaServicesPlugin())'
assert swift.count(anchor) == 1
fixture = '''
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--matharia-native-ui-test"),
           let route = ProcessInfo.processInfo.environment["MATHARIA_QA_ROUTE"],
           route.range(of: "^/(play|wellbeing|island/[0-9]+|game/[0-9]+/[0-9]+)$", options: .regularExpression) != nil,
           let data = try? JSONSerialization.data(withJSONObject: [route]),
           let routeJSON = String(data: data, encoding: .utf8) {
            let script = """
            if(location.protocol==='capacitor:'){
              if(!localStorage.getItem('matharia-ios-player-v1'))localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Simulator QA',avatarId:'barratt',level:100,xp:0,unlockedIslands:[1,2,3,4,5,6,7,8]}));
              localStorage.setItem('sats_mastery_muted','true');
              localStorage.setItem('sats_mastery_music_enabled','false');
              history.replaceState(null,'',\\(routeJSON)[0]);
            }
            """
            webView?.configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        #endif
'''
scene.write_text(swift.replace(anchor, anchor + fixture))

def uid(n):
    return f'B46A1105{n:016X}'

def section(kind, entries):
    global pbx
    marker = f'/* End {kind} section */'
    text = '\n'.join(f'\t\t{uid(n)} = {{ {body} }};' for n, body in entries) + '\n'
    if marker in pbx:
        pbx = pbx.replace(marker, text + marker)
    else:
        pbx = pbx.replace('\tobjects = {', '\tobjects = {\n' + text, 1)

section('PBXBuildFile', [(1, f'isa = PBXBuildFile; fileRef = {uid(2)};'), (3, f'isa = PBXBuildFile; fileRef = {uid(4)};'), (5, f'isa = PBXBuildFile; fileRef = {uid(4)};')])
section('PBXFileReference', [(2, 'isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = MathariaUITests.swift; sourceTree = "<group>";'),
    (4, 'isa = PBXFileReference; lastKnownFileType = text; path = Matharia.storekit; sourceTree = "<group>";'),
    (6, 'isa = PBXFileReference; explicitFileType = wrapper.cfbundle; path = MathariaUITests.xctest; sourceTree = BUILT_PRODUCTS_DIR;')])
section('PBXGroup', [(7, f'isa = PBXGroup; children = ({uid(2)}, {uid(4)},); path = MathariaUITests; sourceTree = "<group>";')])
pbx = pbx.replace('504EC3051FED79650016851F /* Products */,', f'504EC3051FED79650016851F /* Products */,\n\t\t\t\t{uid(7)},', 1)
pbx = pbx.replace('504EC3041FED79650016851F /* App.app */,', f'504EC3041FED79650016851F /* App.app */,\n\t\t\t\t{uid(6)},', 1)
section('PBXSourcesBuildPhase', [(8, f'isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = ({uid(1)},); runOnlyForDeploymentPostprocessing = 0;')])
section('PBXResourcesBuildPhase', [(9, f'isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = ({uid(3)},); runOnlyForDeploymentPostprocessing = 0;')])
pbx = pbx.replace('B46A11040000000000000001 /* PrivacyInfo.xcprivacy in Resources */,', f'B46A11040000000000000001 /* PrivacyInfo.xcprivacy in Resources */,\n\t\t\t\t{uid(5)},', 1)
section('PBXFrameworksBuildPhase', [(10, 'isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;')])
section('PBXContainerItemProxy', [(11, 'isa = PBXContainerItemProxy; containerPortal = 504EC2FC1FED79650016851F; proxyType = 1; remoteGlobalIDString = 504EC3031FED79650016851F; remoteInfo = App;')])
section('PBXTargetDependency', [(12, f'isa = PBXTargetDependency; target = 504EC3031FED79650016851F; targetProxy = {uid(11)};')])
settings = 'CODE_SIGNING_ALLOWED = YES; CODE_SIGN_IDENTITY = "-"; CODE_SIGN_STYLE = Manual; GENERATE_INFOPLIST_FILE = YES; IPHONEOS_DEPLOYMENT_TARGET = 16.4; PRODUCT_BUNDLE_IDENTIFIER = com.smartelearning.satslegends.uitests; PRODUCT_NAME = "$(TARGET_NAME)"; SWIFT_VERSION = 5.0; TARGETED_DEVICE_FAMILY = "1,2"; TEST_TARGET_NAME = App; LD_RUNPATH_SEARCH_PATHS = ("$(inherited)", "@executable_path/Frameworks", "@loader_path/Frameworks",);'
section('XCBuildConfiguration', [(13, f'isa = XCBuildConfiguration; buildSettings = {{ {settings} }}; name = Debug;'), (14, f'isa = XCBuildConfiguration; buildSettings = {{ {settings} }}; name = Release;')])
section('XCConfigurationList', [(15, f'isa = XCConfigurationList; buildConfigurations = ({uid(13)}, {uid(14)},); defaultConfigurationIsVisible = 0; defaultConfigurationName = Debug;')])
section('PBXNativeTarget', [(16, f'isa = PBXNativeTarget; buildConfigurationList = {uid(15)}; buildPhases = ({uid(8)}, {uid(10)}, {uid(9)},); buildRules = (); dependencies = ({uid(12)},); name = MathariaUITests; productName = MathariaUITests; productReference = {uid(6)}; productType = "com.apple.product-type.bundle.ui-testing";')])
pbx = pbx.replace('targets = (\n\t\t\t\t504EC3031FED79650016851F /* App */,', f'targets = (\n\t\t\t\t504EC3031FED79650016851F /* App */,\n\t\t\t\t{uid(16)},', 1)
pbx = pbx.replace('TargetAttributes = {', f'TargetAttributes = {{\n\t\t\t\t\t{uid(16)} = {{CreatedOnToolsVersion = 26.0; TestTargetID = 504EC3031FED79650016851F; }};', 1)
assert pbx.count('com.apple.product-type.bundle.ui-testing') == 1
pbx_path.write_text(pbx)

scheme = ET.Element('Scheme', LastUpgradeVersion='2600', version='1.3')
build = ET.SubElement(scheme, 'BuildAction', parallelizeBuildables='NO', buildImplicitDependencies='YES')
entries = ET.SubElement(build, 'BuildActionEntries')
def reference(parent, identifier, name, product):
    ET.SubElement(parent, 'BuildableReference', BuildableIdentifier='primary', BlueprintIdentifier=identifier, BuildableName=product, BlueprintName=name, ReferencedContainer='container:App.xcodeproj')
for identifier, name, product in [('504EC3031FED79650016851F', 'App', 'App.app'), (uid(16), 'MathariaUITests', 'MathariaUITests.xctest')]:
    entry = ET.SubElement(entries, 'BuildActionEntry', buildForTesting='YES', buildForRunning='NO', buildForProfiling='NO', buildForArchiving='NO', buildForAnalyzing='NO')
    reference(entry, identifier, name, product)
test = ET.SubElement(scheme, 'TestAction', buildConfiguration='Debug', selectedDebuggerIdentifier='Xcode.DebuggerFoundation.Debugger.LLDB', selectedLauncherIdentifier='Xcode.IDEFoundation.Launcher.LLDB', shouldUseLaunchSchemeArgsEnv='YES')
testables = ET.SubElement(test, 'Testables')
testable = ET.SubElement(testables, 'TestableReference', skipped='NO', parallelizable='NO')
reference(testable, uid(16), 'MathariaUITests', 'MathariaUITests.xctest')
macro = ET.SubElement(test, 'MacroExpansion')
reference(macro, '504EC3031FED79650016851F', 'App', 'App.app')
launch = ET.SubElement(scheme, 'LaunchAction', buildConfiguration='Debug', selectedDebuggerIdentifier='Xcode.DebuggerFoundation.Debugger.LLDB', selectedLauncherIdentifier='Xcode.IDEFoundation.Launcher.LLDB', launchStyle='0', useCustomWorkingDirectory='NO', ignoresPersistentStateOnLaunch='NO', debugDocumentVersioning='YES', debugServiceExtension='internal', allowLocationSimulation='YES')
runnable = ET.SubElement(launch, 'BuildableProductRunnable', runnableDebuggingMode='0')
reference(runnable, '504EC3031FED79650016851F', 'App', 'App.app')
ET.SubElement(launch, 'StoreKitConfigurationFileReference', identifier='../../MathariaUITests/Matharia.storekit')
scheme_dir = project / 'App.xcodeproj/xcshareddata/xcschemes'
scheme_dir.mkdir(parents=True, exist_ok=True)
ET.indent(scheme)
ET.ElementTree(scheme).write(scheme_dir / 'MathariaDeviceQA.xcscheme', encoding='utf-8', xml_declaration=True)
print(json.dumps({'scope': args.scope, 'gameCases': len(selected), 'instrumentedCopy': str(project)}))
