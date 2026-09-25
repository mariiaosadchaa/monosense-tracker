import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./transactions-toolbar.css";
import "./premium.css";
import "./redesign.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Rivna — особисті фінанси",
  description: "Рахунки, бюджети та спільні фінансові цілі в одному застосунку.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#6c5ce7", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uk" className={inter.variable} suppressHydrationWarning><body>{children}</body></html>;
}
