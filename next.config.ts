import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  transpilePackages: ["three"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
