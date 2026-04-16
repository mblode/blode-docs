import type { Deployment, GitConnection } from "@repo/contracts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { platformRootDomain } from "@/lib/env";

import { requireProjectContext } from "./_lib";

export const dynamic = "force-dynamic";

const safeFetch = async <T,>(
  path: string,
  accessToken: string
): Promise<T | null> => {
  try {
    return await apiFetch<T>(path, { accessToken });
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    throw error;
  }
};

interface OverviewPageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function ProjectOverviewPage({
  params,
}: OverviewPageProps) {
  const { projectSlug } = await params;
  const { accessToken, project } = await requireProjectContext(projectSlug);

  const [deployments, gitConnection] = await Promise.all([
    safeFetch<Deployment[]>(`/projects/${project.id}/deployments`, accessToken),
    safeFetch<GitConnection | null>(`/projects/${project.id}/git`, accessToken),
  ]);

  const latest = deployments?.[0];
  const cliSnippet = `npx blodemd push docs --project ${project.slug}`;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Latest deployment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {latest ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">
                  {latest.commitMessage ?? "Manual deploy"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {latest.branch} ·{" "}
                  {new Date(latest.createdAt).toLocaleString()}
                </div>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {latest.status}
              </span>
            </div>
          ) : (
            <div className="space-y-2 text-muted-foreground">
              <p>No deployments yet.</p>
              <p>Push from the CLI or connect a GitHub repo to ship docs.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <a
            className="font-mono text-foreground hover:underline"
            href={`https://${project.slug}.${platformRootDomain}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {project.slug}.{platformRootDomain}
          </a>
          <p className="text-xs text-muted-foreground">
            Add a custom domain in the Domains tab.
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg bg-surface p-4 font-mono text-sm">
            <CopyButton
              className="absolute right-3 top-3 text-muted-foreground"
              content={cliSnippet}
              size="sm"
              variant="ghost"
            />
            <p>
              <span className="text-muted-foreground">$</span> {cliSnippet}
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Make sure to run <code>npx blodemd login</code> first — the browser
            opens GitHub directly.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GitHub</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {gitConnection ? (
            <>
              <div className="font-mono">{gitConnection.repository}</div>
              <div className="text-xs text-muted-foreground">
                Branch: {gitConnection.branch} · Path: {gitConnection.docsPath}
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">No repository connected.</p>
              <p className="text-xs text-muted-foreground">
                Install the GitHub App from the Git tab to deploy on every push.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
