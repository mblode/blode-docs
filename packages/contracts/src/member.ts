import { z } from "zod";
import { IsoDateSchema } from "./dates";
import { EmailSchema, IdSchema } from "./ids";

export const MemberRoleSchema = z.enum(["owner", "admin", "member"]);
export type MemberRole = z.infer<typeof MemberRoleSchema>;

export const MemberStatusSchema = z.enum(["active", "invited", "suspended"]);
export type MemberStatus = z.infer<typeof MemberStatusSchema>;

export const MemberSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  email: EmailSchema,
  role: MemberRoleSchema,
  status: MemberStatusSchema,
  joinedAt: IsoDateSchema.optional(),
});
export type Member = z.infer<typeof MemberSchema>;

export const InviteMemberSchema = z.object({
  email: EmailSchema,
  role: MemberRoleSchema.optional(),
});
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
