import { bumpDevVersion } from "@dev/lib/dev-state";
import { clearLocalRuntimeCaches } from "@dev/lib/local-runtime";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const POST = () => {
  clearLocalRuntimeCaches();
  const version = bumpDevVersion();

  return NextResponse.json({ ok: true, version });
};
