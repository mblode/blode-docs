"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthogJs from "posthog-js";
import { useEffect } from "react";

const DEFAULT_POSTHOG_HOST = "https://us.i.posthogJs.com";

interface PostHogProviderProps {
  projectKey: string;
  host?: string;
}

export const PostHogProvider = ({ projectKey, host }: PostHogProviderProps) => {
  useEffect(() => {
    if (!projectKey) {
      return;
    }
    if (posthogJs.__loaded) {
      return;
    }
    posthogJs.init(projectKey, {
      api_host: host || DEFAULT_POSTHOG_HOST,
      capture_pageleave: true,
      capture_pageview: false,
      person_profiles: "identified_only",
    });
  }, [projectKey, host]);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!(pathname && posthogJs.__loaded)) {
      return;
    }
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    posthogJs.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
};
