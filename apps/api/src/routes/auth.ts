import { Hono } from "hono";

import { getAuthenticatedUser } from "../lib/project-auth";
import { unauthorized } from "../lib/responses";
import { mapUser } from "../mappers/records";

export const auth = new Hono();

auth.get("/me", async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return unauthorized(c, "Authentication required.");
  }
  return c.json(mapUser(user), 200);
});
