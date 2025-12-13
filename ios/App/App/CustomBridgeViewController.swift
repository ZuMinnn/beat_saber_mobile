import UIKit
import Capacitor
import WebKit

class CustomBridgeViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Configure WKWebView for camera access
        if let webView = self.webView {
            webView.configuration.allowsInlineMediaPlayback = true
            webView.configuration.mediaTypesRequiringUserActionForPlayback = []
            
            // Set UI delegate to handle camera permissions
            webView.uiDelegate = self
        }
    }
}

// MARK: - WKUIDelegate for Camera Permissions
extension CustomBridgeViewController: WKUIDelegate {
    
    /// Handle media capture permission requests (camera/microphone)
    @available(iOS 15.0, *)
    func webView(_ webView: WKWebView, 
                 requestMediaCapturePermissionFor origin: WKSecurityOrigin, 
                 initiatedByFrame frame: WKFrameInfo, 
                 type: WKMediaCaptureType, 
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        // Always grant camera permission for getUserMedia
        decisionHandler(.grant)
    }
    
    /// Handle device orientation permission (if needed)
    @available(iOS 15.0, *)
    func webView(_ webView: WKWebView,
                 requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }
}
