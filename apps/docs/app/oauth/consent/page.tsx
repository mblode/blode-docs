"use client";

import { EyeOpenIcon, EyeSlashIcon } from "blode-icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { createSupabaseClient } from "../../../lib/supabase";

const approveOrRedirect = async (authorizationId: string) => {
  const supabase = createSupabaseClient();

  // Check if consent was already given — Supabase returns redirect_url directly
  const { data: details } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (details?.redirect_url) {
    window.location.assign(details.redirect_url);
    return null;
  }

  // Consent not yet given — approve explicitly
  const { error } =
    await supabase.auth.oauth.approveAuthorization(authorizationId);
  if (error) {
    return error.message;
  }
  return null;
};

const ConsentForm = () => {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = useCallback(
    () => setShowPassword((prev) => !prev),
    []
  );
  const [session, setSession] = useState<{
    checked: boolean;
    email: string | null;
  }>({ checked: false, email: null });

  const authorizationId = searchParams.get("authorization_id");
  const [autoApproveError, setAutoApproveError] = useState<string | null>(null);
  const handleSignOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setSession({ checked: true, email: null });
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session: s },
      } = await supabase.auth.getSession();

      if (s?.user?.email && authorizationId) {
        // Already signed in — try to auto-approve or redirect
        const errorMsg = await approveOrRedirect(authorizationId);
        if (errorMsg) {
          setSession({ checked: true, email: s.user.email });
          setAutoApproveError(errorMsg);
          return;
        }
        // If approveOrRedirect succeeded, the browser is redirecting
        return;
      }

      setSession({
        checked: true,
        email: s?.user?.email ?? null,
      });
    };
    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [approveError, approveAction, isApproving] = useActionState(
    async () => {
      if (!authorizationId) {
        return "Missing authorization_id.";
      }
      return await approveOrRedirect(authorizationId);
    },
    null
  );

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

      if (!authorizationId) {
        return "Missing authorization_id.";
      }

      return await approveOrRedirect(authorizationId);
    },
    null
  );

  const signUpHref = `/oauth/sign-up?${searchParams.toString()}`;
  const isAuthenticated = session.checked && session.email !== null;
  const displayError = approveError ?? autoApproveError;

  if (!session.checked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Blode.md</CardTitle>
          <CardDescription>
            {isAuthenticated
              ? "Authorize the CLI to access your account"
              : "Sign in to authorize the CLI"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isAuthenticated ? (
            <form action={approveAction}>
              <FieldGroup>
                {displayError && (
                  <FieldError>
                    {displayError.includes("authorization not found")
                      ? "This authorization link has expired. Please run `blodemd login` again in your terminal."
                      : displayError}
                  </FieldError>
                )}
                <p className="text-center text-sm">
                  Signed in as <strong>{session.email}</strong>
                </p>
                <Button type="submit" className="w-full" disabled={isApproving}>
                  {isApproving ? "Authorizing..." : "Authorize"}
                </Button>
                <button
                  type="button"
                  className="text-center text-sm text-muted-foreground hover:text-foreground"
                  onClick={handleSignOut}
                >
                  Not you? Sign out
                </button>
              </FieldGroup>
            </form>
          ) : (
            <form action={signInAction}>
              <FieldGroup>
                {signInError && <FieldError>{signInError}</FieldError>}

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                    rightControl={
                      <button
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="flex h-full items-center px-3 text-muted-foreground hover:text-foreground"
                        onClick={togglePassword}
                        tabIndex={-1}
                        type="button"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeOpenIcon className="h-4 w-4" />
                        )}
                      </button>
                    }
                  />
                </Field>

                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSigningIn}
                  >
                    {isSigningIn ? "Signing in..." : "Sign in"}
                  </Button>

                  <Button variant="outline" className="w-full" asChild>
                    <Link href={signUpHref}>Create account</Link>
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
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
