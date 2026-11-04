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
}

final class GameViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MathariaServicesPlugin())
        webView?.configuration.userContentController.add(GameHapticsHandler(), name: "haptics")
    }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .all }
    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation { .portrait }
    override var prefersStatusBarHidden: Bool { true }
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
