import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Calendar, Clock } from "lucide-react";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { BLOG_POSTS, BLOG_CATEGORIES, getPostsByCategory } from "@/lib/blog-data";

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("all");
  const localPhone = useLocalPhone();

  const filteredPosts = getPostsByCategory(activeCategory);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center bg-sidebar text-sidebar-foreground pt-20 lg:pt-0">
        <div className="container relative z-10">
          <div className="inline-block px-4 py-2 bg-accent/10 text-accent text-sm font-display font-bold tracking-wider mb-6">
            INSIGHTS & GUIDES
          </div>
          <h1 className="text-display text-5xl md:text-7xl mb-6">BLOG</h1>
          <p className="text-xl md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            Expert insights on fire escapes, ironwork restoration, building
            codes, and custom fabrication from 20+ years in the trade.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="diagonal-cut-top bg-card py-8 border-b-4 border-border">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2 text-xs font-display font-bold tracking-wider whitespace-nowrap transition-all border-4 flex-shrink-0 ${
                  activeCategory === cat.id
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-transparent text-foreground/60 border-border hover:border-accent/50 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="bg-secondary py-16">
        <div className="container">
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <article className="group bg-card border-4 border-border hover:border-accent transition-all cursor-pointer h-full flex flex-col">
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-display font-bold tracking-wider uppercase">
                          {BLOG_CATEGORIES.find((c) => c.id === post.category)
                            ?.label || post.category}
                        </span>
                      </div>
                      <h2 className="text-display text-xl md:text-2xl mb-3 group-hover:text-accent transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed mb-4 flex-1">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(post.publishedDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {post.readTime}
                          </span>
                        </div>
                        <span className="text-accent font-display font-bold text-sm tracking-wider group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          READ MORE
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                No posts in this category yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-24">
        <div className="container text-center">
          <h2 className="text-display text-4xl md:text-5xl mb-6">
            HAVE A PROJECT IN MIND?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            From fire escape inspections to custom ironwork, we bring 20+ years
            of expertise to every project.
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
