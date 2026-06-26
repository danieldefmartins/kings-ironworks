"use client";

import { usePathname } from "next/navigation";

// Hides the marketing chrome (nav, footer, chat widget) on the /shop tablet app.
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname && pathname.startsWith("/shop")) return null;
  return <>{children}</>;
}
