import type { TrustScoreResult } from "@/lib/trustScore";
import { supabase } from "@/integrations/supabase/client";

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  postedAt: string | null;
  salary: string | null;
  applicants: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  url: string;
  applicationUrl: string | null;
  companyLinkedInUrl: string | null;
  reposted: boolean;
}

export interface AnalysisResult {
  job: ScrapedJob;
  trustScore: TrustScoreResult;
  firstObservedAt: string;
}

const OBSERVATION_KEY = "ghostjob_scan_observations_v2";

function getFirstObservedAt(url: string): string {
  if (typeof window === "undefined") return new Date().toISOString();
  try {
    const observations = JSON.parse(window.localStorage.getItem(OBSERVATION_KEY) ?? "{}") as Record<string, string>;
    const key = url.match(/linkedin\.com\/jobs\/view\/(\d+)/)?.[1] ?? url;
    if (!observations[key]) {
      observations[key] = new Date().toISOString();
      window.localStorage.setItem(OBSERVATION_KEY, JSON.stringify(observations));
    }
    return observations[key];
  } catch {
    return new Date().toISOString();
  }
}

export async function scrapeJob(url: string): Promise<ScrapedJob> {
  const response = await fetch("/api/scrape-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await response.json();
  if (!response.ok || !data?.success) throw new Error(data?.error || "Failed to extract job details");
  return data.data as ScrapedJob;
}

export async function analyzeJob(url: string): Promise<AnalysisResult> {
  const job = await scrapeJob(url);
  const firstObservedAt = getFirstObservedAt(job.url);
  const response = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: job.url,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salary: job.salary,
      applicationUrl: job.applicationUrl,
      companyLinkedInUrl: job.companyLinkedInUrl,
      reposted: job.reposted,
      firstObservedAt,
    }),
  });
  const trustScore = await response.json();
  if (!response.ok) throw new Error(trustScore?.error || "Could not verify this job listing");
  return { job, trustScore: trustScore as TrustScoreResult, firstObservedAt };
}

export async function recordScanObservation(userId: string, analysis: AnalysisResult): Promise<void> {
  const jobKey = analysis.job.url.match(/linkedin\.com\/jobs\/view\/(\d+)/)?.[1] ?? analysis.job.url;
  const { error } = await supabase.from("scan_observations").upsert({
    user_id: userId,
    job_key: jobKey,
    job_url: analysis.job.url,
    job_title: analysis.job.title,
    company_name: analysis.job.company,
    company_location: analysis.job.location,
    first_observed_at: analysis.firstObservedAt,
    last_observed_at: new Date().toISOString(),
    reposted: analysis.job.reposted,
    careers_verification: analysis.trustScore.careersVerification,
    scoring_version: analysis.trustScore.scoringVersion,
  }, { onConflict: "user_id,job_key" });
  if (error) throw error;
}
