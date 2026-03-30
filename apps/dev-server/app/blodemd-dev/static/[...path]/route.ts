import {
  getStaticAssetContentType,
  readStaticAsset,
} from "@dev/lib/local-content-source";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async (
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ path: string[] }>;
  }
) => {
  const { path = [] } = await params;
  const relativePath = path.join("/");

  try {
    const data = await readStaticAsset(relativePath);

    return new NextResponse(data, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": getStaticAssetContentType(relativePath),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
};
