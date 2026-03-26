import { z } from "zod";

import {
  HostnameSchema,
  IdSchema,
  PathSchema,
  SlugSchema,
  UrlSchema,
} from "./ids";

export const TenantStatusSchema = z.enum(["active", "disabled"]);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

export const TenantSchema = z.object({
  activeDeploymentId: IdSchema.optional(),
  activeDeploymentManifestUrl: UrlSchema.optional(),
  customDomains: z.array(HostnameSchema),
  description: z.string().optional(),
  id: IdSchema,
  name: z.string().min(1),
  pathPrefix: PathSchema.optional(),
  primaryDomain: HostnameSchema,
  slug: SlugSchema,
  status: TenantStatusSchema,
  subdomain: SlugSchema,
});
export type Tenant = z.infer<typeof TenantSchema>;

export const TenantResolutionSchema = z.object({
  basePath: z.string(),
  host: HostnameSchema,
  rewrittenPath: z.string(),
  strategy: z.enum(["preview", "custom-domain", "subdomain", "path"]),
  tenant: TenantSchema,
});
export type TenantResolution = z.infer<typeof TenantResolutionSchema>;
