import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { Providers } from "@/components/providers";
import { WebMcpTools } from "@/components/web-mcp";

import "./globals.css";

const glide = localFont({
  display: "swap",
  src: [
    { path: "./fonts/glide-variable.woff2", style: "normal" },
    { path: "./fonts/glide-variable-italic.woff2", style: "italic" },
  ],
  variable: "--font-glide",
  weight: "100 950",
});

const glideMono = localFont({
  display: "swap",
  src: [{ path: "./fonts/glide-mono.woff2" }],
  variable: "--font-glide-mono",
  weight: "400",
});

export const metadata: Metadata = {
  description:
    "Blode.md: git-native docs, published on merge. Write MDX in the repo, review it in the pull request, and the merge publishes the site.",
  metadataBase: new URL("https://blode.md"),
  openGraph: {
    siteName: "Blode.md",
    type: "website",
  },
  other: {
    "apple-mobile-web-app-title": "Blode.md",
  },
  robots: {
    googleBot: {
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  title: "Blode.md",
  twitter: {
    card: "summary_large_image",
  },
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
      className={`${glide.variable} ${glideMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="alternate"
          type="text/plain"
          title="llms.txt"
          href="/llms.txt"
        />
        <link
          rel="alternate"
          type="text/plain"
          title="llms-full.txt"
          href="/llms-full.txt"
        />
        <link rel="describedby" href="/llms.txt" />
        <link rel="preconnect" href="https://public.blob.vercel-storage.com" />
      </head>
      <body className="relative flex w-full flex-col justify-center scroll-smooth bg-background font-sans antialiased [--header-height:calc(var(--spacing)*16)]">
        <Providers>{children}</Providers>
        <WebMcpTools />
      </body>
    </html>
  );
}
