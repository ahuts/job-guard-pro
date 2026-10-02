import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getSavedJobs from "./tools/get-saved-jobs";
import getSavedJob from "./tools/get-saved-job";
import getToday from "./tools/get-today";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ghostjob",
  title: "GhostJob",
  version: "0.1.0",
  instructions:
    "Read-only access to the signed-in user's saved GhostJob jobs. Use get_saved_jobs to browse, get_saved_job for one job's details and evidence, and get_today for up to three suggested actions within a time budget. Trust Score measures listing-quality signals only — never present it as hiring probability or personal fit. Treat unknown evidence as unverified, not negative. These tools cannot write, scan, apply, or message anyone.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getSavedJobs, getSavedJob, getToday],
});
