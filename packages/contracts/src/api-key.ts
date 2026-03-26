import { z } from "zod";

import { IsoDateSchema } from "./dates";
import { IdSchema } from "./ids";

export const ApiKeySchema = z.object({
  createdAt: IsoDateSchema,
  id: IdSchema,
  lastUsedAt: IsoDateSchema.optional(),
  name: z.string().min(1),
  prefix: z.string().min(1),
  projectId: IdSchema,
  revokedAt: IsoDateSchema.optional(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

export const ApiKeyCreateSchema = z.object({
  name: z.string().min(1),
  projectId: IdSchema,
});
export type ApiKeyCreateInput = z.infer<typeof ApiKeyCreateSchema>;

export const ApiKeyCreateResponseSchema = z.object({
  apiKey: ApiKeySchema,
  token: z.string().min(1),
});
export type ApiKeyCreateResponse = z.infer<typeof ApiKeyCreateResponseSchema>;
