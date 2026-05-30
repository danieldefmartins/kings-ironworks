import type { Metadata } from "next";
import StaircaseHubClient from "@/components/StaircaseHubClient";

export const metadata: Metadata = {
  title: "Dream Staircase Designer — King Iron Works",
  description:
    "Design your dream staircase with King Iron Works. Choose your structure, finish, and railing — we'll engineer and forge it into reality. Serving all of New England from our Everett facility.",
  alternates: {
    canonical: "https://www.kingsironworks.com/dream-staircase",
  },
  openGraph: {
    title: "Dream Staircase Designer — King Iron Works",
    description:
      "Design your dream staircase with King Iron Works. Choose your structure, finish, and railing — we'll engineer and forge it into reality.",
    url: "https://www.kingsironworks.com/dream-staircase",
    siteName: "King Iron Works",
    type: "website",
  },
};

export default function DreamStaircasePage() {
  return <StaircaseHubClient />;
}
