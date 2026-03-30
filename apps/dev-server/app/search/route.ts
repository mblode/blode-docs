import { getSearchItems } from "@dev/lib/local-runtime";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async (): Promise<Response> => {
  const items = await getSearchItems();

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
};
