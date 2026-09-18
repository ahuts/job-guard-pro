import type { TrustScoreResult } from "@/lib/trustScore";
import type { DescriptionCoverage } from "@/lib/jobInsights";
import { supabase } from "@/integrations/supabase/client";

export interface ScrapedJob {
  employerUrl?: string;
  requisitionId?: string;
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
  promoted: boolean;
  activelyReviewing: boolean;
  applicationMethod: "linkedin_easy_apply" | "linkedin_apply" | "external_apply" | "unknown";
  descriptionCoverage: DescriptionCoverage;
}

export interface AnalysisResult {
  job: ScrapedJob;
  trustScore: TrustScoreResult;
  firstObservedAt: string;
  scanAttemptId?: string;
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
  return refineAnalysis({ job, firstObservedAt, scanAttemptId: crypto.randomUUID() });
}

export async function refineAnalysis(previous: { job: ScrapedJob; firstObservedAt: string; scanAttemptId?: string }, mode: 'standard' | 'deep' = 'standard'): Promise<AnalysisResult> {
  const { job, firstObservedAt } = previous;
  const scanAttemptId = previous.scanAttemptId ?? crypto.randomUUID();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) };
  // During a pilot, existing website users retain v2. Older servers may not yet
  // implement capabilities; only an explicit v3 capability enables the new path.
  let scoringVersion = 2;
  try {
    const capabilities = await fetch('/api/scan', { headers, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (capabilities.ok && (await capabilities.json()).scoringVersion === 3) scoringVersion = 3;
  } catch { /* Existing v2 service remains available. */ }
  if (mode === 'deep' && scoringVersion !== 3) throw new Error('Deeper verification is not enabled for this account yet.');
  const response = await fetch("/api/scan", {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(35000),
    body: JSON.stringify({
      scoringVersion, scanMode: mode, scanAttemptId,
      employerUrl: job.employerUrl || undefined, requisitionId: job.requisitionId || undefined,
      url: job.url,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description.slice(0, 12000),
      salary: job.salary,
      applicationUrl: job.applicationUrl || undefined,
      companyLinkedInUrl: job.companyLinkedInUrl || undefined,
      reposted: job.reposted,
      postedAt: job.postedAt,
      applicants: job.applicants,
      employmentType: job.employmentType,
      experienceLevel: job.experienceLevel,
      promoted: job.promoted,
      activelyReviewing: job.activelyReviewing,
      applicationMethod: job.applicationMethod,
      descriptionCoverage: job.descriptionCoverage,
      coverageDetails: { status: job.descriptionCoverage, truncated: job.description.length > 12000, analyzedCharacters: Math.min(job.description.length, 12000), reason: 'Website extraction may contain only publicly accessible LinkedIn content.' },
      firstObservedAt,
    }),
  });
  const trustScore = await response.json();
  if (!response.ok) throw new Error(trustScore?.error || "Could not verify this job listing");
  if (trustScore.scoringVersion !== scoringVersion) throw new Error('The server scoring version changed. Retry this scan; it was not counted.');
  return { job, trustScore: trustScore as TrustScoreResult, firstObservedAt, scanAttemptId };
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

export async function saveAnalysis(userId: string, analysis: AnalysisResult): Promise<void> {
  const { data: existing, error: lookupError } = await supabase.from('scanned_jobs').select('id').eq('user_id', userId).eq('job_url', analysis.job.url).limit(1);
  if (lookupError) throw lookupError;
  if (existing?.length) throw new Error('This job is already saved. Its existing notes and score have been preserved.');
  const { job, trustScore } = analysis;
  const { error } = await supabase.from('scanned_jobs').insert({
    user_id: userId, job_url: job.url, job_title: job.title, company_name: job.company,
    company_location: job.location, description: job.description.slice(0, 2000),
    trust_score: trustScore.trustScore, scoring_version: trustScore.scoringVersion,
    ghost_risk: trustScore.ghostRisk, careers_verification: trustScore.careersVerification,
    signals: trustScore.evidence.map(e => ({ type: e.group, title: e.label, description: e.description, weight: e.points })),
    application_status: 'not_applied',
  });
  if (error) throw error;
}
