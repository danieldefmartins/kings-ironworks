import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowLeft,
  Phone,
  Calendar,
  Clock,
} from "lucide-react";
import { useLocalPhone } from "@/lib/useLocalPhone";
import {
  getPostBySlug,
  BLOG_POSTS,
  BLOG_CATEGORIES,
} from "@/lib/blog-data";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const localPhone = useLocalPhone();
  const post = getPostBySlug(slug || "");

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-card">
        <div className="text-center">
          <h1 className="text-display text-4xl mb-4">POST NOT FOUND</h1>
          <p className="text-muted-foreground mb-8">
            The article you're looking for doesn't exist.
          </p>
          <Link href="/blog">
            <Button className="bg-accent hover:bg-accent/90 thick-border">
              <ArrowLeft className="mr-2 w-4 h-4" />
              BACK TO BLOG
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const categoryLabel =
    BLOG_CATEGORIES.find((c) => c.id === post.category)?.label ||
    post.category;

  // Related posts (same category, excluding current)
  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug,
  ).slice(0, 2);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-sidebar text-sidebar-foreground">
        <div className="absolute inset-0 z-0">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="container relative z-10 py-16 md:py-24">
          <Link href="/blog">
            <span className="inline-flex items-center gap-1 text-sidebar-foreground/60 hover:text-accent transition-colors text-sm font-display font-bold tracking-wider mb-6 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              BACK TO BLOG
            </span>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-display font-bold tracking-wider">
              {categoryLabel}
            </span>
          </div>
          <h1 className="text-display text-4xl md:text-6xl mb-6 max-w-4xl">
            {post.title}
          </h1>
          <div className="flex items-center gap-6 text-sidebar-foreground/60 text-sm">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(post.publishedDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>
        </div>
      </section>

      {/* Article Body */}
      <section className="diagonal-cut-top bg-card py-16 md:py-24">
        <div className="container">
          <article className="max-w-3xl mx-auto">
            <div
              className="prose prose-lg max-w-none
                prose-headings:font-display prose-headings:tracking-wide prose-headings:text-foreground
                prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:mt-12 prose-h2:mb-6
                prose-h3:text-xl prose-h3:md:text-2xl prose-h3:mt-8 prose-h3:mb-4
                prose-p:text-muted-foreground prose-p:leading-relaxed
                prose-li:text-muted-foreground
                prose-strong:text-foreground
                prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                prose-ul:space-y-2 prose-ol:space-y-2"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-secondary text-muted-foreground text-xs font-display font-bold tracking-wider uppercase border-2 border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-secondary py-16 border-t-4 border-border">
          <div className="container">
            <h2 className="text-display text-3xl md:text-4xl mb-8">
              RELATED ARTICLES
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {relatedPosts.map((related) => (
                <Link key={related.slug} href={`/blog/${related.slug}`}>
                  <article className="group bg-card border-4 border-border hover:border-accent transition-all cursor-pointer">
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={related.featuredImage}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-display text-lg mb-2 group-hover:text-accent transition-colors">
                        {related.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {related.excerpt}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container text-center">
          <h2 className="text-display text-4xl md:text-5xl mb-6">
            NEED HELP WITH YOUR PROJECT?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Get a free consultation from our team of licensed ironwork
            professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border"
              >
                GET FREE QUOTE
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
            <a href={`tel:${localPhone.tel}`}>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-lg px-8 py-6 thick-border"
              >
                <Phone className="mr-2 w-5 h-5" />
                {localPhone.display}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
