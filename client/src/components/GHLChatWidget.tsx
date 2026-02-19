import { useEffect } from "react";
import { GHL_CHAT_WIDGET_ID } from "@/lib/constants";

/**
 * Go High Level Chat Widget
 * SMS/Email chat widget for real-time customer communication
 */
export default function GHLChatWidget() {
  useEffect(() => {
    // Load GHL chat widget script
    const script = document.createElement("script");
    script.src = "https://widgets.leadconnectorhq.com/loader.js";
    script.setAttribute("data-resources-url", "https://widgets.leadconnectorhq.com/chat-widget/loader.js");
    script.async = true;
    document.body.appendChild(script);

    // Initialize chat widget after script loads
    script.onload = () => {
      if (window.leadConnector) {
        window.leadConnector.initialize({
          widgetId: GHL_CHAT_WIDGET_ID,
        });
      }
    };

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null; // Chat widget renders itself via the script
}

// TypeScript declaration for window.leadConnector
declare global {
  interface Window {
    leadConnector?: {
      initialize: (config: { widgetId: string }) => void;
    };
  }
}
