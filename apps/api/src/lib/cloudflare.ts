import { z } from "zod";

import { readTrimmedEnv } from "./env";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

const CloudflareDnsRecordSchema = z.object({
  content: z.string(),
  id: z.string(),
  name: z.string(),
  type: z.string(),
});

interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
}

const getCloudflareConfig = (): CloudflareConfig | null => {
  const apiToken = readTrimmedEnv("CLOUDFLARE_API_TOKEN");
  const zoneId = readTrimmedEnv("CLOUDFLARE_ZONE_ID");
  if (!(apiToken && zoneId)) {
    return null;
  }
  return { apiToken, zoneId };
};

export const isCloudflareEnabled = () => Boolean(getCloudflareConfig());

const cloudflareFetch = async <T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init: RequestInit = {}
): Promise<z.infer<T>> => {
  const config = getCloudflareConfig();
  if (!config) {
    throw new Error("Cloudflare config not set");
  }

  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    throw new Error(
      `Cloudflare API error (${response.status}): ${typeof data === "string" ? data : JSON.stringify(data)}`
    );
  }

  const body = data as { result: unknown };
  const parsed = schema.safeParse(body.result);
  if (!parsed.success) {
    throw new Error("Unexpected Cloudflare API response");
  }

  return parsed.data;
};

const zonePath = () => {
  const config = getCloudflareConfig();
  if (!config) {
    throw new Error("Cloudflare config not set");
  }
  return `/zones/${config.zoneId}/dns_records`;
};

export const addCnameRecord = (
  name: string,
  target: string
): Promise<z.infer<typeof CloudflareDnsRecordSchema>> =>
  cloudflareFetch(zonePath(), CloudflareDnsRecordSchema, {
    body: JSON.stringify({
      content: target,
      name,
      proxied: false,
      ttl: 1,
      type: "CNAME",
    }),
    method: "POST",
  });

export const addTxtRecord = (
  name: string,
  value: string
): Promise<z.infer<typeof CloudflareDnsRecordSchema>> =>
  cloudflareFetch(zonePath(), CloudflareDnsRecordSchema, {
    body: JSON.stringify({
      content: value,
      name,
      ttl: 600,
      type: "TXT",
    }),
    method: "POST",
  });

export const deleteDnsRecordsByName = async (name: string): Promise<void> => {
  const records = await cloudflareFetch(
    `${zonePath()}?name=${encodeURIComponent(name)}`,
    z.array(CloudflareDnsRecordSchema)
  );

  await Promise.all(
    records.map((record: z.infer<typeof CloudflareDnsRecordSchema>) =>
      cloudflareFetch(`${zonePath()}/${record.id}`, z.object({}), {
        method: "DELETE",
      })
    )
  );
};
