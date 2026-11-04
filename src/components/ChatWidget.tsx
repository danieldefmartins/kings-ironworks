"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// 360 CRM website chat. Chats land in the King Iron Works inbox in 360.
// Greeting, hours, colors and allowed origins are configured in 360:
// Online presence → Website & forms → Chat widget. The installation token is
// public by design (signed, revocable, origin-restricted); it is not a secret.
const EMBED_SRC = "https://api.get360crm.com/public/website/embed.js";
const WIDGET_TOKEN =
  "eyJraW5kIjoid2lkZ2V0Iiwid3MiOiI4ZTQwNzk0Yy0wNTVhLTQ5YTgtYTE5MC03YmFlYTA1ODdiYTMiLCJpZCI6IjQ0NmI2NWZlLTdiNzMtNDI1Yy05OTE4LWZlYTgwZjFhNTdlNyIsInJldiI6MSwiZXhwIjoyMTA5MTczNjUyMjAyfQ.L32vo6AQ5zOpclu-OSxShDXEAp7W8LEZ5e7iQKGWitM";
const BRAND_COLOR = "#bd8630";
const LOGO_URL =
  "https://api.get360crm.com/public/settings-assets/8e40794c-055a-49a8-a190-7baea0587ba3/a0fa04fb-86d8-bfee-773d-768630741899.png?token=odhXkJ896-q2wHdEkqpAvDQDNhE9O_VpYMUIGsMxuZE";

// The embed appends a fixed, full-viewport host <div> with a shadow root to <body>.
function chatHosts(): HTMLElement[] {
  return Array.from(document.body.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLDivElement && !!el.shadowRoot?.querySelector(".launcher"),
  );
}

export default function ChatWidget() {
  const pathname = usePathname();
  const onShop = pathname.startsWith("/shop");

  // The employee shop app never shows the visitor chat, including after a
  // client-side navigation from a marketing page.
  useEffect(() => {
    const apply = () => chatHosts().forEach((host) => { host.style.display = onShop ? "none" : ""; });
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, [onShop]);

  if (onShop) return null;
  return (
    <Script
      id="kiw-360-chat"
      src={EMBED_SRC}
      data-widget={WIDGET_TOKEN}
      data-color={BRAND_COLOR}
      data-logo={LOGO_URL}
      strategy="afterInteractive"
    />
  );
}
