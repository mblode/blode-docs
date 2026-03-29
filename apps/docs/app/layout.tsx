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
    "Ship beautiful docs from your terminal. Write MDX locally, deploy with one command.",
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
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
      </head>
      <body className="relative flex w-full flex-col justify-center overflow-x-hidden scroll-smooth bg-background font-sans antialiased [--header-height:calc(var(--spacing)*14)]">
        {children}
      </body>
    </html>
  );
}
