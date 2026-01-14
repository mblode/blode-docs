import { z } from "zod";
import { IsoDateSchema } from "./dates";
import { IdSchema } from "./ids";

export const ApiKeySchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  name: z.string().min(1),
  prefix: z.string().min(1),
  createdAt: IsoDateSchema,
  lastUsedAt: IsoDateSchema.optional(),
  revokedAt: IsoDateSchema.optional(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

export const ApiKeyCreateSchema = z.object({
  workspaceId: IdSchema,
  name: z.string().min(1),
});
export type ApiKeyCreateInput = z.infer<typeof ApiKeyCreateSchema>;
