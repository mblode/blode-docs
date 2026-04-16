import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createSupabaseServerClient } from "@/lib/supabase";

import { SignOutButton } from "./_components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/oauth/consent?redirect_to=/app");
  }

  const userEmail =
    session.user.email ?? session.user.user_metadata?.email ?? "";
  const userName =
    (session.user.user_metadata?.full_name as string | undefined) ??
    (session.user.user_metadata?.name as string | undefined) ??
    userEmail;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/app"
              className="text-base font-semibold tracking-tight"
            >
              blode.md
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/app" className="hover:text-foreground">
                Projects
              </Link>
              <Link href="/docs" className="hover:text-foreground">
                Docs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userName}
            </span>
            <SignOutButton />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container px-4 py-10">{children}</div>
      </main>
    </div>
  );
}
