import type { TenantResolution } from "@repo/contracts";

export interface TenantRequestContext {
  basePath?: string;
  protocol?: string;
  requestedHost?: string;
  strategy?: TenantResolution["strategy"] | null;
}

const TENANT_UTILITY_CONTEXT_PARAMS = {
  basePath: "__blodemd_base_path",
  host: "__blodemd_host",
  protocol: "__blodemd_protocol",
  strategy: "__blodemd_strategy",
} as const;

export const applyTenantUtilityContextSearchParams = (
  url: URL,
  context: TenantRequestContext
) => {
  if (context.requestedHost) {
    url.searchParams.set(
      TENANT_UTILITY_CONTEXT_PARAMS.host,
      context.requestedHost
    );
  }

  url.searchParams.set(
    TENANT_UTILITY_CONTEXT_PARAMS.basePath,
    context.basePath ?? ""
  );
  url.searchParams.set(
    TENANT_UTILITY_CONTEXT_PARAMS.protocol,
    context.protocol ?? "https"
  );
  url.searchParams.set(
    TENANT_UTILITY_CONTEXT_PARAMS.strategy,
    context.strategy ?? ""
  );
};

export const getTenantRequestContextFromUrl = (
  url: URL
): TenantRequestContext | null => {
  const requestedHost = url.searchParams.get(
    TENANT_UTILITY_CONTEXT_PARAMS.host
  );
  const basePath = url.searchParams.get(TENANT_UTILITY_CONTEXT_PARAMS.basePath);
  const protocol = url.searchParams.get(TENANT_UTILITY_CONTEXT_PARAMS.protocol);
  const strategy = url.searchParams.get(TENANT_UTILITY_CONTEXT_PARAMS.strategy);

  if (!(requestedHost || basePath !== null || protocol || strategy)) {
    return null;
  }

  return {
    basePath: basePath ?? undefined,
    protocol: protocol || undefined,
    requestedHost: requestedHost || undefined,
    strategy: (strategy || null) as TenantRequestContext["strategy"],
  };
};
