"use client";

import { motion, useReducedMotion } from "motion/react";
import type { HTMLMotionProps, Variants } from "motion/react";
import { Children as ReactChildren } from "react";
import type { ReactNode } from "react";

interface AnimatedGroupProps extends Omit<
  HTMLMotionProps<"div">,
  "children" | "variants"
> {
  children: ReactNode;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
}

const defaultVariants: { container: Variants; item: Variants } = {
  container: {
    hidden: {},
    visible: {
      transition: {
        delayChildren: 0.15,
        staggerChildren: 0.05,
      },
    },
  },
  item: {
    hidden: { filter: "blur(8px)", opacity: 0, y: 8 },
    visible: {
      filter: "blur(0px)",
      opacity: 1,
      transition: { bounce: 0.3, duration: 1.2, type: "spring" },
      y: 0,
    },
  },
};

export const AnimatedGroup = ({
  children,
  variants,
  ...rest
}: AnimatedGroupProps) => {
  const shouldReduce = useReducedMotion();
  const container = variants?.container ?? defaultVariants.container;
  const item = variants?.item ?? defaultVariants.item;

  if (shouldReduce) {
    return <div {...(rest as object)}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={container}
      {...rest}
    >
      {ReactChildren.toArray(children).map((child, index) => (
        <motion.div
          // oxlint-disable-next-line no-array-index-key
          key={index}
          variants={item}
          className="will-change-[transform,filter,opacity]"
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};
