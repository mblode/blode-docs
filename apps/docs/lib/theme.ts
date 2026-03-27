import type { SiteConfig } from "@repo/models";
import type { CSSProperties } from "react";

const themeValue = (value: string | undefined, fallback: string) =>
  value ?? fallback;

export const themeStylesFromConfig = (config: SiteConfig): CSSProperties => {
  const { colors } = config;
  const { fonts } = config;
  return {
    "--color-bg": themeValue(colors?.background, "var(--color-bg)"),
    "--color-border": themeValue(colors?.border, "#D4E6E1"),
    "--color-muted": themeValue(colors?.muted, "#6A7D78"),
    "--color-primary": themeValue(colors?.primary, "#0FB59F"),
    "--color-primary-dark": themeValue(colors?.dark, "#0C3A33"),
    "--color-primary-soft": themeValue(colors?.light, "#CFF6EE"),
    "--color-surface": themeValue(colors?.surface, "#F5FBF9"),
    "--font-body": "var(--font-body-default)",
    "--font-heading": "var(--font-heading-default)",
    "--font-mono": "var(--font-mono-default)",
  } as CSSProperties;
};
