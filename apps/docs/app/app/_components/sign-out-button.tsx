"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabase";

export const SignOutButton = () => {
  const [pending, setPending] = useState(false);

  const handleSignOut = useCallback(async () => {
    setPending(true);
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }, []);

  return (
    <Button
      disabled={pending}
      onClick={handleSignOut}
      size="sm"
      type="button"
      variant="ghost"
    >
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
};
