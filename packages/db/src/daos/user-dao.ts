// oxlint-disable eslint/class-methods-use-this
import { eq } from "drizzle-orm";

import { assertRecord } from "../assert-record.js";
import { db } from "../client.js";
import { users } from "../schema.js";
import type { UserRecord } from "../types/records.js";
import { userSelect } from "../types/selects.js";

export interface UserCreateInput {
  authId: string;
  email: string;
  name?: string | null;
}

export interface UserUpdateInput {
  email?: string;
  name?: string | null;
}

export class UserDao {
  async getById(id: string): Promise<UserRecord | null> {
    const [record] = await db
      .select(userSelect)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return record ?? null;
  }

  async getByAuthId(authId: string): Promise<UserRecord | null> {
    const [record] = await db
      .select(userSelect)
      .from(users)
      .where(eq(users.authId, authId))
      .limit(1);
    return record ?? null;
  }

  async getByEmail(email: string): Promise<UserRecord | null> {
    const [record] = await db
      .select(userSelect)
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return record ?? null;
  }

  async create(input: UserCreateInput): Promise<UserRecord> {
    const [record] = await db.insert(users).values(input).returning(userSelect);
    return assertRecord(record, "Failed to create user.");
  }

  async update(id: string, input: UserUpdateInput): Promise<UserRecord> {
    const [record] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(userSelect);
    return assertRecord(record, "Failed to update user.");
  }

  async upsertByAuthId(input: UserCreateInput): Promise<UserRecord> {
    const [record] = await db
      .insert(users)
      .values(input)
      .onConflictDoUpdate({
        set: {
          email: input.email,
          name: input.name,
          updatedAt: new Date(),
        },
        target: users.authId,
      })
      .returning(userSelect);
    return assertRecord(record, "Failed to upsert user.");
  }
}
