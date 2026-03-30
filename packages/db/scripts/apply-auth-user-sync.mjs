import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const sql = postgres(databaseUrl, { prepare: false });

const AUTH_USER_SYNC_SQL = `
create or replace function public.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.users
    where auth_id = old.id::text;

    return old;
  end if;

  insert into public.users (auth_id, email, name)
  values (
    new.id::text,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (auth_id) do update
  set
    email = excluded.email,
    name = excluded.name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_change();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_auth_user_change();

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
after delete on auth.users
for each row execute function public.handle_auth_user_change();
`;

const AUTH_USER_BACKFILL_SQL = `
insert into public.users (auth_id, email, name)
select
  id::text,
  coalesce(email, ''),
  coalesce(
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'name'
  )
from auth.users
on conflict (auth_id) do update
set
  email = excluded.email,
  name = excluded.name,
  updated_at = now();
`;

const hasTable = async (schema, table) => {
  const [result] = await sql`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = ${schema}
        and table_name = ${table}
    ) as "exists"
  `;

  return Boolean(result?.exists);
};

try {
  const [hasPublicUsers, hasAuthUsers] = await Promise.all([
    hasTable("public", "users"),
    hasTable("auth", "users"),
  ]);

  if (!hasPublicUsers) {
    throw new Error(
      'Expected table "public.users" to exist before installing auth sync.'
    );
  }

  if (!hasAuthUsers) {
    console.warn(
      "Skipping auth user sync install because auth.users does not exist."
    );
    process.exit(0);
  }

  await sql.unsafe(AUTH_USER_SYNC_SQL);
  await sql.unsafe(AUTH_USER_BACKFILL_SQL);
  console.log("Installed auth.users -> public.users sync triggers.");
} finally {
  await sql.end({ timeout: 5 });
}
