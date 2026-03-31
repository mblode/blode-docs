import type { DomainStatus } from "@repo/db/schema";

import { readTrimmedEnv } from "./env";

export const rootDomain = readTrimmedEnv("PLATFORM_ROOT_DOMAIN") ?? "blode.md";
export const autoWwwRedirect = process.env.VERCEL_AUTO_WWW_REDIRECT === "true";
export const preferCustomDomain = process.env.PREFER_CUSTOM_DOMAIN === "true";
export const adminApiToken = readTrimmedEnv("ADMIN_API_TOKEN");
export const validConfiguredDomainStatus: DomainStatus = "valid_configuration";
