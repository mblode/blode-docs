import type { CSSProperties, ReactNode } from "react";

import { SiteFooter } from "@/components/ui/site-footer";
import { getDashboardHref, SiteHeader } from "@/components/ui/site-header";

export const landingTheme = {
  "--primary": "#EFEE77",
  "--primary-foreground": "#000000",
  "--ring": "#EFEE77",
  "--selection": "#EFEE77",
  "--selection-foreground": "#000000",
} as CSSProperties;

interface MarketingShellProps {
  children: ReactNode;
}

export const MarketingShell = async ({ children }: MarketingShellProps) => {
  const dashboardHref = await getDashboardHref();
  const isSignedIn = dashboardHref === "/app";

  return (
    <div
      className="min-h-screen overflow-x-clip bg-background text-foreground"
      style={landingTheme}
    >
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        href="#main"
      >
        Skip to content
      </a>
      <SiteHeader dashboardHref={dashboardHref} isSignedIn={isSignedIn} />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
};
