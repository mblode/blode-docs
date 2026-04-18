import { GithubIcon } from "blode-icons-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { siteConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase";

export const getDashboardHref = async (): Promise<string> => {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session ? "/app" : "/oauth/consent";
  } catch {
    return "/oauth/consent";
  }
};

interface SiteHeaderProps {
  dashboardHref: string;
  isSignedIn: boolean;
}

export const SiteHeader = ({ dashboardHref, isSignedIn }: SiteHeaderProps) => (
  <header className="container flex items-center justify-between px-4 py-6">
    <Link
      className="flex items-center gap-3 transition-opacity hover:opacity-80"
      href="/"
    >
      <span className="font-semibold text-base tracking-tight">blode.md</span>
      <Badge className="font-mono" variant="outline">
        v{siteConfig.version}
      </Badge>
    </Link>
    <nav aria-label="Main" className="flex items-center gap-1">
      <Button asChild size="sm" variant="ghost">
        <Link href="/pricing">Pricing</Link>
      </Button>
      <Button asChild size="sm" variant="ghost">
        <Link href="/changelog">Changelog</Link>
      </Button>
      <Button asChild size="sm" variant="ghost">
        <Link href="/docs">Docs</Link>
      </Button>
      <Separator className="mx-1 h-5" orientation="vertical" />
      <Button asChild size="sm" variant="ghost">
        <a
          href={siteConfig.links.github}
          rel="noopener noreferrer"
          target="_blank"
        >
          <GithubIcon data-icon="inline-start" />
          GitHub
        </a>
      </Button>
      <Button asChild size="sm" variant="ghost">
        <Link href={dashboardHref}>{isSignedIn ? "Dashboard" : "Sign in"}</Link>
      </Button>
      <ThemeToggle />
    </nav>
  </header>
);
