import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center">
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-[10px] font-semibold tracking-[5px] uppercase text-accent/50 mb-6">
          Page Not Found
        </p>
        <h1 className="font-display text-6xl md:text-8xl font-black tracking-tight text-white mb-4">
          404
        </h1>
        <p className="text-lg text-white/40 mb-10 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center px-8 py-3 bg-accent text-accent-foreground font-display font-bold text-sm tracking-wide uppercase hover:bg-accent/90 transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center px-8 py-3 border border-white/10 text-white/50 font-display font-bold text-sm tracking-wide uppercase hover:border-accent/30 hover:text-white transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
