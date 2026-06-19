import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DO NOT use "standalone" output on Vercel — it breaks API route handling
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  
  // Performance: Allow Next.js Image Optimization to fetch from external CDNs
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '3-boxes-luxury-v1-2.vercel.app',
      },
    ],
  },

  // Performance: Optimize heavy libraries to reduce bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-select'],
  },
};

export default nextConfig;