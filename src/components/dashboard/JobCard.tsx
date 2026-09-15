import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trash2, MapPin, Calendar, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

interface JobCardProps {
  job: Job;
  onDelete: (jobId: string) => void;
  deleting?: boolean;
}

function getScoreBadge(score: number) {
  if (score >= 80) return { label: "Highly Verified", className: "bg-safe/15 text-safe border-safe/30" };
  if (score >= 60) return { label: "Positive Signals", className: "bg-warning/15 text-warning border-warning/30" };
  if (score >= 40) return { label: "Needs Verification", className: "bg-muted text-muted-foreground border-border" };
  if (score >= 20) return { label: "Weakly Supported", className: "bg-orange-500/15 text-orange-500 border-orange-500/30" };
  return { label: "Contradictory Evidence", className: "bg-destructive/15 text-destructive border-destructive/30" };
}

function getSignalColor(signal: unknown) {
  if (typeof signal !== 'string') return "border-l-warning bg-warning/5";
  const lower = signal.toLowerCase();
  if (lower.includes("no salary") || lower.includes("layoff") || lower.includes("ghost") || lower.includes("months ago") || lower.includes("repost") || lower.includes("vague"))
    return "border-l-destructive bg-destructive/5";
  if (lower.includes("recent") || lower.includes("detailed") || lower.includes("salary listed") || lower.includes("active"))
    return "border-l-safe bg-safe/5";
  return "border-l-warning bg-warning/5";
}

function getSignalDot(signal: unknown) {
  if (typeof signal !== 'string') return "bg-warning";
  const lower = signal.toLowerCase();
  if (lower.includes("no salary") || lower.includes("layoff") || lower.includes("ghost") || lower.includes("months ago") || lower.includes("repost") || lower.includes("vague"))
    return "bg-destructive";
  if (lower.includes("recent") || lower.includes("detailed") || lower.includes("salary listed") || lower.includes("active"))
    return "bg-safe";
  return "bg-warning";
}

export default function JobCard({ job, onDelete, deleting }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isV2 = [2, 3].includes(job.scoring_version ?? 0) && job.trust_score != null;
  const score = job.trust_score ?? 50;
  const badge = getScoreBadge(score);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        {/* Main row */}
        <button
          className="w-full flex items-center gap-4 p-4 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{job.job_title}</p>
            <p className="text-sm text-muted-foreground truncate">{job.company_name}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {job.company_location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.company_location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          <Badge variant="outline" className={cn("shrink-0 font-semibold", badge.className)}>
            {isV2 ? `${score}/100 · ${badge.label} · v${job.scoring_version}` : `Legacy score · ${job.ghost_score}/100`}
          </Badge>

          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
            {/* Score bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{isV2 ? "GhostJob Trust Meter" : "Legacy Ghost Score"}</span>
                <span className="font-semibold">{isV2 ? `${score}/100` : `${job.ghost_score}/100`}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    score >= 80 && "bg-safe",
                    score >= 60 && score < 80 && "bg-warning",
                    score >= 40 && score < 60 && "bg-muted-foreground",
                    score >= 20 && score < 40 && "bg-orange-500",
                    score < 20 && "bg-destructive"
                  )}
                  style={{ width: `${isV2 ? score : job.ghost_score}%` }}
                />
              </div>
            </div>

            {/* Signals */}
            {job.signals && job.signals.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Detected Signals</p>
                <ul className="space-y-1.5">
                  {job.signals.map((signal: any, i: number) => {
                    const label = typeof signal === 'string' ? signal : (signal?.title || signal?.type || JSON.stringify(signal));
                    return (
                      <li
                        key={i}
                        className={cn(
                          "text-sm px-3 py-2 rounded-md border-l-4",
                          getSignalColor(label)
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", getSignalDot(label))} />
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No signals detected.</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {job.job_url ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    View Posting
                  </a>
                </Button>
              ) : (
                <div />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(job.id);
                }}
                disabled={deleting}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
