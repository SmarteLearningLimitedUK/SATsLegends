"""Add native UI tests to the disposable simulator copy of the Lexcoria project."""

from pathlib import Path
from shutil import copyfile
import sys
import xml.etree.ElementTree as ET


project = Path(sys.argv[1]).resolve()
xcode = project / 'App.xcodeproj'
pbx_path = xcode / 'project.pbxproj'
pbx = pbx_path.read_text(encoding='utf-8')
assert 'PRODUCT_BUNDLE_IDENTIFIER = com.smartelearning.lexcoria;' in pbx
assert 'LexcoriaUITests' not in pbx

tests = project / 'LexcoriaUITests'
tests.mkdir()
copyfile(Path(__file__).with_name('LexcoriaUITests.swift'), tests / 'LexcoriaUITests.swift')

# The Release archive uses a separate, unmodified copy of the candidate.
scene = project / 'App/SceneDelegate.swift'
swift = scene.read_text(encoding='utf-8')
anchor = 'bridge?.registerPluginInstance(LexcoriaDevicePlugin())'
assert swift.count(anchor) == 1
fixture = '''
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--lexcoria-qa-save") {
            let script = """
            if (location.protocol === 'capacitor:') {
              localStorage.setItem('lexcoria-ios-player-v1', JSON.stringify({playerName: 'Lexcoria QA', avatarId: 'barratt',
                level: 1, xp: 40, unlockedIslands: [1], levelStars: {'1-7': 2}, completedLevels: {'1': [7]}}));
              localStorage.setItem('lexcoria-ios-progression-v1', JSON.stringify({version: 3, state: {
                player: {avatarId: 'barratt', level: 1, currentXp: 40, totalXpEarned: 40}, totalStars: 2,
                levels: {'1-7': {levelId: '1-7', unlocked: true, completed: true, bestStars: 2, bestScore: 5,
                  bestAccuracy: 0.8, bestTimeMs: null, timesPlayed: 1, firstClearXpAwarded: true}}
              }}));
            }
            """
            let seed = WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            webView?.configuration.userContentController.addUserScript(seed)
        }
        #endif
'''
scene.write_text(swift.replace(anchor, anchor + fixture), encoding='utf-8')

app = '504EC3031FED79650016851F'
project_id = '504EC2FC1FED79650016851F'


def uid(number):
    return f'B46A1170{number:016X}'


def insert(anchor, replacement):
    global pbx
    assert pbx.count(anchor) == 1, f'Unexpected project structure near {anchor}'
    pbx = pbx.replace(anchor, replacement, 1)


def add(number, kind, content):
    anchor = '\tobjects = {'
    insert(anchor, f'{anchor}\n\t\t{uid(number)} = {{ isa = {kind}; {content} }};')


add(1, 'PBXFileReference', 'lastKnownFileType = sourcecode.swift; path = LexcoriaUITests.swift; sourceTree = "<group>";')
add(2, 'PBXBuildFile', f'fileRef = {uid(1)};')
add(3, 'PBXFileReference', 'explicitFileType = wrapper.cfbundle; path = LexcoriaUITests.xctest; sourceTree = BUILT_PRODUCTS_DIR;')
add(4, 'PBXGroup', f'children = ({uid(1)},); path = LexcoriaUITests; sourceTree = "<group>";')
add(5, 'PBXSourcesBuildPhase', f'buildActionMask = 2147483647; files = ({uid(2)},); runOnlyForDeploymentPostprocessing = 0;')
add(6, 'PBXFrameworksBuildPhase', 'buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;')
add(7, 'PBXContainerItemProxy', f'containerPortal = {project_id}; proxyType = 1; remoteGlobalIDString = {app}; remoteInfo = App;')
add(8, 'PBXTargetDependency', f'target = {app}; targetProxy = {uid(7)};')
settings = ('CODE_SIGN_STYLE = Manual; GENERATE_INFOPLIST_FILE = YES; IPHONEOS_DEPLOYMENT_TARGET = 15.0; '
            'PRODUCT_BUNDLE_IDENTIFIER = com.smartelearning.lexcoria.uitests; PRODUCT_NAME = "$(TARGET_NAME)"; '
            'SWIFT_VERSION = 5.0; TARGETED_DEVICE_FAMILY = "1,2"; TEST_TARGET_NAME = App; '
            'LD_RUNPATH_SEARCH_PATHS = ("$(inherited)", "@executable_path/Frameworks", "@loader_path/Frameworks",);')
add(9, 'XCBuildConfiguration', f'buildSettings = {{ {settings} }}; name = Debug;')
add(10, 'XCConfigurationList', f'buildConfigurations = ({uid(9)},); defaultConfigurationIsVisible = 0; defaultConfigurationName = Debug;')
add(11, 'PBXNativeTarget', f'buildConfigurationList = {uid(10)}; buildPhases = ({uid(5)}, {uid(6)},); '
    f'buildRules = (); dependencies = ({uid(8)},); name = LexcoriaUITests; productName = LexcoriaUITests; '
    f'productReference = {uid(3)}; productType = "com.apple.product-type.bundle.ui-testing";')
for entry, number in [('504EC3051FED79650016851F /* Products */', 4), ('504EC3041FED79650016851F /* App.app */', 3), (f'{app} /* App */', 11)]:
    insert(entry + ',', f'{entry},\n\t\t\t\t{uid(number)},')
insert('TargetAttributes = {', f'TargetAttributes = {{\n\t\t\t\t\t{uid(11)} = {{ TestTargetID = {app}; }};')
pbx_path.write_text(pbx, encoding='utf-8')


def target(parent, identifier, name, product):
    ET.SubElement(parent, 'BuildableReference', BuildableIdentifier='primary', BlueprintIdentifier=identifier,
                  BuildableName=product, BlueprintName=name, ReferencedContainer='container:App.xcodeproj')


scheme = ET.Element('Scheme', version='1.7')
build = ET.SubElement(scheme, 'BuildAction', parallelizeBuildables='NO', buildImplicitDependencies='YES')
entries = ET.SubElement(build, 'BuildActionEntries')
for item in [(app, 'App', 'App.app'), (uid(11), 'LexcoriaUITests', 'LexcoriaUITests.xctest')]:
    entry = ET.SubElement(entries, 'BuildActionEntry', buildForTesting='YES', buildForRunning='NO',
                          buildForProfiling='NO', buildForArchiving='NO', buildForAnalyzing='NO')
    target(entry, *item)
test = ET.SubElement(scheme, 'TestAction', buildConfiguration='Debug',
                     selectedDebuggerIdentifier='Xcode.DebuggerFoundation.Debugger.LLDB',
                     selectedLauncherIdentifier='Xcode.IDEFoundation.Launcher.LLDB', shouldUseLaunchSchemeArgsEnv='YES')
testables = ET.SubElement(test, 'Testables')
testable = ET.SubElement(testables, 'TestableReference', skipped='NO', parallelizable='NO')
target(testable, uid(11), 'LexcoriaUITests', 'LexcoriaUITests.xctest')
target(ET.SubElement(test, 'MacroExpansion'), app, 'App', 'App.app')
schemes = xcode / 'xcshareddata/xcschemes'
schemes.mkdir(parents=True, exist_ok=True)
ET.indent(scheme)
ET.ElementTree(scheme).write(schemes / 'LexcoriaNativeQA.xcscheme', encoding='utf-8', xml_declaration=True)
