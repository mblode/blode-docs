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
    setScrolled(latest > 32);
  });

  return (
    <motion.header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background,backdrop-filter,border-color] duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-8">
          <Link
            aria-label="blode.md home"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
            href="/"
          >
            <span className="font-semibold text-base tracking-tight">
              blode.md
            </span>
          </Link>
          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 lg:flex"
          >
            {navLinks.map((link) =>
              link.external ? (
                <a
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href={link.href}
                  key={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Button
            asChild
            className="hidden sm:inline-flex"
            size="sm"
            variant="ghost"
          >
            <Link href="/oauth/consent">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/oauth/consent">Sign up</Link>
          </Button>
          <Sheet onOpenChange={setOpen} open={open}>
            <SheetTrigger asChild>
              <Button
                aria-label="Toggle menu"
                className="size-9 lg:hidden"
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
