import type { SiteConfig } from "@repo/models";
import type { CSSProperties } from "react";

export const themeStylesFromConfig = (config: SiteConfig): CSSProperties => {
  const { colors } = config;
  return {
    "--color-bg": colors?.background ?? "var(--color-bg)",
    "--color-border": colors?.border ?? "#D4E6E1",
    "--color-muted": colors?.muted ?? "#6A7D78",
    "--color-primary": colors?.primary ?? "#0FB59F",
    "--color-primary-dark": colors?.dark ?? "#0C3A33",
    "--color-primary-soft": colors?.light ?? "#CFF6EE",
    "--color-surface": colors?.surface ?? "#F5FBF9",
    "--font-body": config.fonts?.body ?? "var(--font-body-default)",
    "--font-heading": config.fonts?.heading ?? "var(--font-heading-default)",
    "--font-mono": config.fonts?.mono ?? "var(--font-mono-default)",
  } as CSSProperties;
};
