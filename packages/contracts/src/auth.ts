import { z } from "zod";
import { IsoDateSchema } from "./dates";
import { EmailSchema, IdSchema, UrlSchema } from "./ids";
import { ProjectSchema } from "./project";
import { WorkspaceSchema } from "./workspace";

export const OtpSchema = z.string().regex(/^[0-9]{6}$/);
export type Otp = z.infer<typeof OtpSchema>;

export const SignInSchema = z.object({
  email: EmailSchema,
});
export type SignInInput = z.infer<typeof SignInSchema>;

export const VerifyOtpSchema = z.object({
  email: EmailSchema,
  token: OtpSchema,
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const AuthUserSchema = z.object({
  id: IdSchema,
  email: EmailSchema,
  createdAt: IsoDateSchema,
  lastSignInAt: IsoDateSchema.optional(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const BootstrapRequestSchema = z.object({
  userId: IdSchema,
  email: EmailSchema,
  fullName: z.string().min(1).optional(),
  avatarUrl: UrlSchema.optional(),
});
export type BootstrapRequest = z.infer<typeof BootstrapRequestSchema>;

export const BootstrapResponseSchema = z.object({
  workspace: WorkspaceSchema,
  project: ProjectSchema,
});
export type BootstrapResponse = z.infer<typeof BootstrapResponseSchema>;
