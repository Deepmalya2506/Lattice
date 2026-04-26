import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {},          // Silence Turbopack/webpack conflict — no custom webpack needed
  allowedDevOrigins: ['192.168.29.32'],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.ion.cesium.com" },
      { protocol: "https", hostname: "tile.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
