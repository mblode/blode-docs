import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const path = searchParams.get("path");

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
