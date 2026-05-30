import type { Metadata } from "next";
import WindowWellClient from "./WindowWellClient";

export const metadata: Metadata = {
  title: "Window Well Covers & Grates | Boston MA",
  description:
    "Custom window well covers, security grates & egress systems. Precision-measured, rust-proof finishes. 200+ covers installed. Licensed & insured. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/window-well" },
  openGraph: {
    title: "Window Well Covers & Grates | King Iron Works",
    description: "200+ covers installed. Custom-fit window well covers, security grates, egress systems. Weather-proof finishes.",
    url: "https://kingsironworks.com/window-well",
    images: [{ url: "/images/portfolio-organized/Window-Well/king-iron-works-window-well-horizontal-bar-modern.jpg", width: 1200, height: 630, alt: "Custom window well cover by King Iron Works" }],
  },
};

export default function WindowWellPage() {
  return <WindowWellClient />;
}
