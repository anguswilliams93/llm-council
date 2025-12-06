import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['motion/react'],
  },
  output: 'standalone',  // No static prerender
};

export default nextConfig;
