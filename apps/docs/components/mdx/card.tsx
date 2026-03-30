import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  icon?: ReactNode;
  color?: string;
  href?: string;
  horizontal?: boolean;
  img?: string;
  cta?: string;
  children?: ReactNode;
}

const CardInner = ({
  title,
  icon,
  color,
  horizontal,
  img,
  cta,
  href,
  children,
}: CardProps) => (
  <div
    className={cn(
      "group/card rounded-xl border border-border bg-card p-4 transition-colors",
      href && "hover:border-primary/30 hover:bg-accent/50",
      horizontal && "flex items-start gap-4"
    )}
  >
    {img && !horizontal ? (
      <div className="relative mb-3 aspect-video overflow-hidden rounded-lg">
        <Image
          alt={title ?? ""}
          className="object-cover"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          src={img}
          unoptimized
        />
      </div>
    ) : null}
    {icon ? (
      <div
        className="mb-3 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        style={color ? { color } : undefined}
      >
        {icon}
      </div>
    ) : null}
    <div className="min-w-0 flex-1">
      {title ? (
        <div className="mb-1 font-medium text-foreground">{title}</div>
      ) : null}
      {children ? (
        <div className="text-sm text-muted-foreground [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
          {children}
        </div>
      ) : null}
      {cta ? (
        <div className="mt-2 text-sm font-medium text-primary">{cta}</div>
      ) : null}
    </div>
    {href ? (
      <svg
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover/card:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M5 12h14M12 5l7 7-7 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : null}
  </div>
);

export const Card = (props: CardProps) => {
  if (props.href) {
    const isExternal = props.href.startsWith("http");
    if (isExternal) {
      return (
        <a href={props.href} rel="noopener noreferrer" target="_blank">
          <CardInner {...props} />
        </a>
      );
    }
    return (
      <Link href={props.href}>
        <CardInner {...props} />
      </Link>
    );
  }
  return <CardInner {...props} />;
};
