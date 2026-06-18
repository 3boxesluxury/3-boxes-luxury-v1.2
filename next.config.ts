import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DO NOT use "standalone" output on Vercel — it breaks API route handling
  // and causes 404s on all /api/* endpoints
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;// Force rebuild 532727692
