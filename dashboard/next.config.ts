import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},          // Silence Turbopack/webpack conflict — no custom webpack needed
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.ion.cesium.com" },
      { protocol: "https", hostname: "tile.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
