"use client";

import { motion, useReducedMotion } from "motion/react";
import type {
  HTMLMotionProps,
  TargetAndTransition,
  Variants,
} from "motion/react";
import { useMemo } from "react";
import type { ElementType, ReactNode } from "react";

type Preset = "fade" | "fade-in-blur" | "slide";
type Per = "word" | "char" | "line";

interface TextEffectProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  as?: ElementType;
  per?: Per;
  preset?: Preset;
  delay?: number;
  speedSegment?: number;
}

const presets: Record<
  Preset,
  { hidden: TargetAndTransition; visible: TargetAndTransition }
> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "fade-in-blur": {
    hidden: { filter: "blur(12px)", opacity: 0, y: 8 },
    visible: { filter: "blur(0px)", opacity: 1, y: 0 },
  },
  slide: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
};

const splitText = (text: string, per: Per): string[] => {
  if (per === "line") {
    return text.split(/\n+/);
  }
  if (per === "char") {
    return [...text];
  }
  return text.split(/(\s+)/);
};

export const TextEffect = ({
  children,
  as = "p",
  per = "word",
  preset = "fade-in-blur",
  delay = 0,
  speedSegment = 0.3,
  ...rest
}: TextEffectProps) => {
  const shouldReduce = useReducedMotion();
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  const { container, item } = useMemo<{
    container: Variants;
    item: Variants;
  }>(() => {
    const baseItem = presets[preset];
    return {
      container: {
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: speedSegment / 10,
          },
        },
      },
      item: {
        hidden: baseItem.hidden,
        visible: {
          ...baseItem.visible,
          transition: {
            bounce: 0.2,
            duration: speedSegment * 2,
            type: "spring",
          },
        },
      },
    };
  }, [delay, preset, speedSegment]);

  if (shouldReduce || typeof children !== "string") {
    const Comp = as as ElementType;
    return <Comp {...(rest as object)}>{children}</Comp>;
  }

  const segments = splitText(children, per);

  return (
    <MotionTag
      initial="hidden"
      animate="visible"
      variants={container}
      {...rest}
    >
      {segments.map((segment, index) => (
        <motion.span
          // oxlint-disable-next-line no-array-index-key
          key={index}
          className="inline-block will-change-[transform,filter,opacity]"
          variants={item}
          style={{ whiteSpace: "pre" }}
        >
          {segment}
        </motion.span>
      ))}
    </MotionTag>
  );
};
