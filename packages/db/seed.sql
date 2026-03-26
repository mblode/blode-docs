delete from "activity" where "project_id" in (
  select "id" from "projects" where "slug" = 'dnd-grid'
);
delete from "deployments" where "project_id" in (
  select "id" from "projects" where "slug" = 'dnd-grid'
);
delete from "git_connections" where "project_id" in (
  select "id" from "projects" where "slug" = 'dnd-grid'
);
delete from "domains" where "project_id" in (
  select "id" from "projects" where "slug" = 'dnd-grid'
);
delete from "projects" where "slug" = 'dnd-grid';
delete from "workspace_members" where "workspace_id" in (
  select "id" from "workspaces" where "slug" = 'mblode'
);
delete from "workspaces" where "slug" = 'mblode';

insert into "workspaces" ("slug", "name")
values ('mblode', 'mblode');

insert into "workspace_members" ("workspace_id", "email", "role", "status", "joined_at")
select "id", 'm@blode.co', 'owner', 'active', now()
from "workspaces"
where "slug" = 'mblode'
limit 1;

insert into "projects" ("workspace_id", "slug", "name", "deployment_name", "description")
select "id", 'dnd-grid', 'dnd-grid', 'dnd-grid', 'Drag and drop grid documentation.'
from "workspaces"
where "slug" = 'mblode'
limit 1;

insert into "domains" ("project_id", "hostname", "path_prefix", "status")
select "id", 'dnd-grid.com', '/docs', 'valid_configuration'
from "projects"
where "slug" = 'dnd-grid'
limit 1;

insert into "domains" ("project_id", "hostname", "status")
select "id", 'docs.dnd-grid.com', 'pending_verification'
from "projects"
where "slug" = 'dnd-grid'
limit 1;

insert into "git_connections" (
  "project_id",
  "provider",
  "organization",
  "repository",
  "branch",
  "is_monorepo",
  "docs_path",
  "app_installed"
)
select "id", 'github', 'mblode', 'dnd-grid', 'main', true, 'apps/docs', true
from "projects"
where "slug" = 'dnd-grid'
limit 1;

insert into "deployments" (
  "project_id",
  "environment",
  "status",
  "branch",
  "commit_message",
  "changes",
  "preview_url",
  "created_at",
  "updated_at"
)
select
  "id",
  'production',
  'successful',
  'main',
  'Ultracite and husky',
  '19 files edited',
  null,
  now() - interval '1 day',
  now() - interval '1 day'
from "projects"
where "slug" = 'dnd-grid'
limit 1;

with project as (
  select "id" from "projects" where "slug" = 'dnd-grid' limit 1
)
insert into "activity" (
  "project_id",
  "summary",
  "status",
  "changes",
  "actor_name",
  "actor_avatar_url",
  "occurred_at"
)
select "id", 'Ultracite and husky', 'successful'::activity_status, '19 files edited', 'Matthew Blode', null, '2025-12-31 07:24:00+00'::timestamptz from project
union all
select "id", 'Merge pull request #9 from mblode/changeset-release/main Version Packages', 'successful'::activity_status, '1 file edited', 'Matthew Blode', null, '2025-12-29 14:48:00+00'::timestamptz from project
union all
select "id", 'fix sidebar', 'successful'::activity_status, '1 file edited', 'Matthew Blode', null, '2025-12-29 14:45:00+00'::timestamptz from project
union all
select "id", 'Merge pull request #8 from mblode/changeset-release/main Version Packages', 'successful'::activity_status, '1 file edited', 'Matthew Blode', null, '2025-12-27 21:45:00+00'::timestamptz from project
union all
select "id", 'Merge pull request #7 from mblode/changeset-release/main Version Packages', 'successful'::activity_status, '1 file edited', 'Matthew Blode', null, '2025-12-27 21:44:00+00'::timestamptz from project
union all
select "id", 'Massive refactor', 'successful'::activity_status, '8 files edited', 'Matthew Blode', null, '2025-12-27 21:14:00+00'::timestamptz from project
union all
select "id", 'Merge pull request #6 from mblode/changeset-release/main Version Packages', 'successful'::activity_status, '1 file edited', 'Matthew Blode', null, '2025-12-26 21:30:00+00'::timestamptz from project
union all
select "id", 'Massive refactor', 'successful'::activity_status, '1 file added, 22 files edited', 'Matthew Blode', null, '2025-12-26 17:11:00+00'::timestamptz from project
union all
select "id", 'Massive refactor', 'successful'::activity_status, '34 files edited', 'Matthew Blode', null, '2025-12-26 09:54:00+00'::timestamptz from project
union all
select "id", 'Massive refactor', 'successful'::activity_status, '4 files edited', 'Matthew Blode', null, '2025-12-25 12:03:00+00'::timestamptz from project
union all
select "id", 'Merge pull request #5 from mblode/changeset-release/main Version Packages', 'successful'::activity_status, '1 file edited', 'Matthew Blode', null, '2025-12-25 10:19:00+00'::timestamptz from project
union all
select "id", 'Massive refactor 🤖 Generated with [Claude Code](https://claude.com/claude-code) Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>', 'successful'::activity_status, '30 files added, 24 files edited, 1 file removed', 'Matthew Blode', null, '2025-12-25 10:18:00+00'::timestamptz from project
union all
select "id", 'Kitchen sink', 'successful'::activity_status, '1 file added, 15 files edited', 'Matthew Blode', null, '2025-12-23 18:47:00+00'::timestamptz from project
union all
select "id", 'Upgrade npm', 'successful'::activity_status, '7 files added, 3 files edited, 1 file removed', 'Matthew Blode', null, '2025-12-23 14:06:00+00'::timestamptz from project
union all
select "id", 'Remove .md', 'successful'::activity_status, '18 files edited', 'Matthew Blode', null, '2025-12-23 13:02:00+00'::timestamptz from project
union all
select "id", 'Improve compactor logic', 'successful'::activity_status, '2 files edited', 'Matthew Blode', null, '2025-12-23 09:52:00+00'::timestamptz from project
union all
select "id", 'Save', 'successful'::activity_status, '1 file edited', 'Matthew Blode', null, '2025-12-22 22:39:00+00'::timestamptz from project
union all
select "id", 'Its ready to rock', 'successful'::activity_status, '1 file added, 14 files edited', 'Matthew Blode', null, '2025-12-22 14:04:00+00'::timestamptz from project
union all
select "id", 'Save', 'successful'::activity_status, '5 files edited', 'Matthew Blode', null, '2025-12-22 11:14:00+00'::timestamptz from project
union all
select "id", 'Cleanup', 'successful'::activity_status, '1 file added, 8 files edited', 'Matthew Blode', null, '2025-12-21 17:25:00+00'::timestamptz from project;
