import { z } from "zod";

import { IsoDateSchema } from "./dates.js";
import { IdSchema } from "./ids.js";

export const GitProviderSchema = z.enum(["github"]);
export type GitProvider = z.infer<typeof GitProviderSchema>;

export const GitConnectionSchema = z.object({
  accountLogin: z.string().min(1),
  branch: z.string().min(1),
  createdAt: IsoDateSchema,
  docsPath: z.string().min(1),
  id: IdSchema,
  installationId: z.number().int().positive(),
  projectId: IdSchema,
  provider: GitProviderSchema,
  repository: z.string().min(1),
  updatedAt: IsoDateSchema,
});
export type GitConnection = z.infer<typeof GitConnectionSchema>;

export const GitConnectionBindSchema = z.object({
  branch: z.string().min(1).default("main"),
  docsPath: z.string().min(1).default("docs"),
  installationId: z.number().int().positive(),
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/, {
    message: "Repository must be in the format owner/repo.",
  }),
});
export type GitConnectionBindInput = z.infer<typeof GitConnectionBindSchema>;
