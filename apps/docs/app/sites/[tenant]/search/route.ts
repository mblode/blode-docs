import { NextResponse } from "next/server";

import { getTenantSearchItems } from "@/lib/docs-runtime";

interface SearchItem {
  href?: string;
  title: string;
  path: string;
}

export const GET = async (
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ tenant: string }>;
  }
) => {
  const { tenant } = await params;
  const items = ((await getTenantSearchItems(tenant)) ?? []) as SearchItem[];

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
};
