import { z } from "zod";

const VERCEL_API_BASE = "https://api.vercel.com";

const VercelVerificationRecordSchema = z.object({
  type: z.string(),
  domain: z.string(),
  value: z.string(),
  reason: z.string().optional(),
});

const VercelProjectDomainSchema = z.object({
  name: z.string(),
  apexName: z.string().optional(),
  verified: z.boolean().optional(),
  redirect: z.string().nullable().optional(),
  verification: z.array(VercelVerificationRecordSchema).optional(),
});

export type VercelProjectDomain = z.infer<typeof VercelProjectDomainSchema>;

interface VercelConfig {
  token: string;
  projectId: string;
  teamId?: string;
  teamSlug?: string;
}

const getVercelConfig = (): VercelConfig | null => {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!(token && projectId)) {
    return null;
  }
  return {
    token,
    projectId,
    teamId: process.env.VERCEL_TEAM_ID || undefined,
    teamSlug: process.env.VERCEL_TEAM_SLUG || undefined,
  };
};

const buildVercelUrl = (path: string, config: VercelConfig) => {
  const url = new URL(path, VERCEL_API_BASE);
  if (config.teamId) {
    url.searchParams.set("teamId", config.teamId);
  }
  if (config.teamSlug) {
    url.searchParams.set("slug", config.teamSlug);
  }
  return url;
};

const vercelFetch = async <T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init: RequestInit = {}
): Promise<z.infer<T>> => {
  const config = getVercelConfig();
  if (!config) {
    throw new Error("Vercel config not set");
  }
  const url = buildVercelUrl(path, config);
  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    throw new Error(
      `Vercel API error (${response.status}): ${typeof data === "string" ? data : ""}`
    );
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Unexpected Vercel API response");
  }

  return parsed.data;
};

export const isVercelEnabled = () => Boolean(getVercelConfig());

export const addProjectDomain = async (
  hostname: string,
  redirect?: string
): Promise<VercelProjectDomain> => {
  const config = getVercelConfig();
  if (!config) {
    throw new Error("Vercel config not set");
  }

  const body = redirect
    ? { name: hostname, redirect, redirectStatusCode: 308 }
    : { name: hostname };

  return await vercelFetch(
    `/v10/projects/${config.projectId}/domains`,
    VercelProjectDomainSchema,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
};

export const getProjectDomain = async (
  hostname: string
): Promise<VercelProjectDomain> => {
  const config = getVercelConfig();
  if (!config) {
    throw new Error("Vercel config not set");
  }
  return await vercelFetch(
    `/v9/projects/${config.projectId}/domains/${hostname}`,
    VercelProjectDomainSchema
  );
};

export const verifyProjectDomain = async (
  hostname: string
): Promise<VercelProjectDomain> => {
  const config = getVercelConfig();
  if (!config) {
    throw new Error("Vercel config not set");
  }
  return await vercelFetch(
    `/v9/projects/${config.projectId}/domains/${hostname}/verify`,
    VercelProjectDomainSchema,
    { method: "POST" }
  );
};

export const removeProjectDomain = async (
  hostname: string,
  removeRedirects = true
): Promise<void> => {
  const config = getVercelConfig();
  if (!config) {
    throw new Error("Vercel config not set");
  }

  const body = removeRedirects ? { removeRedirects: true } : undefined;
  await vercelFetch(
    `/v9/projects/${config.projectId}/domains/${hostname}`,
    z.object({}),
    {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }
  );
};

export const deleteDomain = async (hostname: string): Promise<void> => {
  const config = getVercelConfig();
  if (!config) {
    throw new Error("Vercel config not set");
  }

  await vercelFetch(`/v6/domains/${hostname}`, z.object({}), {
    method: "DELETE",
  });
};
