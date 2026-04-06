import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Ghost, Send, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import type { Job } from "@/types";

interface DashboardStatsProps {
  jobs: Job[];
}

export function DashboardStats({ jobs }: DashboardStatsProps) {
  const totalScanned = jobs.length;
  const ghostJobs = jobs.filter((j) => j.ghost_score > 80).length;
  const applied = jobs.filter((j) => 
    ["applied", "interviewing", "offer", "rejected", "ghosted"].includes(j.application_status)
  ).length;
  
  const responses = jobs.filter((j) => 
    ["interviewing", "offer", "rejected"].includes(j.application_status)
  ).length;
  
  const responseRate = applied > 0 ? Math.round((responses / applied) * 100) : 0;

  const stats = [
    {
      title: "Jobs Scanned",
      value: totalScanned,
      icon: Briefcase,
      description: "Total jobs analyzed",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Ghost Jobs",
      value: ghostJobs,
      icon: Ghost,
      description: "High risk postings (>80 score)",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Applied",
      value: applied,
      icon: Send,
      description: "Applications submitted",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Response Rate",
      value: `${responseRate}%`,
      icon: TrendingUp,
      description: "Heard back from employers",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
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

      {/* Quick Insights */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Risk Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Low Risk (0-30)</span>
                  <span className="font-medium">{jobs.filter((j) => j.ghost_score <= 30).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Medium Risk (31-60)</span>
                  <span className="font-medium">{jobs.filter((j) => j.ghost_score > 30 && j.ghost_score <= 60).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>High Risk (61-80)</span>
                  <span className="font-medium">{jobs.filter((j) => j.ghost_score > 60 && j.ghost_score <= 80).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Ghost Jobs (81-100)</span>
                  <span className="font-medium text-red-600">{ghostJobs}</span>
                </div>
              </div>
            </CardContent>          
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Application Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Saved</span>
                  <span className="font-medium">{jobs.filter((j) => j.application_status === "saved").length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Applied</span>
                  <span className="font-medium">{jobs.filter((j) => j.application_status === "applied").length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Interviewing</span>
                  <span className="font-medium text-yellow-600">{jobs.filter((j) => j.application_status === "interviewing").length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Offers</span>
                  <span className="font-medium text-green-600">{jobs.filter((j) => j.application_status === "offer").length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
