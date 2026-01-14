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
  id: IdSchema,
  projectId: IdSchema,
  hostname: HostnameSchema,
  pathPrefix: PathSchema.optional(),
  status: DomainStatusSchema,
  createdAt: IsoDateSchema,
  verifiedAt: IsoDateSchema.optional(),
});
export type Domain = z.infer<typeof DomainSchema>;

export const DomainVerificationRecordSchema = z.object({
  type: z.enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS", "CAA"]),
  name: z.string().min(1),
  value: z.string().min(1),
  ttl: z.string().optional(),
});
export type DomainVerificationRecord = z.infer<
  typeof DomainVerificationRecordSchema
>;

export const DomainVerificationSchema = z.object({
  verified: z.boolean(),
  records: z.array(DomainVerificationRecordSchema),
});
export type DomainVerification = z.infer<typeof DomainVerificationSchema>;

export const DomainCreateSchema = z.object({
  projectId: IdSchema,
  hostname: HostnameSchema,
  pathPrefix: PathSchema.optional(),
});
export type DomainCreateInput = z.infer<typeof DomainCreateSchema>;

export const DomainCreateResponseSchema = z.object({
  domain: DomainSchema,
  verification: DomainVerificationSchema.optional(),
});
export type DomainCreateResponse = z.infer<typeof DomainCreateResponseSchema>;
