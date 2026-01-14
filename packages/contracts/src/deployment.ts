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
  id: IdSchema,
  projectId: IdSchema,
  environment: DeploymentEnvironmentSchema,
  status: DeploymentStatusSchema,
  branch: z.string().min(1),
  commitMessage: z.string().min(1).optional(),
  changes: z.string().min(1).optional(),
  previewUrl: UrlSchema.optional(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type Deployment = z.infer<typeof DeploymentSchema>;
