import type { Metadata } from "next";
import BlogClient from "@/components/BlogClient";

export const metadata: Metadata = {
  title: "Blog — Insights & Guides",
  description:
    "Expert insights on fire escapes, ironwork restoration, building codes, and custom fabrication from Boston's premier ironwork specialists.",
  openGraph: {
    title: "Blog | King Iron Works",
    description:
      "Expert insights on fire escapes, ironwork restoration, building codes, and custom fabrication from Boston's premier ironwork specialists.",
    url: "https://kingsironworks.com/blog",
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "King Iron Works Blog — Ironwork Insights & Guides",
      },
    ],
  },
  alternates: {
    canonical: "https://kingsironworks.com/blog",
  },
};

export default function BlogPage() {
  return <BlogClient />;
}
