export type TrustBand = "highly_verified" | "positive" | "unverified" | "weak" | "contradictory";
export type GhostRisk = "low" | "low_moderate" | "unclear" | "high" | "very_high";
export type CareersVerification = "verified_match" | "active_board_no_match" | "unverified" | "closed_conflict";
export type EvidenceGroup = "verified" | "caution" | "unverified";

export interface TrustEvidence {
  id: string;
  group: EvidenceGroup;
  label: string;
  points: number;
  description: string;
  sourceUrl?: string;
}

export interface QualityBadge {
  id: "salary" | "benefits" | "flexible_work";
  label: string;
}

export interface TrustScoreInput {
  careersVerification: CareersVerification;
  exactRoleMatch?: boolean;
  applicationActive?: boolean;
  companyIdentityVerified?: boolean;
  currentSourceEvidence?: boolean;
  concreteRoleDetails?: boolean;
  reposted?: boolean;
  repeatedWithoutVerification?: boolean;
  sourceUrl?: string;
  qualityBadges?: QualityBadge[];
}

export interface TrustScoreResult {
  trustScore: number;
  trustBand: TrustBand;
  ghostRisk: GhostRisk;
  careersVerification: CareersVerification;
  evidence: TrustEvidence[];
  qualityBadges: QualityBadge[];
  scoringVersion: 2;
  summary: string;
}

const bands: Array<{ min: number; trustBand: TrustBand; ghostRisk: GhostRisk; summary: string }> = [
  { min: 80, trustBand: "highly_verified", ghostRisk: "low", summary: "Strong public evidence supports this as an active opportunity." },
  { min: 60, trustBand: "positive", ghostRisk: "low_moderate", summary: "Positive signals were found, but some details still need verification." },
  { min: 40, trustBand: "unverified", ghostRisk: "unclear", summary: "Evidence is incomplete or mixed. This is not a negative finding." },
  { min: 20, trustBand: "weak", ghostRisk: "high", summary: "Available evidence provides limited support for this listing." },
  { min: 0, trustBand: "contradictory", ghostRisk: "very_high", summary: "Public evidence conflicts with the listing. Review carefully before investing time." },
];

export function getTrustPresentation(score: number) {
  return bands.find((band) => score >= band.min) ?? bands[bands.length - 1];
}

export function hasConcreteRoleDetails(description: string): boolean {
  const value = description.trim();
  if (value.length < 500) return false;

  const checks = [
    /requirements?|qualifications?|responsibilities|what you'?ll do|preferred qualifications|must have|nice to have/i,
    /responsible for|experience with|proficiency in|knowledge of|build|design|implement|manage|own|collaborate|support|deliver/i,
    /\b(react|typescript|javascript|python|sql|aws|azure|gcp|salesforce|hubspot|excel|tableau|figma|node|java|kubernetes|docker|postgres|graphql|api|crm|saas|jira)\b/i,
    /\b\d+\+?\s*(users|customers|clients|employees|years|projects|systems|markets|accounts)|\b\d+%/i,
    /(^|\n)\s*(?:[-*•]|\d+\.)\s+\S/m,
  ];

  return checks.filter((check) => check.test(value)).length >= 3;
}

export function getQualityBadges(description: string, salary?: string | null): QualityBadge[] {
  const value = `${description} ${salary ?? ""}`.toLowerCase();
  const badges: QualityBadge[] = [];
  if (/\$\d[\d,]*|\d{2,3}k\b/.test(value)) badges.push({ id: "salary", label: "Salary listed" });
  if (/health insurance|401k|dental|vision|benefits package/.test(value)) badges.push({ id: "benefits", label: "Benefits mentioned" });
  if (/remote|hybrid|work from home|\bwfh\b|flexible work/.test(value)) badges.push({ id: "flexible_work", label: "Flexible work mentioned" });
  return badges;
}

export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  let score = 50;
  const evidence: TrustEvidence[] = [];
  const add = (item: TrustEvidence) => {
    score += item.points;
    evidence.push(item);
  };

  if (input.careersVerification === "closed_conflict") {
    add({
      id: "source-closed-conflict",
      group: "caution",
      label: "Employer source reports the role closed",
      points: -35,
      description: "The public employer or ATS source explicitly indicates this role is no longer available.",
      sourceUrl: input.sourceUrl,
    });
  } else if (input.exactRoleMatch && input.careersVerification === "verified_match") {
    add({ id: "exact-role-match", group: "verified", label: "Exact employer role match", points: 25, description: "The title and location match a live public employer or ATS listing.", sourceUrl: input.sourceUrl });
  }

  if (input.applicationActive) add({ id: "application-active", group: "verified", label: "Application destination is active", points: 10, description: "The verified source still offers an active application path for this role.", sourceUrl: input.sourceUrl });
  if (input.companyIdentityVerified) add({ id: "company-identity", group: "verified", label: "Company identity matches", points: 5, description: "LinkedIn and the verified employer source identify the same company.", sourceUrl: input.sourceUrl });
  if (input.currentSourceEvidence) add({ id: "current-source", group: "verified", label: "Current source evidence", points: 5, description: "The public source includes current posting or update evidence.", sourceUrl: input.sourceUrl });
  if (input.concreteRoleDetails) add({ id: "concrete-details", group: "verified", label: "Concrete role details", points: 5, description: "The listing includes specific responsibilities, qualifications, and scope." });

  if (input.reposted) add({ id: "reposted", group: "caution", label: "LinkedIn marks this listing reposted", points: -5, description: "A repost is a caution to investigate, not proof that the role is a ghost job." });
  if (input.repeatedWithoutVerification) add({ id: "repeated-unverified", group: "caution", label: "Repeated without employer verification", points: -20, description: "This user has observed the listing for 45+ days without a verified active employer role." });

  if (input.careersVerification === "active_board_no_match") {
    evidence.push({ id: "active-board-no-match", group: "unverified", label: "Employer board is active, but this role was not verified", points: 0, description: "Title or timing differences are common, so this does not lower the Trust Score.", sourceUrl: input.sourceUrl });
  } else if (input.careersVerification === "unverified") {
    evidence.push({ id: "careers-unverified", group: "unverified", label: "Employer role could not be verified", points: 0, description: "Unavailable public evidence is neutral, not a negative finding." });
  }

  score = Math.max(0, Math.min(100, score));
  const presentation = getTrustPresentation(score);
  return {
    trustScore: score,
    trustBand: presentation.trustBand,
    ghostRisk: presentation.ghostRisk,
    careersVerification: input.careersVerification,
    evidence,
    qualityBadges: input.qualityBadges ?? [],
    scoringVersion: 2,
    summary: presentation.summary,
  };
}
