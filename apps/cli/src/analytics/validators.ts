import { InvalidArgumentError } from "commander";

const GA4_MEASUREMENT_ID_REGEX = /^G-[A-Z0-9]{4,20}$/;
const POSTHOG_PROJECT_KEY_REGEX = /^phc_[A-Za-z0-9]{20,}$/;

export const parseGa4MeasurementId = (value: string): string => {
  const trimmed = value.trim();
  if (!GA4_MEASUREMENT_ID_REGEX.test(trimmed)) {
    throw new InvalidArgumentError(
      "GA4 measurement IDs look like G-XXXXXXXXXX."
    );
  }
  return trimmed;
};

export const parsePosthogProjectKey = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("phx_")) {
    throw new InvalidArgumentError(
      "Personal API keys (phx_) are not supported. Use the project API key (phc_)."
    );
  }
  if (!POSTHOG_PROJECT_KEY_REGEX.test(trimmed)) {
    throw new InvalidArgumentError(
      "PostHog project keys start with phc_ followed by 20+ characters."
    );
  }
  return trimmed;
};

export const parsePosthogHost = (value: string): string => {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      throw new InvalidArgumentError("PostHog host must use https://");
    }
  } catch (error) {
    if (error instanceof InvalidArgumentError) {
      throw error;
    }
    throw new InvalidArgumentError("PostHog host must be a valid URL.");
  }
  return trimmed;
};

export const parseProvider = (value: string): "ga4" | "posthog" => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "ga4" || normalized === "posthog") {
    return normalized;
  }
  throw new InvalidArgumentError(
    `Unknown provider "${value}". Expected "ga4" or "posthog".`
  );
};
