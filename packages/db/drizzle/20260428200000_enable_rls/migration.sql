ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deployments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "git_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "github_installations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE IF EXISTS "api_keys" ENABLE ROW LEVEL SECURITY;
