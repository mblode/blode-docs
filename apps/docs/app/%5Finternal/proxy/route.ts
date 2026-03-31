import { NextResponse } from "next/server";

import { loadOpenApiProxyConfig } from "@/lib/openapi-proxy";
import { getRequestHost, resolveTenant } from "@/lib/tenancy";
import { TENANT_HEADERS } from "@/lib/tenant-headers";
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

const getTenantSlugFromHeaders = (headerSource: Pick<Headers, "get">) => {
  const slug = headerSource.get(TENANT_HEADERS.SLUG)?.trim();
  return slug || null;
};

const loadResolvedTenant = async (request: Request) => {
  const tenantSlug = getTenantSlugFromHeaders(request.headers);
  if (tenantSlug) {
    return await getTenantBySlug(tenantSlug);
  }

  const host = getRequestHost(request.headers);
  const resolution = host
    ? await resolveTenant(host, getTenantPathFromReferer(request))
    : null;

  if (!resolution) {
    return null;
  }

  return getTenantBySlug(resolution.tenant.slug);
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

  const proxyConfig = await loadOpenApiProxyConfig(tenant);
  if (!proxyConfig) {
    return jsonError("Invalid site config", 400);
  }

  if (!proxyConfig.enabled) {
    return jsonError("Proxy disabled", 403);
  }

  const url = new URL(payload.url);
  if (!["http:", "https:"].includes(url.protocol)) {
    return jsonError("Invalid protocol", 400);
  }

  const { allowedHosts } = proxyConfig;
  if (!allowedHosts.length) {
    return jsonError(
      "No proxy allowlist is configured for this docs.json.",
      403
    );
  }
  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
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
