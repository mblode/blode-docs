import { InvalidArgumentError } from "commander";
import { describe, expect, it } from "vitest";

import {
  parseGa4MeasurementId,
  parsePosthogHost,
  parsePosthogProjectKey,
  parseProvider,
} from "./validators.js";

describe("parseGa4MeasurementId", () => {
  it("accepts a valid ID", () => {
    expect(parseGa4MeasurementId("G-ABC123DEFG")).toBe("G-ABC123DEFG");
  });

  it("trims whitespace", () => {
    expect(parseGa4MeasurementId("  G-ABC123DEFG  ")).toBe("G-ABC123DEFG");
  });

  it("rejects a lowercase ID", () => {
    expect(() => parseGa4MeasurementId("g-abc123")).toThrow(
      InvalidArgumentError
    );
  });

  it("rejects a UA ID", () => {
    expect(() => parseGa4MeasurementId("UA-12345-1")).toThrow(
      InvalidArgumentError
    );
  });
});

describe("parsePosthogProjectKey", () => {
  it("accepts a valid phc_ key", () => {
    const key = "phc_abcdefghijklmnopqrstuvwxyz";
    expect(parsePosthogProjectKey(key)).toBe(key);
  });

  it("rejects a phx_ personal key with a hint", () => {
    expect(() =>
      parsePosthogProjectKey("phx_abcdefghijklmnopqrstuvwxyz")
    ).toThrow(/Personal API keys/);
  });

  it("rejects a too-short key", () => {
    expect(() => parsePosthogProjectKey("phc_abc")).toThrow(
      InvalidArgumentError
    );
  });
});

describe("parsePosthogHost", () => {
  it("accepts an https URL", () => {
    expect(parsePosthogHost("https://eu.i.posthog.com")).toBe(
      "https://eu.i.posthog.com"
    );
  });

  it("rejects an http URL", () => {
    expect(() => parsePosthogHost("http://eu.i.posthog.com")).toThrow(/https/);
  });

  it("rejects a non-URL", () => {
    expect(() => parsePosthogHost("not-a-url")).toThrow(InvalidArgumentError);
  });
});

describe("parseProvider", () => {
  it("accepts ga4", () => {
    expect(parseProvider("ga4")).toBe("ga4");
  });

  it("accepts posthog", () => {
    expect(parseProvider("POSTHOG")).toBe("posthog");
  });

  it("rejects unknown providers", () => {
    expect(() => parseProvider("plausible")).toThrow(InvalidArgumentError);
  });
});
