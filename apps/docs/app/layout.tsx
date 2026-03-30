import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";

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

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("atlas-theme");if(!t){t=matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t;if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`;

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
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
      </head>
      <body className="relative flex w-full flex-col justify-center overflow-x-hidden scroll-smooth bg-background font-sans antialiased [--header-height:calc(var(--spacing)*14)]">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
