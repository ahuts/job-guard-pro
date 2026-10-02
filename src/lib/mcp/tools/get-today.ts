import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { LIST_COLUMNS, isClosed, ownerClient, TRUST_SCORE_NOTE, type JobRow } from "../jobs";

interface Action {
  job_id: string;
  job_title: string;
  company_name: string;
  action: "follow_up" | "apply" | "review";
  estimated_minutes: number;
  reason: string;
}

const MINUTES = { follow_up: 10, apply: 30, review: 10 } as const;

export default defineTool({
  name: "get_today",
  title: "Get today's plan",
  description: "Suggest up to three job-search actions that fit a time budget, based on the user's saved jobs and due follow-ups.",
  inputSchema: {
    minutes: z.number().int().min(5).max(480).default(60).describe("Time available today, in minutes."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
  handler: async ({ minutes }, ctx) => {
    const { supabase, userId } = ownerClient(ctx);
    const { data, error } = await supabase
      .from("scanned_jobs")
      .select(LIST_COLUMNS)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new ToolError("Could not load saved jobs.");
    const jobs = (data ?? []) as unknown as JobRow[];
    const today = new Date().toISOString().slice(0, 10);

    const candidates: Action[] = [];
    // 1. Due follow-ups on active applications.
    for (const j of jobs) {
      if (j.follow_up_date && j.follow_up_date.slice(0, 10) <= today && ["applied", "interviewing", "offer"].includes(j.application_status)) {
        candidates.push({ job_id: j.id, job_title: j.job_title, company_name: j.company_name, action: "follow_up", estimated_minutes: MINUTES.follow_up, reason: `Follow-up was due ${j.follow_up_date.slice(0, 10)}.` });
      }
    }
    // 2. Saved jobs to apply to — never explicitly closed roles; unknown evidence is kept, not penalised.
    const applyable = jobs
      .filter((j) => j.application_status === "saved" && !isClosed(j))
      .sort((a, b) => (b.trust_score ?? -1) - (a.trust_score ?? -1));
    for (const j of applyable) {
      const verified = j.careers_verification === "verified_match";
      const reason = verified
        ? "Saved and matched on the employer's careers site."
        : j.trust_score == null
          ? "Saved; listing evidence is still unknown, so check the posting before applying."
          : `Saved; Trust Score ${j.trust_score} (listing quality, not hiring odds or fit).`;
      candidates.push({ job_id: j.id, job_title: j.job_title, company_name: j.company_name, action: "apply", estimated_minutes: MINUTES.apply, reason });
    }

    const actions: Action[] = [];
    let used = 0;
    for (const c of candidates) {
      if (actions.length >= 3) break;
      if (used + c.estimated_minutes > minutes) continue;
      actions.push(c);
      used += c.estimated_minutes;
    }

    const excluded_closed = jobs.filter((j) => j.application_status === "saved" && isClosed(j)).length;
    const result = { minutes_budget: minutes, minutes_planned: used, actions: actions.map((a) => ({ job_id: a.job_id, job_title: a.job_title, company_name: a.company_name, action: a.action, estimated_minutes: a.estimated_minutes, reason: a.reason })), excluded_closed_roles: excluded_closed, note: TRUST_SCORE_NOTE };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
