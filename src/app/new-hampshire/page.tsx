import type { Metadata } from "next";
import NewHampshireClient from "./NewHampshireClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in New Hampshire | King Iron Works",
  description:
    "New Hampshire's trusted ironwork specialists. Custom gates, railings, fire escapes, and structural steel. Serving Manchester, Nashua, Concord, and all of NH. Call +1 603-691-3012",
  keywords:
    "new hampshire ironwork, fire escape new hampshire, custom gates NH, railings new hampshire, structural steel NH, ironwork manchester nh",
  alternates: {
    canonical: "https://kingsironworks.com/new-hampshire",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in New Hampshire | King Iron Works",
    description:
      "New Hampshire's trusted ironwork specialists. Custom gates, railings, fire escapes, and structural steel.",
    url: "https://kingsironworks.com/new-hampshire",
  },
};

export default function NewHampshirePage() {
  return <NewHampshireClient />;
}
