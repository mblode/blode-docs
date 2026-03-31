import ArrowRightIcon from "blode-icons-react/icons/arrow-right";
import ArrowUpRightIcon from "blode-icons-react/icons/arrow-up-right";
import CheckIcon from "blode-icons-react/icons/check";
import CodeIcon from "blode-icons-react/icons/code";
import ConsoleIcon from "blode-icons-react/icons/console";
import FlagIcon from "blode-icons-react/icons/flag-1";
import FolderAddRightIcon from "blode-icons-react/icons/folder-add-right";
import GlobusIcon from "blode-icons-react/icons/globus";
import ImacIcon from "blode-icons-react/icons/imac";
import InfoIcon from "blode-icons-react/icons/info";
import KeyIcon from "blode-icons-react/icons/key";
import LockIcon from "blode-icons-react/icons/lock";
import MagnifyingGlassIcon from "blode-icons-react/icons/magnifying-glass";
import PlayIcon from "blode-icons-react/icons/play";
import PuzzleIcon from "blode-icons-react/icons/puzzle";
import RocketIcon from "blode-icons-react/icons/rocket";
import SparkleIcon from "blode-icons-react/icons/sparkle";
import StarIcon from "blode-icons-react/icons/star";
import TriangleExclamationIcon from "blode-icons-react/icons/triangle-exclamation";
import type { ComponentType, ReactElement, SVGProps } from "react";

import { cn } from "@/lib/utils";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
interface DocIconProps {
  icon: string;
  color?: string;
  size?: number;
  className?: string;
}

const DOC_ICON_MAP: Record<string, IconComponent> = {
  "alert-triangle": TriangleExclamationIcon,
  "arrow-right": ArrowRightIcon,
  check: CheckIcon,
  code: CodeIcon,
  "external-link": ArrowUpRightIcon,
  flag: FlagIcon,
  "folder-plus": FolderAddRightIcon,
  globe: GlobusIcon,
  info: InfoIcon,
  key: KeyIcon,
  lock: LockIcon,
  monitor: ImacIcon,
  play: PlayIcon,
  puzzle: PuzzleIcon,
  rocket: RocketIcon,
  search: MagnifyingGlassIcon,
  sparkles: SparkleIcon,
  star: StarIcon,
  terminal: ConsoleIcon,
};

const getIconComponent = (icon: string): IconComponent | null =>
  DOC_ICON_MAP[icon.trim().toLowerCase()] ?? null;

export const DocIcon = ({
  icon,
  color,
  size = 16,
  className,
}: DocIconProps): ReactElement => {
  const IconComponent = getIconComponent(icon);

  if (!IconComponent) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center font-medium uppercase leading-none",
          className
        )}
        style={{
          color: color ?? undefined,
          fontSize: Math.max(10, Math.round(size * 0.55)),
          height: size,
          width: size,
        }}
      >
        {icon.slice(0, 2)}
      </span>
    );
  }

  return (
    <IconComponent
      aria-hidden
      className={cn("shrink-0", className)}
      style={{
        color: color ?? undefined,
        height: size,
        width: size,
      }}
    />
  );
};
