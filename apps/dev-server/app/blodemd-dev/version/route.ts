import { getDevVersion } from "@dev/lib/dev-state";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = () =>
  NextResponse.json(
    { version: getDevVersion() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
