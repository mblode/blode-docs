import { apiFetch } from "@/lib/api-client";

export const GITHUB_INSTALL_STATE_KEY = "blodemd:install-state";

export interface PendingGithubInstall {
  projectId: string;
  projectSlug: string;
  state: string;
}

export const startGithubInstall = async ({
  accessToken,
  projectId,
  projectSlug,
}: {
  accessToken: string;
  projectId: string;
  projectSlug: string;
}): Promise<void> => {
  const result = await apiFetch<{ url: string; state: string }>(
    `/projects/${projectId}/git/install-url`,
    { accessToken, method: "POST" }
  );
  sessionStorage.setItem(
    GITHUB_INSTALL_STATE_KEY,
    JSON.stringify({
      projectId,
      projectSlug,
      state: result.state,
    })
  );
  window.location.assign(result.url);
};
