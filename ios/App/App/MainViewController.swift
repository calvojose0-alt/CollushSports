import UIKit
import Capacitor
import SignInWithApple

/// Subclass of CAPBridgeViewController that explicitly registers the
/// Sign in with Apple plugin so it is guaranteed to be available on the
/// Capacitor bridge regardless of auto-discovery behaviour.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        // Explicitly register the plugin — bypasses auto-discovery which can
        // silently fail for SPM-linked static library targets on Capacitor 8.
        bridge?.registerPluginInstance(SignInWithApple())
    }
}
