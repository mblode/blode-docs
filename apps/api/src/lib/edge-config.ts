import type { Tenant } from "@repo/contracts";
import {
  TenantEdgeHostRecordSchema,
  TenantEdgeSlugRecordSchema,
} from "@repo/contracts";

import { rootDomain, validConfiguredDomainStatus } from "./config";
import { domainDao } from "./db";
import { readTrimmedEnv } from "./env";
import { buildTenant } from "./tenant-builder";

const VERCEL_API_BASE = "https://api.vercel.com";

interface VercelEdgeConfigConfig {
  edgeConfigId: string;
  teamId?: string;
  teamSlug?: string;
  token: string;
}

type EdgeConfigItemOperation =
  | {
      key: string;
      operation: "delete";
    }
  | {
      key: string;
      operation: "upsert";
      value: unknown;
    };

const normalizeHost = (host: string) => host.trim().toLowerCase();

const getVercelEdgeConfig = (): VercelEdgeConfigConfig | null => {
  const edgeConfigId = readTrimmedEnv("VERCEL_EDGE_CONFIG_ID");
  const token = readTrimmedEnv("VERCEL_TOKEN");
  if (!(edgeConfigId && token)) {
    return null;
  }

  return {
    edgeConfigId,
    teamId: readTrimmedEnv("VERCEL_TEAM_ID"),
    teamSlug: readTrimmedEnv("VERCEL_TEAM_SLUG"),
    token,
  };
};

const buildVercelUrl = (pathname: string, config: VercelEdgeConfigConfig) => {
  const url = new URL(pathname, VERCEL_API_BASE);
  if (config.teamId) {
    url.searchParams.set("teamId", config.teamId);
  }
  if (config.teamSlug) {
    url.searchParams.set("slug", config.teamSlug);
  }
  return url;
};

const applyEdgeConfigItems = async (items: EdgeConfigItemOperation[]) => {
  const config = getVercelEdgeConfig();
  if (!(config && items.length)) {
    return;
  }

  const response = await fetch(
    buildVercelUrl(`/v1/edge-config/${config.edgeConfigId}/items`, config),
    {
      body: JSON.stringify({ items }),
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    }
  );

  if (response.ok) {
    return;
  }

  const errorText = await response.text();
  throw new Error(
    `Edge Config update failed (${response.status}): ${errorText}`
  );
};

const dedupeEdgeConfigItems = (items: EdgeConfigItemOperation[]) => {
  const map = new Map<string, EdgeConfigItemOperation>();
  for (const item of items) {
    map.set(item.key, item);
  }
  return [...map.values()];
};

export const getTenantEdgeHostKey = (host: string) =>
  `tenant:host:${normalizeHost(host)}`;

export const getTenantEdgeSlugKey = (slug: string) =>
  `tenant:slug:${slug.trim().toLowerCase()}`;

export const isTenantEdgeConfigSyncEnabled = () =>
  Boolean(getVercelEdgeConfig());

export const buildTenantEdgeConfigItems = (input: {
  domains: {
    hostname: string;
    pathPrefix?: string | null;
    status: string;
  }[];
  removedHosts?: string[];
  tenant: Tenant;
}) => {
  const items: EdgeConfigItemOperation[] = [
    {
      key: getTenantEdgeSlugKey(input.tenant.slug),
      operation: "upsert",
      value: TenantEdgeSlugRecordSchema.parse({
        slug: input.tenant.slug,
        tenant: input.tenant,
        version: 1,
      }),
    },
    {
      key: getTenantEdgeHostKey(`${input.tenant.subdomain}.${rootDomain}`),
      operation: "upsert",
      value: TenantEdgeHostRecordSchema.parse({
        host: `${input.tenant.subdomain}.${rootDomain}`,
        strategy: "subdomain",
        tenant: input.tenant,
        version: 1,
      }),
    },
  ];

  for (const domain of input.domains) {
    const key = getTenantEdgeHostKey(domain.hostname);
    if (domain.status !== validConfiguredDomainStatus) {
      items.push({
        key,
        operation: "delete",
      });
      continue;
    }

    items.push({
      key,
      operation: "upsert",
      value: TenantEdgeHostRecordSchema.parse({
        host: domain.hostname,
        pathPrefix: domain.pathPrefix ?? undefined,
        strategy: "custom-domain",
        tenant: input.tenant,
        version: 1,
      }),
    });
  }

  for (const host of input.removedHosts ?? []) {
    items.push({
      key: getTenantEdgeHostKey(host),
      operation: "delete",
    });
  }

  return dedupeEdgeConfigItems(items);
};

export const syncProjectTenantEdgeConfig = async (
  projectId: string,
  options: { removedHosts?: string[] } = {}
) => {
  if (!isTenantEdgeConfigSyncEnabled()) {
    return;
  }

  const tenant = await buildTenant(projectId);
  if (!tenant) {
    return;
  }

  const domains = await domainDao.listByProject(projectId);
  await applyEdgeConfigItems(
    buildTenantEdgeConfigItems({
      domains,
      removedHosts: options.removedHosts,
      tenant,
    })
  );
};
