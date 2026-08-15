import { describe, expect, it } from "vitest";
import { calculateTrustScore } from "./trustScore";

describe("calculateTrustScore", () => {
  it("returns 100 when every positive verification box is checked", () => {
    const result = calculateTrustScore({
      careersVerification: "verified_match",
      exactRoleMatch: true,
      applicationActive: true,
      companyIdentityVerified: true,
      currentSourceEvidence: true,
      concreteRoleDetails: true,
    });
    expect(result.trustScore).toBe(100);
    expect(result.ghostRisk).toBe("low");
  });

  it("keeps unavailable evidence neutral", () => {
    const result = calculateTrustScore({ careersVerification: "unverified" });
    expect(result.trustScore).toBe(50);
    expect(result.trustBand).toBe("unverified");
  });

  it("does not deduct when an active board has no exact role match", () => {
    const result = calculateTrustScore({ careersVerification: "active_board_no_match" });
    expect(result.trustScore).toBe(50);
    expect(result.evidence[0].points).toBe(0);
  });

  it("handles concrete contradictory evidence and clamps scores", () => {
    const result = calculateTrustScore({ careersVerification: "closed_conflict", reposted: true, repeatedWithoutVerification: true });
    expect(result.trustScore).toBe(0);
    expect(result.ghostRisk).toBe("very_high");
  });
});
