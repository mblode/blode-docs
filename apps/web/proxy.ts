import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SLUG_BY_PATH: Record<string, string> = {
  "/": "home",
  "/about": "about",
  "/blog": "blog",
  "/pricing": "pricing",
  "/privacy": "privacy",
  "/security": "security",
  "/terms": "terms",
};

const prefersMarkdown = (accept: string | null): boolean => {
  if (!accept) {
    return false;
  }
  const entries = accept.split(",").map((part) => {
    const [raw, ...params] = part.trim().split(";");
    const type = (raw ?? "").trim().toLowerCase();
    const qParam = params
      .map((p) => p.trim())
      .find((p) => p.toLowerCase().startsWith("q="));
    const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
    return { q: Number.isFinite(q) ? q : 0, type };
  });
  const md = entries.find((e) => e.type === "text/markdown");
  if (!md || md.q <= 0) {
    return false;
  }
  const html = entries.find((e) => e.type === "text/html" || e.type === "*/*");
  if (!html) {
    return true;
  }
  return md.q >= html.q;
};

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const slug = SLUG_BY_PATH[pathname];
  if (!slug) {
    return NextResponse.next();
  }
  if (!prefersMarkdown(request.headers.get("accept"))) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = `/markdown/${slug}`;
  return NextResponse.rewrite(url);
};

export const config = {
  matcher: [
    "/",
    "/about",
    "/blog",
    "/pricing",
    "/privacy",
    "/security",
    "/terms",
  ],
};
