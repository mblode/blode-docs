import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";

import { validationError } from "./responses";

export const validateJson = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return validationError(c, "Invalid request body.", result.error.issues);
    }
  });

export const validateParams = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  zValidator("param", schema, (result, c) => {
    if (!result.success) {
      return validationError(
        c,
        "Invalid route parameters.",
        result.error.issues
      );
    }
  });

export const validateQuery = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  zValidator("query", schema, (result, c) => {
    if (!result.success) {
      return validationError(
        c,
        "Invalid query parameters.",
        result.error.issues
      );
    }
  });
