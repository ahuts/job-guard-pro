import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { LIST_COLUMNS, ownerClient, toJobSummary, TRUST_SCORE_NOTE, type JobRow } from "../jobs";

export default defineTool({
  name: "get_saved_jobs",
  title: "Get saved jobs",
  description: "List the signed-in user's saved GhostJob jobs, newest first, with pagination.",
  inputSchema: {
    page: z.number().int().min(1).default(1).describe("Page number, starting at 1."),
    page_size: z.number().int().min(1).max(50).default(20).describe("Jobs per page (max 50)."),
    status: z
      .enum(["saved", "applied", "interviewing", "offer", "rejected", "ghosted"])
      .optional()
      .describe("Optional application status filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
  handler: async ({ page, page_size, status }, ctx) => {
    const { supabase, userId } = ownerClient(ctx);
    const from = (page - 1) * page_size;
    let q = supabase
      .from("scanned_jobs")
      .select(LIST_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, from + page_size - 1);
    if (status) q = q.eq("application_status", status);
    const { data, error, count } = await q;
    if (error) throw new ToolError("Could not load saved jobs.");
    const jobs = ((data ?? []) as unknown as JobRow[]).map(toJobSummary);
    const total = count ?? jobs.length;
    const result = { jobs, page, page_size, total, has_more: from + jobs.length < total, note: TRUST_SCORE_NOTE };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
