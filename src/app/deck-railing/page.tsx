import type { Metadata } from "next";
import DeckRailingClient from "./DeckRailingClient";

export const metadata: Metadata = {
  title: "Custom Deck Railing Design & Installation | Boston MA",
  description:
    "Hand-crafted deck railings: wood & iron combos, all-metal, glass panel systems. Weather-resistant finishes for New England. Licensed & insured. Call (617) 404-2589.",
  alternates: { canonical: "https://kingsironworks.com/deck-railing" },
  openGraph: {
    title: "Custom Deck Railing Design & Installation | King Iron Works",
    description: "300+ decks completed. Custom wood & iron combos, all-metal designs, glass panels. Weather-rated for New England.",
    url: "https://kingsironworks.com/deck-railing",
    images: [{ url: "/images/portfolio-organized/Railings/Deck-Railing/king-iron-works-deck-railing-project-2.jpg", width: 1200, height: 630, alt: "Custom deck railing by King Iron Works" }],
  },
};

export default function DeckRailingPage() {
  return <DeckRailingClient />;
}
