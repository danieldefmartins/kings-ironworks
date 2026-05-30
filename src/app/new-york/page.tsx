import type { Metadata } from "next";
import NewYorkClient from "./NewYorkClient";

export const metadata: Metadata = {
  title: "Custom Ironwork & Fire Escapes in New York | King Iron Works",
  description:
    "New York's trusted ironwork specialists. Fire escapes, structural steel, custom fabrication, and building restoration. Serving NYC, Long Island, and all of NY. Call +1 917-809-6492",
  keywords:
    "new york ironwork, fire escape new york, custom gates NYC, railings new york, structural steel NY, ironwork manhattan, fire escape nyc",
  alternates: {
    canonical: "https://kingsironworks.com/new-york",
  },
  openGraph: {
    title: "Custom Ironwork & Fire Escapes in New York | King Iron Works",
    description:
      "New York's trusted ironwork specialists. Fire escapes, structural steel, custom fabrication, and building restoration.",
    url: "https://kingsironworks.com/new-york",
  },
};

export default function NewYorkPage() {
  return <NewYorkClient />;
}
