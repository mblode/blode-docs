import { z } from "zod";
import { IsoDateSchema } from "./dates";
import { IdSchema, UrlSchema } from "./ids";

export const ActivityStatusSchema = z.enum([
  "Successful",
  "Failed",
  "Building",
  "Queued",
]);
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

export const ActivitySchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  summary: z.string().min(1),
  status: ActivityStatusSchema,
  changes: z.string().min(1).optional(),
  actorName: z.string().min(1),
  actorAvatarUrl: UrlSchema.optional(),
  occurredAt: IsoDateSchema,
});
export type Activity = z.infer<typeof ActivitySchema>;
