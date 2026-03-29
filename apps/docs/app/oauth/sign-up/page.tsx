"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

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
                  type="password"
                  required
                  autoComplete="new-password"
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

export default function OAuthSignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
