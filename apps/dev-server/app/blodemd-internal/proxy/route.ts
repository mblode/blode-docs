import { getOpenApiProxyContext } from "@dev/lib/local-runtime";
import { NextResponse } from "next/server";

interface ProxyPayload {
  body?: string;
  headers?: Record<string, string>;
  method: string;
  url: string;
}

const jsonError = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const resolveAllowedHosts = async () => {
  const context = await getOpenApiProxyContext();

  if (!context) {
    return null;
  }

  const configuredHosts = context.config.openapiProxy?.allowedHosts ?? [];
  if (configuredHosts.length) {
    return configuredHosts;
  }

  const derivedHosts = context.registry.entries.flatMap((entry) =>
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

  const context = await getOpenApiProxyContext();
  if (!context) {
    return jsonError("Invalid docs configuration", 400);
  }

  if (!context.config.openapiProxy?.enabled) {
    return jsonError("Proxy disabled", 403);
  }

  const url = new URL(payload.url);
  if (!["http:", "https:"].includes(url.protocol)) {
    return jsonError("Invalid protocol", 400);
  }

  const allowedHosts = await resolveAllowedHosts();
  if (!allowedHosts?.length) {
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
