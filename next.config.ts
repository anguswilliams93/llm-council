import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['motion'],
  experimental: {
    optimizePackageImports: ['motion'],
  },
};

export default nextConfig;
