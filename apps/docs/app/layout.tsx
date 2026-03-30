import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import type { Metadata } from "next";
import localFont from "next/font/local";

import { Providers } from "@/components/providers";

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
  title: "Blode.md",
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
      <body className="relative flex w-full flex-col justify-center overflow-x-hidden scroll-smooth bg-background font-sans antialiased [--header-height:calc(var(--spacing)*14)]">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
