import { cn } from "@/lib/utils";

interface HeroMediaProps {
  className?: string;
}

export const HeroMedia = ({ className }: HeroMediaProps) => (
  <div
    className={cn(
      "relative mx-auto w-full max-w-5xl px-4 [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]",
      className
    )}
  >
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg shadow-foreground/5 ring-1 ring-border/50">
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/30 px-4 py-3">
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="ml-3 rounded-md bg-background/60 px-2.5 py-1 font-mono text-muted-foreground text-xs">
          acme.blode.md
        </span>
      </div>
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary)_20%,transparent)_0,transparent_40%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-2xl px-12">
            <div className="h-3 w-20 rounded-full bg-foreground/10" />
            <div className="mt-4 h-8 w-3/4 rounded-md bg-foreground/15" />
            <div className="mt-3 h-4 w-1/2 rounded-md bg-foreground/10" />
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => (
                <div
                  className="h-20 rounded-lg border border-border/50 bg-background/40 p-3"
                  key={idx}
                >
                  <div className="h-2 w-10 rounded-full bg-foreground/15" />
                  <div className="mt-2 h-3 w-16 rounded-full bg-foreground/10" />
                </div>
              ))}
            </div>
            <div className="mt-6 h-24 rounded-lg border border-border/50 bg-background/40" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
