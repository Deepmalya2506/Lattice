import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  turbopack: {},

  allowedDevOrigins: ["192.168.29.32"],

  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.ion.cesium.com",
      },
      {
        protocol: "https",
        hostname: "tile.openstreetmap.org",
      },
    ],
  },
};

export default nextConfig;