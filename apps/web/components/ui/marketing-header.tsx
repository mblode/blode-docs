"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MorphIcon } from "@/components/ui/morph-icon";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { external: true, href: siteConfig.links.github, label: "GitHub" },
];

export const MarketingHeader = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 16);
  });

  return (
    <motion.header
      className={cn(
        "fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 transition-all duration-300",
        scrolled ? "pt-3" : "pt-5"
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-[1200px] items-center justify-between rounded-full border pr-2 py-2 transition-all duration-300",
          scrolled
            ? "border-border/60 bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        )}
      >
        <div className="flex items-center gap-1 pl-2">
          <Link
            aria-label="Blode.md home"
            className="flex items-baseline rounded-full py-1 transition-opacity hover:opacity-70"
            href="/"
          >
            <span className="font-semibold text-base leading-none tracking-tight">
              Blode
            </span>
            <span className="font-semibold text-base leading-none tracking-tight">
              .md
            </span>
          </Link>
        </div>
        <nav
          aria-label="Primary"
          className="-translate-x-1/2 absolute left-1/2 hidden items-center gap-1 md:flex"
        >
          {navLinks.map((link) =>
            link.external ? (
              <a
                className="rounded-full px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                href={link.href}
                key={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ) : (
              <Link
                className="rounded-full px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>
        <nav aria-label="Account" className="flex items-center gap-1">
          <Link
            className="hidden rounded-full px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            href="/oauth/consent"
          >
            Log in
          </Link>
          <Link
            className="inline-flex h-8 items-center rounded-full bg-foreground px-4 font-medium text-background text-sm transition-opacity hover:opacity-90"
            href="/oauth/consent"
          >
            Sign up
          </Link>
          <Sheet onOpenChange={setOpen} open={open}>
            <SheetTrigger asChild>
              <Button
                aria-label="Toggle menu"
                className="ml-1 size-8 rounded-full md:hidden"
                size="icon"
                variant="ghost"
              >
                <MorphIcon icon={open ? "cross" : "menu"} size={16} />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col gap-6" side="right">
              <SheetHeader>
                <SheetTitle className="text-base">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    {link.external ? (
                      <a
                        className="rounded-md px-2 py-2 text-lg font-medium transition-colors hover:bg-muted"
                        href={link.href}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        className="rounded-md px-2 py-2 text-lg font-medium transition-colors hover:bg-muted"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    )}
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    className="rounded-md px-2 py-2 text-lg font-medium transition-colors hover:bg-muted sm:hidden"
                    href="/oauth/consent"
                  >
                    Log in
                  </Link>
                </SheetClose>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-border px-4 py-4">
                <span className="text-muted-foreground text-sm">Theme</span>
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </motion.header>
  );
};
