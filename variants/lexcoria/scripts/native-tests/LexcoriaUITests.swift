import XCTest
import UIKit

final class LexcoriaUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.smartelearning.lexcoria")

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
    }

    override func tearDown() {
        app.terminate()
        XCUIDevice.shared.orientation = .portrait
        super.tearDown()
    }

    private func button(_ label: String) -> XCUIElement {
        app.webViews.buttons[label].firstMatch
    }

    private func require(_ element: XCUIElement, hittable: Bool = false, timeout: TimeInterval = 30) {
        let visible = NSPredicate { _, _ in element.exists && (!hittable || element.isHittable) }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: visible, object: nil)], timeout: timeout), .completed,
                       "Required element did not become available: \(element.debugDescription)")
    }

    private func requireLandscape(_ landscape: Bool) {
        let visible = NSPredicate { [self] _, _ in
            let frame = app.windows.firstMatch.frame
            return landscape ? frame.width > frame.height : frame.height > frame.width
        }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: visible, object: nil)], timeout: 15), .completed,
                       "Expected a \(landscape ? "landscape" : "portrait") window")
    }

    private func openWelcome() {
        let start = button("Start adventure")
        let skip = button("Skip intro")
        let ready = NSPredicate { _, _ in skip.isHittable || start.isHittable }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: ready, object: nil)], timeout: 40), .completed,
                       "App did not reach the intro or welcome screen")
        if skip.isHittable { skip.tap() }
        require(start, hittable: true)
    }

    func testColdLaunch() {
        app.launch()
        require(app.webViews.firstMatch)
        openWelcome()
        requireLandscape(false)
    }

    func testLandscapeRotationAndResume() {
        app.launchArguments = ["--lexcoria-qa-save"]
        app.launchEnvironment = ["LEXCORIA_QA_ROUTE": "/game/1/3"]
        app.launch()
        let prompt = app.webViews.staticTexts["Turn your device sideways"].firstMatch
        let tips = button("Tips: how to play")
        require(prompt, hittable: true)
        requireLandscape(false)
        XCTAssertFalse(tips.isHittable)

        XCUIDevice.shared.orientation = .landscapeLeft
        requireLandscape(true)
        let briefing = button("Close practice briefing")
        let playable = NSPredicate { _, _ in briefing.isHittable || tips.isHittable }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: playable, object: nil)], timeout: 25), .completed)
        if briefing.isHittable { briefing.tap() }
        require(tips, hittable: true)
        XCTAssertFalse(prompt.isHittable)

        XCUIDevice.shared.orientation = .portrait
        requireLandscape(false)
        require(prompt, hittable: true)
        XCTAssertFalse(tips.isHittable)

        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 10))
        app.activate()
        require(prompt, hittable: true)
        XCUIDevice.shared.orientation = .landscapeRight
        requireLandscape(true)
        require(tips, hittable: true)
        XCTAssertFalse(prompt.isHittable)
    }

    func testSavedProgressSurvivesRelaunch() {
        // Import the existing save format once. The second launch has no QA input.
        app.launchArguments = ["--lexcoria-qa-save"]
        app.launch()
        checkSavedMission()
        app.terminate()
        app.launchArguments = []
        app.launch()
        checkSavedMission()
    }

    private func checkSavedMission() {
        openWelcome()
        button("Start adventure").tap()
        let explore = button("Explore Island")
        require(explore, hittable: true)
        explore.tap()
        let grammar = app.webViews.buttons["Grammar Gauntlet"].firstMatch
        if grammar.isHittable { grammar.tap() }
        require(app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Complete Level 1, 2 of 3 brainpower")).firstMatch)
    }
}
