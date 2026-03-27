import { NextResponse } from "next/server";

import { resolveRequestTenant } from "@/lib/request-tenant";
import { getLlmPageText } from "@/lib/tenant-static";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
) => {
  const { slug = [] } = await params;
  const slugKey = slug.join("/") || "index";

  const resolved = await resolveRequestTenant(`/llms.mdx/${slugKey}`);
  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  const content = await getLlmPageText(resolved.tenant, slugKey);
  if (!content) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/markdown",
    },
  });
};
