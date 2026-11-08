import UIKit
import Capacitor
import WebKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = GameViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        (window?.rootViewController as? GameViewController)?.resumeScreenOrientation()
    }

    func sceneWillResignActive(_ scene: UIScene) {
        (window?.rootViewController as? GameViewController)?.prepareOrientationForSystemHandoff()
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        (window?.rootViewController as? GameViewController)?.stopTrackingDeviceOrientation()
    }
}

final class GameViewController: CAPBridgeViewController {
    private var allowsLandscape = false
    private var handingOffToSystem = false
    private var tracksDeviceOrientation = false

    private var shouldHandOffInPortrait: Bool {
        handingOffToSystem && !UIDevice.current.orientation.isLandscape
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MathariaServicesPlugin())
        webView?.configuration.userContentController.add(GameHapticsHandler(), name: "haptics")
    }
    // Landscape adventures need a portrait interface for the turn-device guard.
    // The web stage remains hidden and paused there; it never plays in portrait.
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        allowsLandscape && !shouldHandOffInPortrait ? .allButUpsideDown : .portrait
    }
    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation { .portrait }
    override var shouldAutorotate: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { [] }
    @available(iOS 26.0, *)
    override var prefersInterfaceOrientationLocked: Bool {
        !allowsLandscape && !handingOffToSystem
            && viewIfLoaded?.window?.windowScene?.effectiveGeometry.interfaceOrientation == .portrait
    }
    override var prefersStatusBarHidden: Bool { true }

    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
        let current = view.bounds.size
        // Hide the old WebKit frame while UIKit changes between portrait and landscape.
        // The web orientation guard takes over when the new viewport is available.
        if (current.width > current.height) != (size.width > size.height) {
            let cover = UIView(frame: view.bounds)
            cover.backgroundColor = UIColor(red: 7.0 / 255, green: 22.0 / 255, blue: 37.0 / 255, alpha: 1)
            cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            view.addSubview(cover)
            if !coordinator.animate(alongsideTransition: nil, completion: { [weak self] _ in
                cover.removeFromSuperview()
                self?.applyScreenOrientation()
            }) {
                cover.removeFromSuperview()
            }
        }
        super.viewWillTransition(to: size, with: coordinator)
    }

    func setScreenOrientation(_ orientation: String) {
        allowsLandscape = orientation == "landscape"
        applyScreenOrientation()
    }

    func resumeScreenOrientation() {
        handingOffToSystem = false
        if !tracksDeviceOrientation {
            tracksDeviceOrientation = true
            NotificationCenter.default.addObserver(
                self, selector: #selector(deviceOrientationDidChange),
                name: UIDevice.orientationDidChangeNotification, object: nil
            )
            UIDevice.current.beginGeneratingDeviceOrientationNotifications()
        }
        applyScreenOrientation()
    }

    func prepareOrientationForSystemHandoff() {
        // The App Switcher can appear while this scene is still foreground-inactive.
        handingOffToSystem = true
        applyScreenOrientation()
    }

    func stopTrackingDeviceOrientation() {
        guard tracksDeviceOrientation else { return }
        tracksDeviceOrientation = false
        NotificationCenter.default.removeObserver(self, name: UIDevice.orientationDidChangeNotification, object: nil)
        UIDevice.current.endGeneratingDeviceOrientationNotifications()
    }

    @objc private func deviceOrientationDidChange(_ notification: Notification) {
        if allowsLandscape || handingOffToSystem { applyScreenOrientation() }
    }

    private func applyScreenOrientation() {
        guard let windowScene = viewIfLoaded?.window?.windowScene,
              windowScene.activationState == .foregroundActive
                || windowScene.activationState == .foregroundInactive else { return }
        if #available(iOS 26.0, *) { setNeedsUpdateOfPrefersInterfaceOrientationLocked() }
        setNeedsUpdateOfSupportedInterfaceOrientations()

        // UIKit owns sideways rotation. Only request an upright correction when needed.
        guard !allowsLandscape || shouldHandOffInPortrait || UIDevice.current.orientation == .portrait else { return }
        let current: UIInterfaceOrientation
        if #available(iOS 26.0, *) { current = windowScene.effectiveGeometry.interfaceOrientation }
        else { current = windowScene.interfaceOrientation }
        guard current != .portrait else { return }

        windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait)) { _ in
            // The web rotation guard remains available for a constrained iPad window.
            NSLog("Matharia: screen orientation request could not resize the window")
        }
    }
}

/// Matches the existing web haptic intents. UIKit ignores unsupported hardware.
private final class GameHapticsHandler: NSObject, WKScriptMessageHandler {
    private var lastTap = Date.distantPast
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let payload = message.body as? [String: Any],
              payload["type"] as? String == "haptic",
              let intent = payload["intent"] as? String else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            switch intent {
            case "success", "warning", "error":
                let generator = UINotificationFeedbackGenerator()
                generator.prepare()
                generator.notificationOccurred(intent == "success" ? .success : intent == "warning" ? .warning : .error)
            case "selection":
                let generator = UISelectionFeedbackGenerator()
                generator.prepare(); generator.selectionChanged()
            case "tap", "light", "medium", "heavy":
                guard Date().timeIntervalSince(self.lastTap) >= 0.06 else { return }
                self.lastTap = Date()
                let generator = UIImpactFeedbackGenerator(style: intent == "heavy" ? .heavy : intent == "medium" ? .medium : .light)
                generator.prepare(); generator.impactOccurred()
            default: break
            }
        }
    }
}
