import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body-default",
});

const headingFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading-default",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-default",
});

export const metadata: Metadata = {
  description: "Tenant-aware documentation rendering service",
  title: "Atlas Docs Runtime",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
