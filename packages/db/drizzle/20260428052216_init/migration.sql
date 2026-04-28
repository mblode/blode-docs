CREATE TYPE "deployment_environment" AS ENUM('production', 'preview');--> statement-breakpoint
CREATE TYPE "deployment_status" AS ENUM('queued', 'building', 'successful', 'failed');--> statement-breakpoint
CREATE TYPE "domain_status" AS ENUM('valid_configuration', 'pending_verification', 'invalid_configuration');--> statement-breakpoint
CREATE TYPE "git_provider" AS ENUM('github');--> statement-breakpoint
CREATE TABLE "deployments" (
	"branch" text NOT NULL,
	"changes" text,
	"commit_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"environment" "deployment_environment" DEFAULT 'production'::"deployment_environment" NOT NULL,
	"file_count" integer,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"manifest_url" text,
	"preview_url" text,
	"project_id" uuid NOT NULL,
	"promoted_at" timestamp with time zone,
	"status" "deployment_status" DEFAULT 'queued'::"deployment_status" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hostname" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"path_prefix" text,
	"project_id" uuid NOT NULL,
	"status" "domain_status" DEFAULT 'pending_verification'::"domain_status" NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "git_connections" (
	"account_login" text NOT NULL,
	"branch" text DEFAULT 'main' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"docs_path" text DEFAULT 'docs' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"installation_id" bigint NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" "git_provider" DEFAULT 'github'::"git_provider" NOT NULL,
	"repository" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_installations" (
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"installation_id" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"analytics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deployment_name" text NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"auth_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "deployments_project_id_created_at_idx" ON "deployments" ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "domains_hostname_key" ON "domains" ("hostname");--> statement-breakpoint
CREATE INDEX "domains_project_id_idx" ON "domains" ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "git_connections_project_id_key" ON "git_connections" ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_installations_user_install_key" ON "github_installations" ("user_id","installation_id");--> statement-breakpoint
CREATE INDEX "github_installations_user_id_idx" ON "github_installations" ("user_id");--> statement-breakpoint
CREATE INDEX "github_installations_installation_id_idx" ON "github_installations" ("installation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_key" ON "projects" ("slug");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_id_key" ON "users" ("auth_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "git_connections" ADD CONSTRAINT "git_connections_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;