"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 1000;

const readVersion = async (): Promise<number | null> => {
  try {
    const response = await fetch("/blodemd-dev/version", {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { version?: number };
    return typeof payload.version === "number" ? payload.version : null;
  } catch {
    return null;
  }
};

export const DevReloadScript = () => {
  const router = useRouter();
  const currentVersionRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const version = await readVersion();
      if (cancelled || version === null) {
        return;
      }

      if (currentVersionRef.current === null) {
        currentVersionRef.current = version;
        return;
      }

      if (version === currentVersionRef.current || refreshInFlightRef.current) {
        return;
      }

      currentVersionRef.current = version;
      refreshInFlightRef.current = true;

      startTransition(() => {
        router.refresh();
        window.setTimeout(() => {
          refreshInFlightRef.current = false;
        }, 150);
      });
    };

    const pollSafely = async () => {
      try {
        await poll();
      } catch {
        // Ignore transient polling errors during local dev.
      }
    };

    pollSafely();
    const interval = window.setInterval(() => {
      pollSafely();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [router]);

  return null;
};
