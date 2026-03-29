"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useState } from "react";

import { createSupabaseClient } from "../../../lib/supabase";

const ConsentForm = () => {
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email ?? null);
      }
    };
    checkSession();
  }, []);

  const [error, submitAction, isPending] = useActionState(
    async (_previousState: string | null, formData: FormData) => {
      const mode = formData.get("mode") as string;
      const supabase = createSupabaseClient();

      if (mode === "approve") {
        // User is already authenticated — approve the consent
        const consentParams = new URLSearchParams();
        for (const [key, value] of searchParams.entries()) {
          consentParams.set(key, value);
        }

        // Redirect back to Supabase authorize endpoint to complete the flow
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
        window.location.href = `${supabaseUrl}/auth/v1/oauth/authorize?${consentParams.toString()}`;
        return null;
      }

      // Sign in flow
      const email = formData.get("email") as string;
      const pw = formData.get("password") as string;

      if (!email || !pw) {
        return "Email and password are required.";
      }

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: pw,
        });
        if (signUpError) {
          return signUpError.message;
        }
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password: pw });

      if (signInError) {
        return signInError.message;
      }

      if (!data.session) {
        return "Failed to create session.";
      }

      setIsAuthenticated(true);
      setUserEmail(data.session.user.email ?? null);

      // After sign-in, redirect back to authorize endpoint with the session
      const consentParams = new URLSearchParams();
      for (const [key, value] of searchParams.entries()) {
        consentParams.set(key, value);
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      window.location.href = `${supabaseUrl}/auth/v1/oauth/authorize?${consentParams.toString()}`;
      return null;
    },
    null
  );

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

        {error && (
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
            {error}
          </div>
        )}

        {isAuthenticated ? (
          <form action={submitAction}>
            <p
              style={{
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              Signed in as <strong>{userEmail}</strong>
            </p>
            <button
              type="submit"
              name="mode"
              value="approve"
              disabled={isPending}
              style={{
                background: "#171717",
                borderRadius: "0.5rem",
                color: "#fff",
                cursor: isPending ? "wait" : "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                opacity: isPending ? 0.7 : 1,
                padding: "0.625rem",
                width: "100%",
              }}
            >
              {isPending ? "Authorizing..." : "Authorize"}
            </button>
          </form>
        ) : (
          <form action={submitAction}>
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
                display: "block",
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
                padding: "0.625rem 0.75rem",
                width: "100%",
              }}
            />

            <button
              type="submit"
              name="mode"
              value="signin"
              disabled={isPending}
              style={{
                background: "#171717",
                borderRadius: "0.5rem",
                color: "#fff",
                cursor: isPending ? "wait" : "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                marginBottom: "0.5rem",
                opacity: isPending ? 0.7 : 1,
                padding: "0.625rem",
                width: "100%",
              }}
            >
              {isPending ? "Signing in..." : "Sign in"}
            </button>

            <button
              type="submit"
              name="mode"
              value="signup"
              disabled={isPending}
              style={{
                background: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                color: "#171717",
                cursor: isPending ? "wait" : "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                opacity: isPending ? 0.7 : 1,
                padding: "0.625rem",
                width: "100%",
              }}
            >
              Create account
            </button>
          </form>
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
