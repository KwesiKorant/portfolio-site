import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Kwesi // Full-Stack & Distributed Architecture",
  description:
    "Spatial portfolio of Kwesi — Full-Stack & Systems Engineer specializing in distributed infrastructure, high-throughput pipelines, and hardware-accelerated WebGL interfaces.",
  keywords: [
    "Kwesi",
    "Systems Engineer",
    "Distributed Systems",
    "WebGL",
    "Three.js",
    "Next.js",
    "Rust",
    "TypeScript",
    "eBPF",
  ],
  authors: [{ name: "Kwesi" }],
  openGraph: {
    title: "Kwesi // Full-Stack & Distributed Architecture",
    description:
      "Interactive 3D spatial portfolio exploring distributed systems, real-time pipelines, and high-performance WebGL interfaces.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050508",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        {/* Static noise overlay to eliminate 8-bit banding */}
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
