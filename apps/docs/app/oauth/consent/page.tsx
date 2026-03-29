"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useState } from "react";

import { createSupabaseClient } from "../../../lib/supabase";

const ConsentForm = () => {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<{
    checked: boolean;
    email: string | null;
  }>({ checked: false, email: null });

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      setSession({
        checked: true,
        email: s?.user?.email ?? null,
      });
    };
    checkSession();
  }, []);

  const redirectToAuthorize = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    window.location.href = `${supabaseUrl}/auth/v1/oauth/authorize?${searchParams.toString()}`;
  };

  const [approveError, approveAction, isApproving] = useActionState(() => {
    redirectToAuthorize();
    return null;
  }, null);

  const [signInError, signInAction, isSigningIn] = useActionState(
    async (_previousState: string | null, formData: FormData) => {
      const email = formData.get("email") as string;
      const pw = formData.get("password") as string;

      if (!email || !pw) {
        return "Email and password are required.";
      }

      const supabase = createSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });

      if (authError) {
        return authError.message;
      }

      redirectToAuthorize();
      return null;
    },
    null
  );

  const signUpHref = `/oauth/sign-up?${searchParams.toString()}`;
  const isAuthenticated = session.checked && session.email !== null;

  if (!session.checked) {
    return (
      <div
        style={{
          alignItems: "center",
          display: "flex",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          justifyContent: "center",
          minHeight: "100vh",
          padding: "1rem",
        }}
      />
    );
  }

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1rem",
      }}
    >
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          Blode.md
        </h1>
        <p
          style={{
            color: "#666",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          {isAuthenticated
            ? "Authorize the CLI to access your account"
            : "Sign in to authorize the CLI"}
        </p>

        {isAuthenticated ? (
          <>
            {approveError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "0.5rem",
                  color: "#dc2626",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                  padding: "0.75rem",
                }}
              >
                {approveError}
              </div>
            )}
            <form action={approveAction}>
              <p
                style={{
                  fontSize: "0.875rem",
                  marginBottom: "1.5rem",
                  textAlign: "center",
                }}
              >
                Signed in as <strong>{session.email}</strong>
              </p>
              <button
                type="submit"
                disabled={isApproving}
                style={{
                  background: "#171717",
                  borderRadius: "0.5rem",
                  color: "#fff",
                  cursor: isApproving ? "wait" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  opacity: isApproving ? 0.7 : 1,
                  padding: "0.625rem",
                  width: "100%",
                }}
              >
                {isApproving ? "Authorizing..." : "Authorize"}
              </button>
            </form>
          </>
        ) : (
          <>
            {signInError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "0.5rem",
                  color: "#dc2626",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                  padding: "0.75rem",
                }}
              >
                {signInError}
              </div>
            )}
            <form action={signInAction}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  boxSizing: "border-box",
                  display: "block",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                  padding: "0.625rem 0.75rem",
                  width: "100%",
                }}
              />

              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "0.25rem",
                }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  boxSizing: "border-box",
                  display: "block",
                  fontSize: "0.875rem",
                  marginBottom: "1.5rem",
                  padding: "0.625rem 0.75rem",
                  width: "100%",
                }}
              />

              <button
                type="submit"
                disabled={isSigningIn}
                style={{
                  background: "#171717",
                  borderRadius: "0.5rem",
                  color: "#fff",
                  cursor: isSigningIn ? "wait" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "0.5rem",
                  opacity: isSigningIn ? 0.7 : 1,
                  padding: "0.625rem",
                  width: "100%",
                }}
              >
                {isSigningIn ? "Signing in..." : "Sign in"}
              </button>

              <Link
                href={signUpHref}
                style={{
                  background: "transparent",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  boxSizing: "border-box",
                  color: "#171717",
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  padding: "0.625rem",
                  textAlign: "center",
                  textDecoration: "none",
                  width: "100%",
                }}
              >
                Create account
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default function OAuthConsentPage() {
  return (
    <Suspense>
      <ConsentForm />
    </Suspense>
  );
}
