export type GhostScore = "low" | "medium" | "high" | "critical";

export type ApplicationStatus = "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected";

export interface JobScan {
  id: string;
  userId: string;
  company: string;
  title: string;
  description?: string;
  url?: string;
  ghostScore: number;
  ghostScoreCategory: GhostScore;
  signals: GhostSignal[];
  status: ApplicationStatus;
  notes?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GhostSignal {
  id: string;
  type: "red_flag" | "warning" | "info";
  message: string;
  confidence: number;
}

export interface DashboardStats {
  totalScanned: number;
  ghostJobsDetected: number;
  applied: number;
  responseRate: number;
  scoreDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface ScoreRange {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

export const SCORE_RANGES: Record<GhostScore, ScoreRange> = {
  low: {
    min: 0,
    max: 25,
    label: "Low Risk",
    color: "bg-safe",
    description: "This job posting appears legitimate with minimal red flags.",
  },
  medium: {
    min: 26,
    max: 50,
    label: "Medium Risk",
    color: "bg-warning",
    description: "Some concerning patterns detected. Proceed with caution.",
  },
  high: {
    min: 51,
    max: 75,
    label: "High Risk",
    color: "bg-orange-500",
    description: "Multiple red flags present. High probability of a ghost job.",
  },
  critical: {
    min: 76,
    max: 100,
    label: "Critical Risk",
    color: "bg-destructive",
    description: "Very likely a ghost job. Strongly recommend avoiding this posting.",
  },
};

export function getScoreCategory(score: number): GhostScore {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

export function getScoreColor(score: number): string {
  const category = getScoreCategory(score);
  return SCORE_RANGES[category].color;
}

export function getScoreLabel(score: number): string {
  const category = getScoreCategory(score);
  return SCORE_RANGES[category].label;
}
