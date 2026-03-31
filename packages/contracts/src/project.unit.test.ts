import { describe, expect, it } from "vitest";

import { ProjectUpdateSchema } from "./project.js";

describe("ProjectUpdateSchema", () => {
  it("allows clearing an existing description", () => {
    expect(ProjectUpdateSchema.parse({ description: null })).toEqual({
      description: null,
    });
  });
});
