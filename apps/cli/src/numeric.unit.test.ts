import { describe, expect, it } from "vitest";

import { CliError } from "./errors.js";
import { parsePort, parsePositiveInteger } from "./validation.js";

describe("parsePositiveInteger", () => {
  it("accepts positive integer strings", () => {
    expect(parsePositiveInteger("30", "Timeout")).toBe(30);
    expect(parsePositiveInteger("01", "Timeout")).toBe(1);
  });

  it("rejects malformed numeric strings", () => {
    for (const value of ["", "0", "-1", "1.5", "30s", "3030abc"]) {
      expect(() => parsePositiveInteger(value, "Timeout")).toThrowError(
        CliError
      );
    }
  });
});

describe("parsePort", () => {
  it("rejects ports above the TCP range", () => {
    expect(() => parsePort("65536")).toThrowError(
      /Port must be between 1 and 65535\./
    );
  });
});
