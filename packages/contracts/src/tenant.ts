import { z } from "zod";
import { HostnameSchema, IdSchema, PathSchema, SlugSchema } from "./ids";

export const TenantStatusSchema = z.enum(["active", "disabled"]);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

export const TenantSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  primaryDomain: HostnameSchema,
  subdomain: SlugSchema,
  customDomains: z.array(HostnameSchema),
  pathPrefix: PathSchema.optional(),
  status: TenantStatusSchema,
});
export type Tenant = z.infer<typeof TenantSchema>;

export const TenantResolutionSchema = z.object({
  tenant: TenantSchema,
  strategy: z.enum(["preview", "custom-domain", "subdomain", "path"]),
  host: HostnameSchema,
  basePath: z.string(),
  rewrittenPath: z.string(),
});
export type TenantResolution = z.infer<typeof TenantResolutionSchema>;
