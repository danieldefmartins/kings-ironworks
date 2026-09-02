import type { Metadata } from "next";
import PortfolioClient from "@/components/PortfolioClient";
import {
  categories as portfolioCategories,
  getCategoryLabel,
} from "@/lib/portfolio-data";

interface Props {
  params: Promise<{ category: string }>;
}

// Parent categories for metadata generation
const parentCategories = [
  { id: "staircases", label: "Staircases", children: ["curved-staircases", "curved-project-1", "curved-project-2", "floating-full", "floating-mono-stringer", "floating-dual-stringer", "exterior-entry-staircases", "spiral-interior", "spiral-exterior", "grand-ornamental"] },
  { id: "railings", label: "Railings", children: ["exterior-railings", "interior-railings", "cable-railings", "deck-railings", "commercial-railings", "small-railings"] },
  { id: "gates", label: "Gates", children: ["gates"] },
  { id: "fire-escapes", label: "Fire Escapes", children: ["fire-escapes"] },
  { id: "balconies-group", label: "Balconies", children: ["balconies", "juliet-balconies"] },
  { id: "fences", label: "Fences", children: ["fences"] },
  { id: "structural-steel", label: "Structural Steel", children: ["structural-steel"] },
  { id: "window-wells", label: "Window Wells", children: ["window-wells", "window-guards"] },
  { id: "ada-ramps", label: "ADA Ramps", children: ["ada-ramps"] },
  { id: "shop-process", label: "Shop & Process", children: ["shop-process"] },
];

function getCategoryTitle(category: string): string {
  const parent = parentCategories.find((p) => p.id === category);
  if (parent) return parent.label;
  const cat = portfolioCategories.find((c) => c.id === category);
  if (cat) return cat.label;
  return "Portfolio";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const title = getCategoryTitle(category);

  return {
    title: `${title} — Portfolio`,
    description: `Browse our ${title.toLowerCase()} projects. Custom ironwork crafted with 20+ years of expertise. King Iron Works serves New England, New York & Florida.`,
    openGraph: {
      title: `${title} | King Iron Works Portfolio`,
      description: `Browse our ${title.toLowerCase()} projects. Custom ironwork crafted with 20+ years of expertise.`,
      url: `https://kingsironworks.com/portfolio/${category}`,
    },
    alternates: {
      canonical: `https://kingsironworks.com/portfolio/${category}`,
    },
  };
}

export function generateStaticParams() {
  const params: { category: string }[] = [];

  // Parent categories
  for (const parent of parentCategories) {
    params.push({ category: parent.id });
    // Sub-categories
    for (const child of parent.children) {
      params.push({ category: child });
    }
  }

  return params;
}

export default async function PortfolioCategoryPage({ params }: Props) {
  const { category } = await params;
  return <PortfolioClient initialCategory={category} />;
}
