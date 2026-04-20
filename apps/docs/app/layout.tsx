import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { Providers } from "@/components/providers";
import { ThirdParties } from "@/components/third-parties";
import { WebMcpTools } from "@/components/web-mcp";

import "./globals.css";

const glide = localFont({
  display: "swap",
  src: [{ path: "../public/glide-variable.woff2" }],
  variable: "--font-glide",
  weight: "400 900",
});

export const metadata: Metadata = {
  description:
    "Documentation should ship as fast as code. blode.md is a terminal-native docs platform — write MDX, push from your CLI, deploy on every merge.",
  other: {
    "apple-mobile-web-app-title": "Blode.md",
  },
  title: "Blode.md",
};

export const viewport: Viewport = {
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${glide.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://public.blob.vercel-storage.com" />
      </head>
      <body className="relative flex w-full flex-col justify-center scroll-smooth bg-background font-sans antialiased [--header-height:calc(var(--spacing)*16)]">
        <Providers>{children}</Providers>
        <ThirdParties />
        <WebMcpTools />
      </body>
    </html>
  );
}
