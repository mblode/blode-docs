"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type MorphIconName = "cross" | "menu";

interface MorphIconProps extends React.SVGAttributes<SVGSVGElement> {
  icon: MorphIconName;
  size?: number;
  strokeWidth?: number;
}

const ICONS = {
  cross: {
    opacity: [1, 1, 0] as const,
    paths: [
      "M3 3L11 11",
      "M11 3L3 11",
      "M7 7L7 7",
    ] as const,
  },
  menu: {
    opacity: [1, 1, 1] as const,
    paths: ["M1 3.5L13 3.5", "M1 7L13 7", "M1 10.5L13 10.5"] as const,
  },
} as const;

const transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as const,
};

const instantTransition = { duration: 0 };

export const MorphIcon = ({
  icon,
  size = 32,
  strokeWidth = 1.5,
  className,
  style,
  ...props
}: MorphIconProps) => {
  const prefersReducedMotion = useReducedMotion();
  const def = ICONS[icon];
  const [p0, p1, p2] = def.paths;
  const [o0, o1, o2] = def.opacity;
  const t = prefersReducedMotion ? instantTransition : transition;

  return (
    <svg
      aria-hidden="true"
      className={cn("text-current", className)}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={strokeWidth}
      style={style}
      viewBox="0 0 14 14"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <motion.path
        initial={false}
        animate={{ d: p0, opacity: o0 }}
        transition={t}
      />
      <motion.path
        initial={false}
        animate={{ d: p1, opacity: o1 }}
        transition={t}
      />
      <motion.path
        initial={false}
        animate={{ d: p2, opacity: o2 }}
        transition={t}
      />
    </svg>
  );
};
