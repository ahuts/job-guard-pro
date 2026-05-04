import { useState, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useScannedJobs } from "@/hooks/useScannedJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, AlertTriangle, Activity, ExternalLink } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

const TIME_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: null },
] as const;

type TimeRange = (typeof TIME_RANGES)[number];

function filterByRange(jobs: Job[], range: TimeRange): Job[] {
  if (!range.days) return jobs;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range.days);
  return jobs.filter((j) => new Date(j.created_at) >= cutoff);
}

function getTrustLabel(score: number) {
  if (score <= 30) return "Likely Ghost Job";
  if (score <= 60) return "Proceed with Caution";
  if (score <= 80) return "Looks Legitimate";
  return "Excellent Posting";
}

function getTrustColor(score: number) {
  if (score <= 30) return "hsl(0, 84%, 60%)";
  if (score <= 60) return "hsl(38, 92%, 50%)";
  if (score <= 80) return "hsl(160, 84%, 39%)";
  return "hsl(142, 76%, 36%)";
}

export default function Analytics() {
  const { data: allJobs = [], isLoading } = useScannedJobs();
  const [range, setRange] = useState<TimeRange>(TIME_RANGES[1]); // 30d default

  const jobs = useMemo(() => filterByRange(allJobs, range), [allJobs, range]);

  // === Stat cards ===
  const totalScans = jobs.length;
  const avgScore = totalScans > 0 ? Math.round(jobs.reduce((s, j) => s + j.ghost_score, 0) / totalScans) : 0;
  const likelyGhostCount = jobs.filter((j) => j.ghost_score <= 30).length;
  const likelyGhostPct = totalScans > 0 ? Math.round((likelyGhostCount / totalScans) * 100) : 0;

  // === Score distribution ===
  const distribution = useMemo(() => {
    const buckets = [
      { name: "0-30", range: "Likely Ghost Job", count: 0, fill: "hsl(0, 84%, 60%)" },
      { name: "31-60", range: "Proceed with Caution", count: 0, fill: "hsl(38, 92%, 50%)" },
      { name: "61-80", range: "Looks Legitimate", count: 0, fill: "hsl(160, 84%, 39%)" },
      { name: "81-100", range: "Excellent Posting", count: 0, fill: "hsl(142, 76%, 36%)" },
    ];
    jobs.forEach((j) => {
      if (j.ghost_score <= 30) buckets[0].count++;
      else if (j.ghost_score <= 60) buckets[1].count++;
      else if (j.ghost_score <= 80) buckets[2].count++;
      else buckets[3].count++;
    });
    return buckets;
  }, [jobs]);

  // === Scans over time ===
  const scansOverTime = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((j) => {
      const day = new Date(j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .reverse();
  }, [jobs]);

  // === Top signals ===
  const topSignals = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((j) => {
      (j.signals || []).forEach((s: any) => {
        const label = typeof s === "string" ? s : s?.title || s?.type || "";
        if (label) map.set(label, (map.get(label) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([signal, count]) => ({ signal, count }));
  }, [jobs]);

  // === Low-trust jobs ===
  const lowTrustJobs = useMemo(
    () => jobs.filter((j) => j.ghost_score <= 30).sort((a, b) => a.ghost_score - b.ghost_score).slice(0, 10),
    [jobs]
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + Time Range */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Insights from your job scans.</p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {TIME_RANGES.map((r) => (
              <Button
                key={r.label}
                variant="ghost"
                size="sm"
                className={cn(
                  "px-3 h-8 text-xs font-medium rounded-md",
                  range.label === r.label && "bg-background shadow-sm text-foreground"
                )}
                onClick={() => setRange(r)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BarChart3} label="Total Scans" value={totalScans} />
          <StatCard icon={TrendingUp} label="Avg Trust Score" value={avgScore} suffix="/100" />
          <StatCard icon={AlertTriangle} label="Likely Ghost Jobs" value={likelyGhostCount} className="text-destructive" />
          <StatCard icon={Activity} label="Likely Ghost Rate" value={`${likelyGhostPct}%`} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {totalScans === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(220,13%,91%)" }}
                      formatter={(value: number) => [value, "Jobs"]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {distribution.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Scans Over Time */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Scans Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {scansOverTime.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={scansOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(220,13%,91%)" }}
                      formatter={(value: number) => [value, "Scans"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(275, 52%, 40%)"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "hsl(275, 52%, 40%)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Signals */}
        {topSignals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Detected Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, topSignals.length * 36)}>
                <BarChart data={topSignals} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="signal"
                    type="category"
                    width={180}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(220,13%,91%)" }}
                    formatter={(value: number) => [value, "Occurrences"]}
                  />
                  <Bar dataKey="count" fill="hsl(275, 52%, 40%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Low-Trust */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Low-Trust Scans</CardTitle>
          </CardHeader>
          <CardContent>
            {lowTrustJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-6 text-center">
                No ghost jobs detected yet — that's a good sign!
              </p>
            ) : (
              <div className="divide-y divide-border">
                {lowTrustJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{job.job_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.company_name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: getTrustColor(job.ghost_score), color: getTrustColor(job.ghost_score) }}
                      >
                        {job.ghost_score}/100 · {getTrustLabel(job.ghost_score)}
                      </Badge>
                      {job.job_url && (
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold", className)}>
              {value}
              {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground italic">
      No data yet — scan some jobs to see insights.
    </div>
  );
}
