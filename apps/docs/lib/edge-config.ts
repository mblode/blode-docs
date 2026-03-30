import type {
  TenantEdgeHostRecord,
  TenantEdgeSlugRecord,
} from "@repo/contracts";
import {
  TenantEdgeHostRecordSchema,
  TenantEdgeSlugRecordSchema,
} from "@repo/contracts";
import { createClient } from "@vercel/edge-config";

import { createTimedPromiseCache } from "./server-cache";

const EDGE_CONFIG_CACHE_TTL_MS = 30 * 1000;

const normalizeHost = (host: string) =>
  host.trim().toLowerCase().replace(/:\d+$/, "");

const readTrimmedEnv = (name: string) => {
  const value = process.env[name];
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }
  return trimmed;
};

const edgeConfigConnectionString = readTrimmedEnv("EDGE_CONFIG");
const edgeConfigClient = edgeConfigConnectionString
  ? createClient(edgeConfigConnectionString)
  : null;

const hostRecordCache = createTimedPromiseCache<
  string,
  TenantEdgeHostRecord | null
>({
  maxEntries: 512,
  ttlMs: EDGE_CONFIG_CACHE_TTL_MS,
});

const slugRecordCache = createTimedPromiseCache<
  string,
  TenantEdgeSlugRecord | null
>({
  maxEntries: 512,
  ttlMs: EDGE_CONFIG_CACHE_TTL_MS,
});

const getEdgeConfigValue = async (key: string) => {
  if (!edgeConfigClient) {
    return null;
  }

  try {
    return (await edgeConfigClient.get(key)) as unknown;
  } catch {
    return null;
  }
};

export const isEdgeConfigEnabled = () => Boolean(edgeConfigClient);

export const getTenantEdgeHostKey = (host: string) =>
  `tenant:host:${normalizeHost(host)}`;

export const getTenantEdgeSlugKey = (slug: string) =>
  `tenant:slug:${slug.trim().toLowerCase()}`;

export const clearTenantEdgeConfigCaches = () => {
  hostRecordCache.clear();
  slugRecordCache.clear();
};

export const getTenantEdgeHostRecord = async (host: string) => {
  const key = getTenantEdgeHostKey(host);
  return await hostRecordCache.getOrCreate(key, async () => {
    const value = await getEdgeConfigValue(key);
    const parsed = TenantEdgeHostRecordSchema.safeParse(value);
    if (!parsed.success) {
      return null;
    }
    return parsed.data;
  });
};

export const getTenantEdgeSlugRecord = async (slug: string) => {
  const key = getTenantEdgeSlugKey(slug);
  return await slugRecordCache.getOrCreate(key, async () => {
    const value = await getEdgeConfigValue(key);
    const parsed = TenantEdgeSlugRecordSchema.safeParse(value);
    if (!parsed.success) {
      return null;
    }
    return parsed.data;
  });
};
