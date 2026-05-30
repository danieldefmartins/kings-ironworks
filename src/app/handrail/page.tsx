import type { Metadata } from "next";
import HandrailClient from "./HandrailClient";

export const metadata: Metadata = {
  title: "Pipe Handrail & Railing Installation | Boston MA",
  description:
    "ADA-compliant pipe handrails for commercial, industrial & residential. OSHA compliant. Licensed & insured. 500+ handrails installed. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/handrail" },
  openGraph: {
    title: "Pipe Handrail & Railing Installation | King Iron Works",
    description: "500+ handrails installed. ADA & OSHA compliant. Commercial, industrial & residential. All materials available.",
    url: "https://kingsironworks.com/handrail",
    images: [{ url: "/images/portfolio-organized/Railings/Small-Railing/king-iron-works-small-railing-3.jpg", width: 1200, height: 630, alt: "Pipe handrail installation by King Iron Works" }],
  },
};

export default function HandrailPage() {
  return <HandrailClient />;
}
