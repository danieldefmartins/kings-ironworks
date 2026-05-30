import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";

export const metadata: Metadata = {
  title: "King Iron Works | Custom Ironwork & Fire Escape Specialists — Boston, MA",
  description:
    "We make steel dance. Custom staircases, railings, gates, fire escapes, and structural steel. 20+ years of master craftsmanship serving 9 states from Everett, MA. Licensed & insured. Free assessment.",
  openGraph: {
    title: "King Iron Works | Custom Ironwork & Fire Escape Specialists",
    description:
      "We make steel dance. Custom staircases, railings, gates, fire escapes, and structural steel. 20+ years, 1000+ projects. Serving 9 states.",
    url: "https://kingsironworks.com",
    images: [
      {
        url: "/images/portfolio-organized/Staircases/Grand-Ornamental/king-iron-works-staircase-grand-project2-hero.jpg",
        width: 1200,
        height: 630,
        alt: "King Iron Works — Custom Ornamental Ironwork",
      },
    ],
  },
  alternates: {
    canonical: "https://kingsironworks.com",
  },
};

export default function Home() {
  return (
    <main>
      <HomeClient />
    </main>
  );
}
