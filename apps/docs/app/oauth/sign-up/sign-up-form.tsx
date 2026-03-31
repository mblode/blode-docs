"use client";

import { EyeOpenIcon, EyeSlashIcon } from "blode-icons-react";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";

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
import { createSupabaseClient } from "@/lib/supabase";

import { approveOrRedirect } from "../client-utils";
import { withSearchParams } from "../search-params";

interface SignUpFormProps {
  authorizationId: string | null;
  searchParamsString: string;
}

export const SignUpForm = ({
  authorizationId,
  searchParamsString,
}: SignUpFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = useCallback(
    () => setShowPassword((prev) => !prev),
    []
  );

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

      if (!authorizationId) {
        return "Missing authorization_id.";
      }

      return await approveOrRedirect(authorizationId);
    },
    null
  );

  const signInHref = withSearchParams("/oauth/consent", searchParamsString);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Blode.md</CardTitle>
          <CardDescription>
            Create an account to authorize the CLI
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={submitAction}>
            <FieldGroup>
              {error && <FieldError>{error}</FieldError>}

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
                  autoComplete="new-password"
                  className="pr-10"
                  rightControl={
                    <button
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="flex h-full items-center px-3 text-muted-foreground hover:text-foreground"
                      onClick={togglePassword}
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
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Creating account..." : "Create account"}
                </Button>

                <Button variant="outline" className="w-full" asChild>
                  <Link href={signInHref}>
                    Already have an account? Sign in
                  </Link>
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
