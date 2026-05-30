import type { Metadata } from "next";
import ManchesterNHClient from "./ManchesterNHClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in Manchester, NH | King Iron Works",
  description:
    "Manchester NH's trusted ironwork specialists. Custom staircases, railings, gates, fencing, and structural steel. Serving Bedford, Goffstown, Hooksett, Derry, Londonderry, and surrounding areas. Call +1 603-691-3012.",
  keywords:
    "manchester nh ironwork, custom ironwork manchester nh, railings bedford nh, gates goffstown nh, structural steel manchester new hampshire",
  alternates: {
    canonical: "https://kingsironworks.com/manchester-nh",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in Manchester, NH | King Iron Works",
    description:
      "Manchester NH's trusted ironwork specialists. Custom staircases, railings, gates, and structural steel.",
    url: "https://kingsironworks.com/manchester-nh",
  },
};

export default function ManchesterNHPage() {
  return <ManchesterNHClient />;
}
