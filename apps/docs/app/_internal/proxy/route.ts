import type { SiteConfig, Tenant } from "@repo/models";
import { loadSiteConfig } from "@repo/previewing";
import { NextResponse } from "next/server";

import { getTenantContentSource } from "@/lib/content-source";
import { getDocsCollectionWithNavigation } from "@/lib/docs-collection";
import { buildOpenApiRegistry } from "@/lib/openapi";
import { getRequestHost, resolveTenant } from "@/lib/tenancy";
import { getTenantBySlug } from "@/lib/tenants";

interface ProxyPayload {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

const getTenantPathFromReferer = (request: Request) => {
  const referer = request.headers.get("referer");
  if (!referer) {
    return "/";
  }

  try {
    return new URL(referer).pathname || "/";
  } catch {
    return "/";
  }
};

const jsonError = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const loadResolvedTenant = async (request: Request) => {
  const host = getRequestHost(request.headers);
  const resolution = host
    ? await resolveTenant(host, getTenantPathFromReferer(request))
    : null;

  if (!resolution) {
    return null;
  }

  return getTenantBySlug(resolution.tenant.slug);
};

const resolveAllowedHosts = async (config: SiteConfig, tenant: Tenant) => {
  const configuredHosts = config.openapiProxy?.allowedHosts ?? [];
  if (configuredHosts.length || !tenant) {
    return configuredHosts;
  }

  const registry = await buildOpenApiRegistry(
    getDocsCollectionWithNavigation(config),
    getTenantContentSource(tenant)
  );
  const derivedHosts = registry.entries.flatMap((entry) =>
    (entry.spec.servers ?? []).flatMap((server) => {
      try {
        return [new URL(server.url).hostname];
      } catch {
        return [];
      }
    })
  );

  return [...new Set(derivedHosts)];
};

export const POST = async (request: Request) => {
  const payload = (await request.json()) as ProxyPayload;

  if (!(payload?.url && payload?.method)) {
    return jsonError("Invalid payload", 400);
  }

  const tenant = await loadResolvedTenant(request);
  if (!tenant) {
    return jsonError("Unknown tenant", 400);
  }

  const configResult = await loadSiteConfig(getTenantContentSource(tenant));
  if (!configResult.ok) {
    return jsonError("Invalid site config", 400);
  }

  const { config } = configResult;
  if (!config.openapiProxy?.enabled) {
    return jsonError("Proxy disabled", 403);
  }

  const url = new URL(payload.url);
  if (!["http:", "https:"].includes(url.protocol)) {
    return jsonError("Invalid protocol", 400);
  }

  const allowedHosts = await resolveAllowedHosts(config, tenant);
  if (!allowedHosts.length) {
    return jsonError(
      "No proxy allowlist is configured for this docs.json.",
      403
    );
  }
  if (!allowedHosts.includes(url.hostname)) {
    return jsonError("Host not allowed", 403);
  }

  const method = payload.method.toUpperCase();
  const response = await fetch(payload.url, {
    body: method === "GET" ? undefined : payload.body,
    headers: payload.headers,
    method,
  });

  const text = await response.text();
  return new NextResponse(text, {
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/plain",
    },
    status: response.status,
  });
};
