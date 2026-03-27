import type { SiteConfig } from "@repo/models";
import type { CSSProperties } from "react";

export const themeStylesFromConfig = (config: SiteConfig): CSSProperties => {
  const { colors } = config;
  if (!colors) {
    return {};
  }

  const styles: Record<string, string> = {};

  if (colors.primary) {
    styles["--color-primary"] = colors.primary;
  }
  if (colors.border) {
    styles["--color-border"] = colors.border;
  }
  if (colors.muted) {
    styles["--color-muted"] = colors.muted;
  }
  if (colors.surface) {
    styles["--color-surface"] = colors.surface;
  }
  if (colors.background) {
    styles["--color-background"] = colors.background;
  }

  return styles as CSSProperties;
};
