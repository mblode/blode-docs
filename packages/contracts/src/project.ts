import { z } from "zod";

import { IsoDateSchema } from "./dates.js";
import { IdSchema, SlugSchema } from "./ids.js";

export const ProjectSchema = z.object({
  createdAt: IsoDateSchema,
  deploymentName: z.string().min(1),
  description: z.string().optional(),
  id: IdSchema,
  name: z.string().min(1),
  slug: SlugSchema,
  updatedAt: IsoDateSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectCreateSchema = z.object({
  deploymentName: z.string().min(1),
  description: z.string().optional(),
  name: z.string().min(1),
  slug: SlugSchema,
});
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

export const ProjectUpdateSchema = z.object({
  deploymentName: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
});
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;
