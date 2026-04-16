import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

const DEFAULT_REDIRECT = "/app";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirect_to") ?? DEFAULT_REDIRECT;
  const authorizationId = url.searchParams.get("authorization_id");

  if (!code) {
    return NextResponse.redirect(new URL("/oauth/consent", url.origin));
  }

  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failed = new URL("/oauth/consent", url.origin);
    failed.searchParams.set("error", error.message);
    return NextResponse.redirect(failed);
  }

  if (authorizationId) {
    const consent = new URL("/oauth/consent", url.origin);
    consent.searchParams.set("authorization_id", authorizationId);
    return NextResponse.redirect(consent);
  }

  const safeRedirect = redirectTo.startsWith("/")
    ? redirectTo
    : DEFAULT_REDIRECT;
  return NextResponse.redirect(new URL(safeRedirect, url.origin));
};
