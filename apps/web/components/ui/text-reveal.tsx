"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import type { MotionValue } from "motion/react";
import { useRef } from "react";
import type { ComponentPropsWithoutRef, FC, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WordProps {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
}

const Word: FC<WordProps> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0.2, 1]);

  return (
    <motion.span className="mx-1 text-foreground lg:mx-1.5" style={{ opacity }}>
      {children}
    </motion.span>
  );
};

export interface TextRevealProps extends ComponentPropsWithoutRef<"div"> {
  children: string;
  container?: React.RefObject<HTMLElement | HTMLDivElement | null>;
}

// motion v12 auto-accelerates `useScroll({ target })` to CSS `view-timeline`
// when the offset matches a preset. Both `undefined` and `["start start","end end"]`
// normalise to `ScrollOffset.All` → `view-timeline: contain`, which collapses to
// zero length whenever the target is taller than the scrollport (our 200vh target
// in a 100vh viewport). That stalls `scrollYProgress` mid-scroll.
// `["start end", "end start"]` normalises to [[0,1],[1,0]] — no preset match, so
// motion falls back to JS scroll tracking and progress actually runs 0 → 1.
// With that offset on this layout, the sticky child lands at progress ~0.33 and
// releases at ~0.67; we pack the per-word reveal ranges into that window so every
// word lands between sticky-in and sticky-release.
const REVEAL_START = 0.33;
const REVEAL_END = 0.67;
const REVEAL_SPAN = REVEAL_END - REVEAL_START;

export const TextReveal: FC<TextRevealProps> = ({
  children,
  className,
  container,
}) => {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const shouldReduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    container,
    offset: ["start end", "end start"],
    target: targetRef,
  });

  if (typeof children !== "string") {
    throw new TypeError("TextReveal: children must be a string");
  }

  const words = children.split(" ");

  if (shouldReduce) {
    return (
      <div className="relative z-0 flex min-h-screen items-center px-6">
        <p
          className={cn(
            "mx-auto max-w-[900px] font-sans text-3xl leading-relaxed h-display lg:text-4xl xl:text-5xl",
            className
          )}
        >
          {children}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("relative z-0 h-[200vh] px-6", className)}
      ref={targetRef}
    >
      <div className="sticky top-0 mx-auto flex h-screen max-w-[900px] items-center bg-transparent py-24">
        <span
          className="flex flex-wrap font-sans text-3xl leading-relaxed h-display lg:text-4xl xl:text-5xl"
          suppressHydrationWarning
        >
          {words.map((word, i) => {
            const start = REVEAL_START + (i / words.length) * REVEAL_SPAN;
            const end = start + REVEAL_SPAN / words.length;
            return (
              <Word
                // oxlint-disable-next-line no-array-index-key
                key={`${word}-${i}`}
                progress={scrollYProgress}
                range={[start, end]}
              >
                {word}
              </Word>
            );
          })}
        </span>
      </div>
    </div>
  );
};
