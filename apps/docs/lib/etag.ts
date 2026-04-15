import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

export const computeETag = (content: string): string => {
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
  return `"${hash}"`;
};

export const handleIfNoneMatch = (
  request: Request,
  etag: string
): NextResponse | null => {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      headers: { ETag: etag },
      status: 304,
    });
  }
  return null;
};
