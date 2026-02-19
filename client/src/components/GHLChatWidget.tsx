import { useEffect } from "react";

/**
 * Go High Level Chat Widget
 * SMS/Email chat widget for real-time customer communication
 * 
 * IMPORTANT: To activate this widget:
 * 1. Log into Go High Level (app.360forbusiness.com)
 * 2. Go to Sites → Chat Widget
 * 3. Make sure the widget is Published/Active
 * 4. Copy the widget ID from the embed code
 * 5. Update GHL_CHAT_WIDGET_ID in constants.ts if needed
 */
export default function GHLChatWidget() {
  useEffect(() => {
    // Method 1: Direct script injection (most reliable)
    const script = document.createElement("script");
    script.innerHTML = `
      (function() {
        var script = document.createElement('script');
        script.src = 'https://widgets.leadconnectorhq.com/loader.js';
        script.setAttribute('data-resources-url', 'https://widgets.leadconnectorhq.com/chat-widget/loader.js');
        script.async = true;
        document.body.appendChild(script);
      })();
    `;
    document.body.appendChild(script);

    // Method 2: Alternative direct widget loader
    const widgetScript = document.createElement("script");
    widgetScript.src = "https://link.msgsndr.com/js/chat_widget.js";
    widgetScript.async = true;
    widgetScript.setAttribute("data-location-id", "699737916e6009b3eccf3dff");
    document.body.appendChild(widgetScript);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (widgetScript.parentNode) {
        widgetScript.parentNode.removeChild(widgetScript);
      }
    };
  }, []);

  return (
    <>
      {/* Placeholder div for chat widget */}
      <div id="ghl-chat-widget-container" />
      
      {/* Inline script as backup */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.ghlChatWidgetSettings = {
              locationId: '699737916e6009b3eccf3dff',
              autoOpen: false
            };
          `,
        }}
      />
    </>
  );
}
