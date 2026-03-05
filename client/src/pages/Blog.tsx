import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Calendar, Clock } from "lucide-react";
import { useLocalPhone } from "@/lib/useLocalPhone";
import { PhoneLink } from "@/components/PhoneLink";
import { BLOG_CATEGORIES, getPostsByCategory } from "@/lib/blog-data";

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("all");
  const localPhone = useLocalPhone();

  const filteredPosts = getPostsByCategory(activeCategory);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-sidebar text-sidebar-foreground">
        <div className="container pt-24 pb-10 md:pt-32 md:pb-24 lg:pt-32">
          <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-accent/10 text-accent text-xs md:text-sm font-display font-bold tracking-wider mb-4 md:mb-6">
            INSIGHTS & GUIDES
          </div>
          <h1 className="text-display text-3xl md:text-7xl mb-3 md:mb-6">BLOG</h1>
          <p className="text-base md:text-2xl text-sidebar-foreground/80 max-w-2xl">
            Expert insights on fire escapes, ironwork restoration, building
            codes, and custom fabrication.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="diagonal-cut-top bg-card py-4 md:py-8 border-b-2 md:border-b-4 border-border">
        <div className="container">
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide pb-1">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-display font-bold tracking-wider whitespace-nowrap transition-all border-2 md:border-4 flex-shrink-0 ${
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

      {/* Posts */}
      <section className="bg-secondary py-6 md:py-16">
        <div className="container">
          {filteredPosts.length > 0 ? (
            <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-8">
              {filteredPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <article className="group bg-card border-2 md:border-4 border-border hover:border-accent transition-all cursor-pointer flex flex-row md:flex-col h-auto md:h-full">
                    {/* Mobile: small thumbnail left | Desktop: full-width top */}
                    <div className="w-28 flex-shrink-0 md:w-full md:aspect-[16/9] overflow-hidden">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-3 md:p-6 flex flex-col flex-1 min-w-0">
                      <span className="self-start px-2 py-0.5 md:px-3 md:py-1 bg-accent/10 text-accent text-[10px] md:text-xs font-display font-bold tracking-wider uppercase mb-1.5 md:mb-3">
                        {BLOG_CATEGORIES.find((c) => c.id === post.category)
                          ?.label || post.category}
                      </span>
                      <h2 className="text-display text-sm md:text-2xl mb-1 md:mb-3 group-hover:text-accent transition-colors line-clamp-2 md:line-clamp-none">
                        {post.title}
                      </h2>
                      <p className="text-muted-foreground text-xs md:text-base leading-relaxed mb-2 md:mb-4 flex-1 line-clamp-2 md:line-clamp-none hidden md:block">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between md:pt-4 md:border-t md:border-border">
                        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            {formatDate(post.publishedDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            {post.readTime}
                          </span>
                        </div>
                        <span className="hidden md:flex text-accent font-display font-bold text-sm tracking-wider group-hover:translate-x-1 transition-transform items-center gap-1">
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
            <div className="text-center py-12 md:py-20">
              <p className="text-base md:text-xl text-muted-foreground">
                No posts in this category yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="diagonal-cut-top bg-accent text-accent-foreground py-12 md:py-24">
        <div className="container text-center">
          <h2 className="text-display text-2xl md:text-5xl mb-4 md:mb-6">
            HAVE A PROJECT IN MIND?
          </h2>
          <p className="text-sm md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto opacity-90">
            From fire escape inspections to custom ironwork, we bring 20+ years
            of expertise to every project.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <a href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-sm md:text-lg px-6 md:px-8 py-4 md:py-6 thick-border w-full sm:w-auto"
              >
                GET FREE QUOTE
                <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </a>
            <PhoneLink tel={localPhone.tel}>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent text-sm md:text-lg px-6 md:px-8 py-4 md:py-6 thick-border w-full sm:w-auto"
              >
                <Phone className="mr-2 w-4 h-4 md:w-5 md:h-5" />
                {localPhone.display}
              </Button>
            </PhoneLink>
          </div>
        </div>
      </section>
    </div>
  );
}
