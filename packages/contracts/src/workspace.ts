import { z } from "zod";
import { IsoDateSchema } from "./dates";
import { IdSchema, SlugSchema } from "./ids";

export const WorkspaceSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  name: z.string().min(1),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(1),
  slug: SlugSchema.optional(),
});
export type WorkspaceCreateInput = z.infer<typeof WorkspaceCreateSchema>;

export const WorkspaceUpdateSchema = z.object({
  name: z.string().min(1).optional(),
});
export type WorkspaceUpdateInput = z.infer<typeof WorkspaceUpdateSchema>;
