import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DETAIL_COLUMNS, ownerClient, toJobSummary, toJson, TRUST_SCORE_NOTE, type JobRow } from "../jobs";

interface DetailRow extends JobRow {
  description: string | null;
  notes: string | null;
  signals: unknown;
  has_salary: boolean | null;
  investigation: unknown;
  rating: string | null;
  ghost_score: number | null;
  scoring_version: number | null;
}

export default defineTool({
  name: "get_saved_job",
  title: "Get saved job",
  description: "Return one of the signed-in user's saved jobs with its description, posting evidence, notes, and follow-up date.",
  inputSchema: { job_id: z.string().uuid().describe("ID of a saved job from get_saved_jobs.") },
  annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
  handler: async ({ job_id }, ctx) => {
    const { supabase, userId } = ownerClient(ctx);
    const { data, error } = await supabase
      .from("scanned_jobs")
      .select(DETAIL_COLUMNS)
      .eq("id", job_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new ToolError("Could not load this job.");
    if (!data) throw new ToolError("No saved job with that ID was found in your account.");
    const row = data as unknown as DetailRow;
    const job = {
      ...toJobSummary(row),
      description: row.description ?? null,
      notes: row.notes ?? null,
      evidence: {
        has_salary: row.has_salary === null ? "unknown" : row.has_salary,
        signals: toJson(row.signals),
        investigation: toJson(row.investigation),
        rating: row.rating ?? "unknown",
        legacy_ghost_score: row.ghost_score ?? null,
        scoring_version: row.scoring_version ?? null,
      },
    };
    const result = { job, note: TRUST_SCORE_NOTE + " Fields marked unknown or null were not verified; do not treat them as negative." };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
