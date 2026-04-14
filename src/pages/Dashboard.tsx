import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import JobCard from "@/components/dashboard/JobCard";
import FreePlanBanner from "@/components/dashboard/FreePlanBanner";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScannedJobs, useDeleteJob, useUserProfile } from "@/hooks/useScannedJobs";
import { useToast } from "@/hooks/use-toast";

const FREE_SCAN_LIMIT = 3;

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: jobs = [], isLoading } = useScannedJobs();
  const { data: profile } = useUserProfile();
  const deleteJob = useDeleteJob();

  const isFree = !profile || profile.subscription_tier === "free";

  const handleDelete = (jobId: string) => {
    deleteJob.mutate(jobId, {
      onSuccess: () => toast({ title: "Job deleted" }),
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your job applications and avoid ghost jobs.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <Search className="mr-2 h-4 w-4" />
            Scan New Job
          </Button>
        </div>

        {/* Free plan banner */}
        {isFree && (
          <FreePlanBanner scansUsed={jobs.length} maxScans={FREE_SCAN_LIMIT} />
        )}

        {/* Stats */}
        <DashboardStats jobs={jobs} />

        {/* Job list */}
        {jobs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <PlusCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No jobs scanned yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              Start by scanning a job posting to see its Ghost Score and track your applications.
            </p>
            <Button onClick={() => navigate("/")}>
              <Search className="mr-2 h-4 w-4" />
              Scan Your First Job
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onDelete={handleDelete}
                deleting={deleteJob.isPending && deleteJob.variables === job.id}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
