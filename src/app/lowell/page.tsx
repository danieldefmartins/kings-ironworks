import type { Metadata } from "next";
import LowellClient from "./LowellClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Lowell, MA | King Iron Works",
  description:
    "Lowell MA's trusted ironwork specialists. Custom staircases, railings, gates, fencing, and structural steel. Serving Chelmsford, Dracut, Tewksbury, Billerica, and surrounding areas. Call (617) 404-2589.",
  keywords:
    "lowell ironwork, custom ironwork lowell ma, railings chelmsford ma, gates dracut ma, structural steel lowell massachusetts",
  alternates: {
    canonical: "https://kingsironworks.com/lowell",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Lowell, MA | King Iron Works",
    description:
      "Lowell MA's trusted ironwork specialists. Custom staircases, railings, gates, and structural steel.",
    url: "https://kingsironworks.com/lowell",
  },
};

export default function LowellPage() {
  return <LowellClient />;
}
