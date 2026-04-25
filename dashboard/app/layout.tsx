import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lattice | Maritime Command Center",
  description:
    "4D Maritime Digital Twin — AI-powered route optimization, drift prediction, and ocean intelligence for B2B supply chain logistics.",
  keywords: ["maritime", "logistics", "AI", "route optimization", "digital twin"],
  openGraph: {
    title: "Lattice Maritime Command Center",
    description: "AI-driven 4D maritime navigation and drift prediction platform",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Cesium stylesheet required for 3D globe chrome */}
        <link
          rel="stylesheet"
          href="https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Widgets/widgets.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
