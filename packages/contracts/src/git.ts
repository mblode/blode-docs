import { z } from "zod";
import { IsoDateSchema } from "./dates";
import { IdSchema, PathSchema } from "./ids";

export const GitProviderSchema = z.enum(["github"]);
export type GitProvider = z.infer<typeof GitProviderSchema>;

export const GitSettingsSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  provider: GitProviderSchema,
  organization: z.string().min(1),
  repository: z.string().min(1),
  branch: z.string().min(1),
  isMonorepo: z.boolean(),
  docsPath: PathSchema.optional(),
  appInstalled: z.boolean().optional(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type GitSettings = z.infer<typeof GitSettingsSchema>;

export const GitSettingsUpdateSchema = z.object({
  organization: z.string().min(1).optional(),
  repository: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
  isMonorepo: z.boolean().optional(),
  docsPath: PathSchema.optional(),
});
export type GitSettingsUpdateInput = z.infer<typeof GitSettingsUpdateSchema>;
