import { platformRootDomain } from "./env";

export const MARKETING_ORIGIN = `https://${platformRootDomain}`;

export const MARKETING_CANONICAL_PATHS = [
  "/",
  "/about",
  "/blog",
  "/changelog",
  "/privacy",
  "/security",
  "/terms",
] as const;

export const MARKETING_API_CATALOG_PATH = "/.well-known/api-catalog";
export const MARKETING_SKILLS_INDEX_PATH =
  "/.well-known/agent-skills/index.json";
export const MARKETING_MCP_SERVER_CARD_PATH =
  "/.well-known/mcp/server-card.json";
export const MARKETING_OAUTH_AUTHORIZATION_SERVER_PATH =
  "/.well-known/oauth-authorization-server";
export const MARKETING_OAUTH_PROTECTED_RESOURCE_PATH =
  "/.well-known/oauth-protected-resource";
export const MARKETING_OPENID_CONFIGURATION_PATH =
  "/.well-known/openid-configuration";
export const MARKETING_API_DOCS_PATH = "/docs/api/overview";
export const MARKETING_API_STATUS_PATH = "/api/health";
export const MARKETING_API_SERVICE_DESC_PATH = "/api/openapi.json";

export const marketingUrl = (path: string) => `${MARKETING_ORIGIN}${path}`;
