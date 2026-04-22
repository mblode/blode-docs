import { z } from "zod";

const GA4_MEASUREMENT_ID_REGEX = /^G-[A-Z0-9]{4,20}$/;
const POSTHOG_PROJECT_KEY_REGEX = /^phc_[A-Za-z0-9]{20,}$/;

export const ProjectAnalyticsGa4Schema = z.object({
  measurementId: z
    .string()
    .regex(
      GA4_MEASUREMENT_ID_REGEX,
      "GA4 measurement IDs look like G-XXXXXXXXXX."
    ),
});
export type ProjectAnalyticsGa4 = z.infer<typeof ProjectAnalyticsGa4Schema>;

export const ProjectAnalyticsPosthogSchema = z.object({
  host: z.string().url().optional(),
  projectKey: z
    .string()
    .regex(
      POSTHOG_PROJECT_KEY_REGEX,
      "PostHog project keys start with phc_. Personal API keys (phx_) are not supported."
    ),
});
export type ProjectAnalyticsPosthog = z.infer<
  typeof ProjectAnalyticsPosthogSchema
>;

export const ProjectAnalyticsSchema = z.object({
  ga4: ProjectAnalyticsGa4Schema.optional(),
  posthog: ProjectAnalyticsPosthogSchema.optional(),
});
export type ProjectAnalytics = z.infer<typeof ProjectAnalyticsSchema>;
