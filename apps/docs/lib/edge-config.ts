import type {
  TenantEdgeHostRecord,
  TenantEdgeSlugRecord,
} from "@repo/contracts";
import {
  TenantEdgeHostRecordSchema,
  TenantEdgeSlugRecordSchema,
  getTenantEdgeHostKeys,
  getTenantEdgeHostKey,
  getTenantEdgeSlugKeys,
  getTenantEdgeSlugKey,
} from "@repo/contracts";
import { createClient } from "@vercel/edge-config";

import { createTimedPromiseCache } from "./server-cache";

const EDGE_CONFIG_CACHE_TTL_MS = 30 * 1000;

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

export { getTenantEdgeHostKey, getTenantEdgeSlugKey };

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

export const clearTenantEdgeConfigCaches = () => {
  hostRecordCache.clear();
  slugRecordCache.clear();
};

export const getTenantEdgeHostRecord = async (host: string) =>
  await hostRecordCache.getOrCreate(getTenantEdgeHostKey(host), async () => {
    for (const key of getTenantEdgeHostKeys(host)) {
      const value = await getEdgeConfigValue(key);
      const parsed = TenantEdgeHostRecordSchema.safeParse(value);
      if (parsed.success) {
        return parsed.data;
      }
    }
    return null;
  });

export const getTenantEdgeSlugRecord = async (slug: string) =>
  await slugRecordCache.getOrCreate(getTenantEdgeSlugKey(slug), async () => {
    for (const key of getTenantEdgeSlugKeys(slug)) {
      const value = await getEdgeConfigValue(key);
      const parsed = TenantEdgeSlugRecordSchema.safeParse(value);
      if (parsed.success) {
        return parsed.data;
      }
    }
    return null;
  });
