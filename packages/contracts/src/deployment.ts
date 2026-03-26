import { z } from "zod";

import { IsoDateSchema } from "./dates";
import { IdSchema, UrlSchema } from "./ids";

export const DeploymentStatusSchema = z.enum([
  "Queued",
  "Building",
  "Successful",
  "Failed",
]);
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

export const DeploymentEnvironmentSchema = z.enum(["production", "preview"]);
export type DeploymentEnvironment = z.infer<typeof DeploymentEnvironmentSchema>;

export const DeploymentSchema = z.object({
  branch: z.string().min(1),
  changes: z.string().min(1).optional(),
  commitMessage: z.string().min(1).optional(),
  createdAt: IsoDateSchema,
  environment: DeploymentEnvironmentSchema,
  fileCount: z.number().int().nonnegative().optional(),
  id: IdSchema,
  manifestUrl: UrlSchema.optional(),
  previewUrl: UrlSchema.optional(),
  projectId: IdSchema,
  promotedAt: IsoDateSchema.optional(),
  status: DeploymentStatusSchema,
  updatedAt: IsoDateSchema,
});
export type Deployment = z.infer<typeof DeploymentSchema>;

export const PublishDeploymentCreateSchema = z.object({
  branch: z.string().min(1).optional(),
  changes: z.string().min(1).optional(),
  commitMessage: z.string().min(1).optional(),
  environment: DeploymentEnvironmentSchema.optional(),
});
export type PublishDeploymentCreateInput = z.infer<
  typeof PublishDeploymentCreateSchema
>;

export const PublishDeploymentFileSchema = z.object({
  contentBase64: z.string().min(1),
  contentType: z.string().min(1).optional(),
  path: z.string().min(1),
});
export type PublishDeploymentFileInput = z.infer<
  typeof PublishDeploymentFileSchema
>;

export const PublishDeploymentFileResponseSchema = z.object({
  path: z.string().min(1),
  url: UrlSchema,
});
export type PublishDeploymentFileResponse = z.infer<
  typeof PublishDeploymentFileResponseSchema
>;

export const PublishDeploymentFinalizeSchema = z.object({
  promote: z.boolean().optional(),
});
export type PublishDeploymentFinalizeInput = z.infer<
  typeof PublishDeploymentFinalizeSchema
>;
