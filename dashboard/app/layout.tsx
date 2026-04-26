import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ShipStateProvider } from "@/lib/ShipStateContext";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Lattice | Oceanic Elegance",
  description: "Real-time maritime drift prediction and path optimization powered by Physics-Informed Neural Networks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/cesium@1.114.0/Build/Cesium/Widgets/widgets.css"
        />
      </head>
      <body>
        <ShipStateProvider>
          <Navbar />
          <div className="page-transition-wrapper">
            {children}
          </div>
        </ShipStateProvider>
      </body>
    </html>
  );
}

