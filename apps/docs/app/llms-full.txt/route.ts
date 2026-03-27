import { NextResponse } from "next/server";

import { resolveRequestTenant } from "@/lib/request-tenant";
import { buildTenantLlmsFullTxt } from "@/lib/tenant-static";

export const GET = async () => {
  const resolved = await resolveRequestTenant("/llms-full.txt");
  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  const content = await buildTenantLlmsFullTxt(resolved.tenant, {
    protocol: resolved.protocol,
    requestedHost: resolved.resolution.host,
    strategy: resolved.resolution.strategy,
  });

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain",
    },
  });
};
