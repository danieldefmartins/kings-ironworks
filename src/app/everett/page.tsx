import type { Metadata } from "next";
import EverettClient from "./EverettClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Everett, MA | King Iron Works",
  description:
    "Everett MA — home of King Iron Works headquarters and fabrication shop. Custom staircases, railings, gates, fencing, and structural steel. Serving Malden, Medford, Somerville, Chelsea, and surrounding areas. Call (617) 404-2589.",
  keywords:
    "everett ironwork, custom ironwork everett ma, railings malden ma, gates medford ma, structural steel everett massachusetts",
  alternates: {
    canonical: "https://kingsironworks.com/everett",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Everett, MA | King Iron Works",
    description:
      "Everett MA — home of King Iron Works headquarters. Custom staircases, railings, gates, and structural steel.",
    url: "https://kingsironworks.com/everett",
  },
};

export default function EverettPage() {
  return <EverettClient />;
}
