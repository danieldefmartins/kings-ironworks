import type { Metadata } from "next";
import WindowClient from "./WindowClient";

export const metadata: Metadata = {
  title: "Custom Window Guards & Security Grilles | Boston MA",
  description:
    "Custom window guards, security grilles, child safety guards & emergency egress windows. Code-compliant, decorative designs. Licensed & insured. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/window" },
  openGraph: {
    title: "Custom Window Guards & Security Grilles | King Iron Works",
    description: "300+ guards installed. Security guards, decorative grilles, child safety, emergency egress. 100% code compliant.",
    url: "https://kingsironworks.com/window",
    images: [{ url: "/images/portfolio-organized/Window-Guard/king-iron-works-window-guard-website-1.jpg", width: 1200, height: 630, alt: "Custom window guards by King Iron Works" }],
  },
};

export default function WindowPage() {
  return <WindowClient />;
}
