"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "atlas-theme";

type ThemeMode = "light" | "dark";

export const ThemeToggle = () => {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const nextMode = stored ?? (prefersDark ? "dark" : "light");
    setMode(nextMode);
    document.documentElement.dataset.theme = nextMode;
  }, []);

  const toggle = useCallback(() => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  }, [mode]);

  return (
    <button
      aria-label="Toggle theme"
      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm"
      onClick={toggle}
      type="button"
    >
      <span>{mode === "dark" ? "Dark" : "Light"}</span>
      <span aria-hidden>{mode === "dark" ? "\u263E" : "\u2600"}</span>
    </button>
  );
};
