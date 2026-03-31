import { webcrypto } from "node:crypto";

import {
  TENANT_EDGE_HOST_KEY_PREFIX,
  TENANT_EDGE_SLUG_KEY_PREFIX,
} from "@repo/contracts";

import { readTrimmedEnv } from "../src/lib/env";

const VERCEL_API_BASE = "https://api.vercel.com";
const DEFAULT_SAMPLE_KEYS = ["greeting"];

interface EdgeConfigItem {
  key: string;
}

interface VercelEdgeConfigEnv {
  edgeConfigId: string;
  teamId?: string;
  teamSlug?: string;
  token: string;
}

const ensureWebCrypto = () => {
  if (globalThis.crypto) {
    return;
  }

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    enumerable: true,
    value: webcrypto,
  });
};

const getEdgeConfigEnv = (): VercelEdgeConfigEnv => {
  const edgeConfigId = readTrimmedEnv("VERCEL_EDGE_CONFIG_ID");
  const token = readTrimmedEnv("VERCEL_TOKEN");

  if (!(edgeConfigId && token)) {
    throw new Error(
      "VERCEL_EDGE_CONFIG_ID and VERCEL_TOKEN are required for backfill."
    );
  }

  return {
    edgeConfigId,
    teamId: readTrimmedEnv("VERCEL_TEAM_ID"),
    teamSlug: readTrimmedEnv("VERCEL_TEAM_SLUG"),
    token,
  };
};

const buildVercelUrl = (pathname: string, env: VercelEdgeConfigEnv) => {
  const url = new URL(pathname, VERCEL_API_BASE);

  if (env.teamId) {
    url.searchParams.set("teamId", env.teamId);
  }

  if (env.teamSlug) {
    url.searchParams.set("slug", env.teamSlug);
  }

  return url;
};

const vercelEdgeConfigFetch = async (
  pathname: string,
  env: VercelEdgeConfigEnv,
  init: RequestInit = {}
) => {
  const response = await fetch(buildVercelUrl(pathname, env), {
    ...init,
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (response.ok) {
    return response;
  }

  const errorText = await response.text();
  throw new Error(
    `Edge Config API error (${response.status}): ${errorText || "Unknown error"}`
  );
};

const listEdgeConfigItems = async (env: VercelEdgeConfigEnv) => {
  const response = await vercelEdgeConfigFetch(
    `/v1/edge-config/${env.edgeConfigId}/items?limit=1000`,
    env
  );
  return ((await response.json()) as EdgeConfigItem[]).map((item) => item.key);
};

const deleteEdgeConfigKeys = async (
  keys: string[],
  env: VercelEdgeConfigEnv
) => {
  if (!keys.length) {
    return;
  }

  await vercelEdgeConfigFetch(
    `/v1/edge-config/${env.edgeConfigId}/items`,
    env,
    {
      body: JSON.stringify({
        items: keys.map((key) => ({ key, operation: "delete" })),
      }),
      method: "PATCH",
    }
  );
};

const formatList = (values: string[]) =>
  values.length ? values.join(", ") : "(none)";

const normalizeDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (typeof databaseUrl !== "string") {
    return;
  }

  process.env.DATABASE_URL = databaseUrl.trim().replace(/\\n$/u, "");
};

const main = async () => {
  ensureWebCrypto();
  normalizeDatabaseUrl();

  const env = getEdgeConfigEnv();
  const [{ projectDao }, { syncProjectTenantEdgeConfig }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/edge-config"),
  ]);
  const projects = await projectDao.list();

  if (!projects.length) {
    console.log("No projects found. Nothing to backfill.");
    return;
  }

  console.log(`Backfilling Edge Config for ${projects.length} project(s)...`);

  for (const project of projects) {
    await syncProjectTenantEdgeConfig(project.id);
    console.log(`Synced ${project.slug} (${project.id})`);
  }

  const keys = await listEdgeConfigItems(env);
  const removableSampleKeys = DEFAULT_SAMPLE_KEYS.filter((key) =>
    keys.includes(key)
  );

  if (removableSampleKeys.length) {
    await deleteEdgeConfigKeys(removableSampleKeys, env);
  }

  const finalKeys = await listEdgeConfigItems(env);
  const finalTenantSlugKeys = finalKeys.filter((key) =>
    key.startsWith(TENANT_EDGE_SLUG_KEY_PREFIX)
  );
  const finalTenantHostKeys = finalKeys.filter((key) =>
    key.startsWith(TENANT_EDGE_HOST_KEY_PREFIX)
  );

  console.log("Backfill complete.");
  console.log(`Tenant slug keys: ${finalTenantSlugKeys.length}`);
  console.log(`Tenant host keys: ${finalTenantHostKeys.length}`);
  console.log(`Removed sample keys: ${formatList(removableSampleKeys)}`);
  console.log(`Final item count: ${finalKeys.length}`);
};

try {
  await main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
