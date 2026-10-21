import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      // The page shipped as /exterior-staircase before it was named the
      // Floating Exterior Staircase. The old URL was already in circulation.
      { source: "/exterior-staircase", destination: "/floating-exterior-staircase", permanent: true },
      { source: "/portfolio/exterior-entry-staircases", destination: "/portfolio/floating-exterior-staircases", permanent: true },
    ];
  },
};

export default nextConfig;
