"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import { createSupabaseClient } from "../../../lib/supabase";

const SignUpForm = () => {
  const searchParams = useSearchParams();

  const [error, submitAction, isPending] = useActionState(
    async (_previousState: string | null, formData: FormData) => {
      const email = formData.get("email") as string;
      const pw = formData.get("password") as string;

      if (!email || !pw) {
        return "Email and password are required.";
      }

      const supabase = createSupabaseClient();

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: pw,
      });
      if (signUpError) {
        return signUpError.message;
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password: pw });

      if (signInError) {
        return signInError.message;
      }

      if (!data.session) {
        return "Failed to create session.";
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      window.location.href = `${supabaseUrl}/auth/v1/oauth/authorize?${searchParams.toString()}`;
      return null;
    },
    null
  );

  const signInHref = `/oauth/consent?${searchParams.toString()}`;

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
          Create an account to authorize the CLI
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
            autoComplete="new-password"
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
            {isPending ? "Creating account..." : "Create account"}
          </button>

          <Link
            href={signInHref}
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
            Already have an account? Sign in
          </Link>
        </form>
      </div>
    </div>
  );
};

export default function OAuthSignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
