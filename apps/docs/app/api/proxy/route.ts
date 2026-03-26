import { loadSiteConfig } from "@repo/previewing";
import { NextResponse } from "next/server";

import { getTenantContentSource } from "@/lib/content-source";
import { getDefaultTenant, getTenantBySlug } from "@/lib/tenants";

export const POST = async (request: Request) => {
  const payload = (await request.json()) as {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  };

  if (!(payload?.url && payload?.method)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const tenantSlug = request.headers.get("x-tenant-slug") ?? "";
  const tenant =
    (await getTenantBySlug(tenantSlug)) ?? (await getDefaultTenant());

  if (!tenant) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 400 });
  }

  const configResult = await loadSiteConfig(getTenantContentSource(tenant));
  if (!configResult.ok) {
    return NextResponse.json({ error: "Invalid site config" }, { status: 400 });
  }

  const { config } = configResult;
  if (!config.openapiProxy?.enabled) {
    return NextResponse.json({ error: "Proxy disabled" }, { status: 403 });
  }

  const url = new URL(payload.url);
  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
  }
  const allowedHosts = config.openapiProxy.allowedHosts ?? [];
  if (allowedHosts.length && !allowedHosts.includes(url.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
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
