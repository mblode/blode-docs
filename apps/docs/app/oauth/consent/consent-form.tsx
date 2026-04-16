"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { createSupabaseClient } from "@/lib/supabase";

import { approveOrRedirect, formatAuthorizationError } from "../client-utils";

interface ConsentFormProps {
  authorizationId: string | null;
  errorMessage: string | null;
}

const GitHubMark = () => (
  <svg
    aria-hidden
    height="20"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.18c-3.2.69-3.88-1.37-3.88-1.37-.52-1.34-1.27-1.7-1.27-1.7-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.74 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.19a11.07 11.07 0 0 1 5.79 0c2.21-1.5 3.18-1.19 3.18-1.19.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.15v3.18c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
      fill="currentColor"
    />
  </svg>
);

export const ConsentForm = ({
  authorizationId,
  errorMessage,
}: ConsentFormProps) => {
  const [session, setSession] = useState<{
    checked: boolean;
    email: string | null;
  }>({ checked: false, email: null });
  const [autoApproveError, setAutoApproveError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(errorMessage);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleSignOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setSession({ checked: true, email: null });
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession?.user?.email && authorizationId) {
        const errorText = await approveOrRedirect(authorizationId);
        if (errorText) {
          setSession({ checked: true, email: currentSession.user.email });
          setAutoApproveError(errorText);
          return;
        }

        return;
      }

      setSession({
        checked: true,
        email: currentSession?.user?.email ?? null,
      });
    };

    checkSession();
  }, [authorizationId]);

  const handleApprove = useCallback(async () => {
    if (!authorizationId) {
      setAutoApproveError("Missing authorization_id.");
      return;
    }
    setIsApproving(true);
    const errorText = await approveOrRedirect(authorizationId);
    setIsApproving(false);
    if (errorText) {
      setAutoApproveError(errorText);
    }
  }, [authorizationId]);

  const handleGitHubSignIn = useCallback(async () => {
    setSignInError(null);
    setIsSigningIn(true);
    const supabase = createSupabaseClient();
    const redirect = new URL("/oauth/callback", window.location.origin);
    if (authorizationId) {
      redirect.searchParams.set("authorization_id", authorizationId);
    } else {
      redirect.searchParams.set("redirect_to", "/app");
    }
    const { error } = await supabase.auth.signInWithOAuth({
      options: {
        redirectTo: redirect.toString(),
        scopes: "read:user user:email",
      },
      provider: "github",
    });
    if (error) {
      setSignInError(error.message);
      setIsSigningIn(false);
    }
  }, [authorizationId]);

  const isAuthenticated = session.checked && session.email !== null;
  const displayError = autoApproveError;

  if (!session.checked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" />
    );
  }

  let description = "Sign in with GitHub to get started";
  if (isAuthenticated) {
    description = authorizationId
      ? "Authorize the CLI to access your account"
      : "Continue to your dashboard";
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Blode.md</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          {isAuthenticated ? (
            <FieldGroup>
              {displayError && (
                <FieldError>
                  {formatAuthorizationError(displayError)}
                </FieldError>
              )}
              <p className="text-center text-sm">
                Signed in as <strong>{session.email}</strong>
              </p>
              {authorizationId ? (
                <Button
                  className="w-full"
                  disabled={isApproving}
                  onClick={handleApprove}
                  type="button"
                >
                  {isApproving ? "Authorizing..." : "Authorize"}
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href="/app">Go to dashboard</Link>
                </Button>
              )}
              <button
                className="text-center text-sm text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                type="button"
              >
                Not you? Sign out
              </button>
            </FieldGroup>
          ) : (
            <FieldGroup>
              {signInError && <FieldError>{signInError}</FieldError>}
              <Button
                className="w-full"
                disabled={isSigningIn}
                onClick={handleGitHubSignIn}
                type="button"
              >
                <GitHubMark />
                {isSigningIn ? "Redirecting..." : "Continue with GitHub"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We use GitHub for sign-in so you can install the Blode.md app on
                your docs repo from the same account.
              </p>
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
