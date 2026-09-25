import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./transactions-toolbar.css";
import "./premium.css";
import "./redesign.css";
import { Inter, Playfair_Display } from "next/font/google";
import { NativeBridge } from "./components/NativeBridge";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
const serif = Playfair_Display({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"], variable: "--font-serif", display: "swap" });

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

export const viewport: Viewport = { themeColor: "#0e0d0b", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uk" className={`${inter.variable} ${serif.variable}`} suppressHydrationWarning><body><NativeBridge />{children}</body></html>;
}
