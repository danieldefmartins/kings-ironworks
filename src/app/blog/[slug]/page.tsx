import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostClient from "@/components/BlogPostClient";
import {
  getPostBySlug,
  BLOG_POSTS,
  BLOG_CATEGORIES,
} from "@/lib/blog-data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | King Iron Works`,
      description: post.excerpt,
      url: `https://kingsironworks.com/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedDate,
      images: [
        {
          url: post.featuredImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.featuredImage],
    },
    alternates: {
      canonical: `https://kingsironworks.com/blog/${post.slug}`,
    },
  };
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const categoryLabel =
    BLOG_CATEGORIES.find((c) => c.id === post.category)?.label || post.category;

  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug,
  ).slice(0, 2);

  return (
    <BlogPostClient
      post={post}
      categoryLabel={categoryLabel}
      relatedPosts={relatedPosts}
    />
  );
}
