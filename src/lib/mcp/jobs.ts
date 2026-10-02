import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

export const TRUST_SCORE_NOTE =
  "Trust Score reflects listing-quality signals only. It is not a hiring probability and does not measure personal fit.";

export const LIST_COLUMNS =
  "id, job_title, company_name, company_location, job_url, application_status, trust_score, ghost_risk, careers_verification, follow_up_date, posted_date, created_at, updated_at";

export const DETAIL_COLUMNS =
  LIST_COLUMNS + ", description, notes, signals, has_salary, investigation, rating, ghost_score, scoring_version";

/** Returns a user-scoped client plus the verified caller id. Ownership comes from the token only. */
export function ownerClient(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) throw new ToolError("Sign in to your GhostJob account to use this tool.");
  const userId = ctx.getUserId();
  if (!userId) throw new ToolError("Sign in to your GhostJob account to use this tool.");
  return { supabase: supabaseForUser(ctx), userId };
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Converts unknown DB JSON into a JSON-safe value without dropping unknown evidence. */
export function toJson(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(toJson);
  if (typeof value === "object") {
    const out: { [k: string]: Json } = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = toJson(v);
    return out;
  }
  return String(value);
}

export interface JobRow {
  id: string;
  job_title: string;
  company_name: string;
  company_location: string | null;
  job_url: string | null;
  application_status: string;
  trust_score: number | null;
  ghost_risk: string | null;
  careers_verification: string | null;
  follow_up_date: string | null;
  posted_date: string | null;
  created_at: string;
  updated_at: string;
}

/** A role is explicitly closed only when verification found a closed conflict, or the user marked it rejected/ghosted. */
export function isClosed(job: Pick<JobRow, "careers_verification" | "application_status">) {
  return job.careers_verification === "closed_conflict" || job.application_status === "rejected" || job.application_status === "ghosted";
}

export const toJobSummary = (j: JobRow) => ({
  id: j.id,
  job_title: j.job_title,
  company_name: j.company_name,
  company_location: j.company_location ?? null,
  job_url: j.job_url ?? null,
  application_status: j.application_status,
  trust_score: j.trust_score ?? null,
  ghost_risk: j.ghost_risk ?? "unknown",
  careers_verification: j.careers_verification ?? "unknown",
  follow_up_date: j.follow_up_date ?? null,
  posted_date: j.posted_date ?? null,
  saved_at: j.created_at,
  updated_at: j.updated_at,
  explicitly_closed: isClosed(j),
});
