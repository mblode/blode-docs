import { z } from "zod";
import { IsoDateSchema } from "./dates";
import { IdSchema, SlugSchema } from "./ids";

export const ProjectSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  slug: SlugSchema,
  name: z.string().min(1),
  deploymentName: z.string().min(1),
  description: z.string().optional(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectCreateSchema = z.object({
  workspaceId: IdSchema,
  slug: SlugSchema,
  name: z.string().min(1),
  deploymentName: z.string().min(1),
  description: z.string().optional(),
});
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  deploymentName: z.string().min(1).optional(),
  description: z.string().optional(),
});
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;
