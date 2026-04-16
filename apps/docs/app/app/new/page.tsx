import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase";

import { NewProjectWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/oauth/consent?redirect_to=/app/new");
  }
  return <NewProjectWizard accessToken={session.access_token} />;
}
