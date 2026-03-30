import { revalidatePath, revalidateTag } from "next/cache";
import { after, NextResponse } from "next/server";

import {
  clearDocsRuntimeCaches,
  clearDocsRuntimeCachesForTenant,
} from "@/lib/docs-runtime";
import { clearTenantResolutionCache } from "@/lib/tenancy";
import { clearTenantCache } from "@/lib/tenants";

interface RevalidatePayload {
  path?: string;
  paths?: string[];
  secret?: string;
  tag?: string;
  tags?: string[];
  tenantId?: string;
}

const readValues = (value?: string, values?: string[]) =>
  [value, ...(values ?? [])].filter(
    (item): item is string => item !== undefined && item !== ""
  );

const handleRevalidation = (payload: RevalidatePayload) => {
  const { secret } = payload;
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paths = readValues(payload.path, payload.paths);
  const tags = readValues(payload.tag, payload.tags);
  if (!paths.length && !tags.length) {
    return NextResponse.json({ error: "Missing path or tag" }, { status: 400 });
  }

  for (const path of paths) {
    revalidatePath(path);
  }
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  after(() => {
    if (payload.tenantId) {
      clearDocsRuntimeCachesForTenant(payload.tenantId);
    } else {
      clearDocsRuntimeCaches();
      clearTenantCache();
      clearTenantResolutionCache();
    }
  });

  return NextResponse.json({ paths, revalidated: true, tags });
};

export const GET = (request: Request) => {
  const { searchParams } = new URL(request.url);
  return handleRevalidation({
    path: searchParams.get("path") ?? undefined,
    secret: searchParams.get("secret") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
  });
};

export const POST = async (request: Request) => {
  const payload = (await request.json()) as RevalidatePayload;
  return handleRevalidation(payload);
};
