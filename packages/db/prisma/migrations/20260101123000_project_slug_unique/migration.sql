drop index if exists "projects_workspace_slug_key";
create unique index "projects_slug_key" on "projects" ("slug");
