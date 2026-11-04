"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// LeadConnector renders into an open shadow root, so page CSS cannot reach it.
const widgetStyles = `
  :host([data-kiw-shop]) { display: none !important; }
  :host([data-kiw-contact]) .lc_text-widget--prompt { display: none !important; }
  @media (max-width: 1023px) {
    #lc_text-widget, #lc_text-widget--btn {
      bottom: calc(76px + env(safe-area-inset-bottom, 0px)) !important;
    }
    :host { --chat-widget-height: calc(100dvh - 160px) !important; }
  }
`;

export default function ChatWidget() {
  const pathname = usePathname();
  useEffect(() => {
    const apply = () => {
      const widget = document.querySelector("chat-widget");
      if (!widget) return;
      widget.toggleAttribute("data-kiw-contact", pathname === "/contact");
      widget.toggleAttribute("data-kiw-shop", pathname.startsWith("/shop"));
      const root = widget.shadowRoot;
      if (!root) return;
      if (!root.querySelector("#kiw-widget-layout")) {
        const style = document.createElement("style");
        style.id = "kiw-widget-layout";
        style.textContent = widgetStyles;
        root.appendChild(style);
      }
      if (timer) clearInterval(timer);
    };
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    // Shadow-root attachment is not visible to a document MutationObserver.
    const timer = setInterval(apply, 500);
    const timeout = setTimeout(() => { if (timer) clearInterval(timer); }, 30000);
    apply();
    return () => { observer.disconnect(); if (timer) clearInterval(timer); clearTimeout(timeout); };
  }, [pathname]);

  if (pathname.startsWith("/shop")) return null;
  return <Script src="https://widgets.leadconnectorhq.com/loader.js"
    data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
    data-widget-id="699737916e6009b3eccf3dff" strategy="afterInteractive" />;
}
