import { createHmac, timingSafeEqual } from "node:crypto";

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

const env = (key: string): string | null => {
  const value = process.env[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const decodePrivateKey = (raw: string): string => {
  if (raw.includes("BEGIN ")) {
    return raw.replaceAll("\\n", "\n");
  }
  // Support base64-encoded keys for environments that strip newlines.
  return Buffer.from(raw, "base64").toString("utf8");
};

export const githubAppEnv = () => ({
  appId: env("GITHUB_APP_ID"),
  appSlug: env("GITHUB_APP_SLUG"),
  clientId: env("GITHUB_APP_CLIENT_ID"),
  clientSecret: env("GITHUB_APP_CLIENT_SECRET"),
  installStateSecret: env("GITHUB_APP_INSTALL_STATE_SECRET"),
  privateKey: env("GITHUB_APP_PRIVATE_KEY"),
  webhookSecret: env("GITHUB_APP_WEBHOOK_SECRET"),
});

export const isGithubAppConfigured = (): boolean => {
  const e = githubAppEnv();
  return Boolean(e.appId && e.privateKey && e.webhookSecret);
};

export const installAppUrl = (state: string): string | null => {
  const { appSlug } = githubAppEnv();
  if (!appSlug) {
    return null;
  }
  const url = new URL(`https://github.com/apps/${appSlug}/installations/new`);
  url.searchParams.set("state", state);
  return url.toString();
};

const STATE_TTL_MS = 10 * 60 * 1000;

export const signInstallState = (projectId: string): string | null => {
  const { installStateSecret } = githubAppEnv();
  if (!installStateSecret) {
    return null;
  }
  const issuedAt = Date.now();
  const payload = `${projectId}:${issuedAt}`;
  const sig = createHmac("sha256", installStateSecret)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf8").toString("base64url");
};

export const verifyInstallState = (
  state: string
): { projectId: string } | null => {
  const { installStateSecret } = githubAppEnv();
  if (!installStateSecret) {
    return null;
  }
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const parts = decoded.split(":");
  if (parts.length !== 3) {
    return null;
  }
  const [projectId, issuedAtRaw, sig] = parts as [string, string, string];
  if (!(projectId && issuedAtRaw && sig)) {
    return null;
  }
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > STATE_TTL_MS) {
    return null;
  }
  const expected = createHmac("sha256", installStateSecret)
    .update(`${projectId}:${issuedAtRaw}`)
    .digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  return { projectId };
};

export const verifyWebhookSignature = (
  rawBody: string,
  signatureHeader: string | null
): boolean => {
  const { webhookSecret } = githubAppEnv();
  if (!webhookSecret || !signatureHeader) {
    return false;
  }
  const expected = `sha256=${createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex")}`;
  const provided = Buffer.from(signatureHeader, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (provided.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(provided, expectedBuf);
};

const buildOctokit = (installationId: number): Octokit => {
  const { appId, privateKey, clientId, clientSecret } = githubAppEnv();
  if (!(appId && privateKey)) {
    throw new Error("GitHub App is not configured.");
  }
  return new Octokit({
    auth: {
      appId,
      privateKey: decodePrivateKey(privateKey),
      ...(clientId ? { clientId } : {}),
      ...(clientSecret ? { clientSecret } : {}),
      installationId,
    },
    authStrategy: createAppAuth,
  });
};

export interface InstallationRepoSummary {
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export const listInstallationRepos = async (
  installationId: number
): Promise<InstallationRepoSummary[]> => {
  const octokit = buildOctokit(installationId);
  const repos = await octokit.paginate(
    "GET /installation/repositories",
    { per_page: 100 },
    (response) => response.data
  );
  return repos.map((repo) => ({
    defaultBranch: repo.default_branch,
    fullName: repo.full_name,
    private: repo.private,
  }));
};

export interface InstallationAccountSummary {
  login: string;
  type: string;
}

export const getInstallationAccount = async (
  installationId: number
): Promise<InstallationAccountSummary | null> => {
  const { appId, privateKey } = githubAppEnv();
  if (!(appId && privateKey)) {
    return null;
  }
  const octokit = new Octokit({
    auth: { appId, privateKey: decodePrivateKey(privateKey) },
    authStrategy: createAppAuth,
  });
  const { data } = await octokit.request(
    "GET /app/installations/{installation_id}",
    { installation_id: installationId }
  );
  const account = data.account as { login?: string; type?: string } | null;
  if (!account?.login) {
    return null;
  }
  return { login: account.login, type: account.type ?? "User" };
};
