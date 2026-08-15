import { describe, expect, it } from "vitest";
import { __testables } from "../../api/scan";

describe("careers resolver fixtures", () => {
  it.each([
    ["Greenhouse", "Senior Software Engineer", "Senior Software Engineer", "Remote", "Remote - US"],
    ["Lever", "Product Manager (Growth)", "Product Manager (Growth)", "Austin, TX", "Austin, TX"],
    ["Ashby", "Account Executive", "Account Executive", "New York, NY", "New York, NY"],
  ])("requires a normalized exact %s title and compatible location", (_provider, requested, listed, requestedLocation, listedLocation) => {
    expect(__testables.titlesMatch(requested, listed)).toBe(true);
    expect(__testables.locationsCompatible(requestedLocation, listedLocation)).toBe(true);
  });

  it("does not accept a similar but non-exact provider title", () => {
    expect(__testables.titlesMatch("Software Engineer", "Senior Software Engineer")).toBe(false);
  });
});

describe("external lookup guardrails", () => {
  it.each(["https://127.0.0.1/jobs", "https://10.0.0.5/jobs", "https://[::1]/jobs", "https://[::ffff:127.0.0.1]/jobs"])("blocks private address %s", async (url) => {
    await expect(__testables.assertPublicHttps(url)).rejects.toThrow("Private network");
  });

  it("requires HTTPS", async () => {
    await expect(__testables.assertPublicHttps("http://example.com/jobs")).rejects.toThrow("HTTPS");
  });
});
