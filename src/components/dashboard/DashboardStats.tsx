import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Ghost, AlertTriangle, TrendingUp } from "lucide-react";
import type { Job } from "@/types";

interface DashboardStatsProps {
  jobs: Job[];
}

export function DashboardStats({ jobs }: DashboardStatsProps) {
  const totalScanned = jobs.length;
  const v2Jobs = jobs.filter((j) => j.scoring_version === 2 && j.trust_score != null);
  const ghostJobs = v2Jobs.filter((j) => (j.trust_score ?? 50) < 40).length;
  const avgScore = totalScanned > 0
    ? Math.round(v2Jobs.reduce((sum, j) => sum + (j.trust_score ?? 50), 0) / (v2Jobs.length || 1))
    : 0;
  const redFlags = jobs.reduce(
    (sum, j) => sum + (j.signals?.length ?? 0),
    0
  );

  const stats = [
    {
      title: "Jobs Saved",
      value: totalScanned,
      icon: Briefcase,
      description: "Total jobs scanned & saved",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Avg Trust Score",
      value: v2Jobs.length > 0 ? `${avgScore}/100` : "—",
      icon: TrendingUp,
      description: "Average for Trust Meter v2 scans",
      color: "text-safe",
      bgColor: "bg-safe/10",
    },
    {
      title: "Red Flags Found",
      value: redFlags,
      icon: AlertTriangle,
      description: "Total warning signals detected",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Ghost Jobs",
      value: ghostJobs,
      icon: Ghost,
      description: "v2 listings with high Ghost Risk",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className={"text-2xl font-bold " + stat.color}>{stat.value}</p>
              </div>
              <div className={"p-3 rounded-full " + stat.bgColor}>
                <stat.icon className={"h-5 w-5 " + stat.color} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
