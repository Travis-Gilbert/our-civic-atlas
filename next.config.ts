import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  transpilePackages: ["three"],
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      // The Atelier surface was renamed to the Reconstruction Engine
      // (2026-06-12). Old deep links keep working.
      {
        source: "/open-flint-atlas/atelier/:path*",
        destination: "/open-flint-atlas/reconstruction-engine/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
