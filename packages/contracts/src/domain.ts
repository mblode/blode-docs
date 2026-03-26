import { z } from "zod";

import { IsoDateSchema } from "./dates";
import { HostnameSchema, IdSchema, PathSchema } from "./ids";

export const DomainStatusSchema = z.enum([
  "Valid Configuration",
  "Pending Verification",
  "Invalid Configuration",
]);
export type DomainStatus = z.infer<typeof DomainStatusSchema>;

export const DomainSchema = z.object({
  createdAt: IsoDateSchema,
  hostname: HostnameSchema,
  id: IdSchema,
  pathPrefix: PathSchema.optional(),
  projectId: IdSchema,
  status: DomainStatusSchema,
  verifiedAt: IsoDateSchema.optional(),
});
export type Domain = z.infer<typeof DomainSchema>;

export const DomainVerificationRecordSchema = z.object({
  name: z.string().min(1),
  ttl: z.string().optional(),
  type: z.enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS", "CAA"]),
  value: z.string().min(1),
});
export type DomainVerificationRecord = z.infer<
  typeof DomainVerificationRecordSchema
>;

export const DomainVerificationSchema = z.object({
  records: z.array(DomainVerificationRecordSchema),
  verified: z.boolean(),
});
export type DomainVerification = z.infer<typeof DomainVerificationSchema>;

export const DomainCreateSchema = z.object({
  hostname: HostnameSchema,
  pathPrefix: PathSchema.optional(),
  projectId: IdSchema,
});
export type DomainCreateInput = z.infer<typeof DomainCreateSchema>;

export const DomainCreateResponseSchema = z.object({
  domain: DomainSchema,
  verification: DomainVerificationSchema.optional(),
});
export type DomainCreateResponse = z.infer<typeof DomainCreateResponseSchema>;
