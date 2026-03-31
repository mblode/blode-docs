import { describe, expect, it } from "vitest";

import {
  normalizeHost,
  normalizeHostnameInput,
  normalizePathPrefix,
} from "./normalize";

describe("normalizeHost", () => {
  it("trims whitespace and strips ports", () => {
    expect(normalizeHost(" Docs.Example.com:3000 ")).toBe("docs.example.com");
  });
});

describe("normalizeHostnameInput", () => {
  it("extracts the hostname from full URLs and raw host inputs", () => {
    expect(
      normalizeHostnameInput(
        "https://Docs.Example.com:3000/docs/getting-started?tab=api#intro"
      )
    ).toBe("docs.example.com");
    expect(normalizeHostnameInput("Docs.Example.com/docs?utm=1")).toBe(
      "docs.example.com"
    );
  });

  it("rejects invalid host inputs", () => {
    expect(normalizeHostnameInput("http://user:pass@example.com")).toBeNull();
    expect(normalizeHostnameInput("not a host")).toBeNull();
    expect(normalizeHostnameInput("")).toBeNull();
  });
});

describe("normalizePathPrefix", () => {
  it("normalizes slashes and removes trailing separators", () => {
    expect(normalizePathPrefix("\\docs\\\\guides//intro/")).toBe(
      "/docs/guides/intro"
    );
  });

  it("returns null for empty root-like values", () => {
    expect(normalizePathPrefix("/")).toBeNull();
    expect(normalizePathPrefix("   ")).toBeNull();
  });
});
