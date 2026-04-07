import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import JobHistoryTable from "@/components/dashboard/JobHistoryTable";
import { JobDetailView } from "@/components/dashboard/JobDetailView";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Job } from "@/types";

// Mock data for development - replace with Supabase query
const mockJobs: Job[] = [
  {
    id: "1",
    user_id: "user-1",
    job_title: "Senior Software Engineer",
    company_name: "TechCorp Inc",
    company_location: "San Francisco, CA",
    posted_date: "2 weeks ago",
    has_salary: true,
    description: "We are looking for an experienced software engineer to join our team...",
    ghost_score: 25,
    rating: "low",
    signals: [],
    application_status: "applied",
    notes: "Applied on 3/15, waiting to hear back",
    follow_up_date: "2026-03-29",
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "2",
    user_id: "user-1",
    job_title: "Frontend Developer",
    company_name: "StartupXYZ",
    company_location: "Remote",
    posted_date: "2+ months ago",
    has_salary: false,
    description: "Join our fast-growing startup...",
    ghost_score: 85,
    rating: "critical",
    signals: [
      "Posted over 2 months ago with no updates",
      "No salary information provided",
      "Vague job description",
      "Company recently had layoffs",
    ],
    application_status: "saved",
    notes: "High ghost score, probably not worth applying",
    created_at: "2026-03-10T10:00:00Z",
    updated_at: "2026-03-10T10:00:00Z",
  },
  {
    id: "3",
    user_id: "user-1",
    job_title: "Full Stack Developer",
    company_name: "Established Co",
    company_location: "New York, NY",
    posted_date: "3 days ago",
    has_salary: true,
    description: "Looking for a talented full stack developer...",
    ghost_score: 45,
    rating: "medium",
    signals: ["No salary range specified"],
    application_status: "interviewing",
    notes: "Phone screen scheduled for next week",
    created_at: "2026-03-14T10:00:00Z",
    updated_at: "2026-03-14T10:00:00Z",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual Supabase query
    // const fetchJobs = async () => {
    //   const { data, error } = await supabase
    //     .from('scanned_jobs')
    //     .select('*')
    //     .eq('user_id', user.id)
    //     .order('created_at', { ascending: false });
    //   if (data) setJobs(data);
    // };
    
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleJobUpdate = (updatedJob: Job) => {
    setJobs(jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
    if (selectedJob?.id === updatedJob.id) {
      setSelectedJob(updatedJob);
    }
  };

  const handleJobDelete = (jobId: string) => {
    setJobs(jobs.filter((job) => job.id !== jobId));
    setSelectedJob(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (selectedJob) {
    return (
      <DashboardLayout>
        <JobDetailView
          job={selectedJob}
          onBack={() => setSelectedJob(null)}
          onUpdate={handleJobUpdate}
          onDelete={handleJobDelete}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your job applications and avoid ghost jobs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}
            >
              <Search className="mr-2 h-4 w-4" />
              Scan New Job
            </Button>
          </div>
        </div>

        {/* Stats */}
        <DashboardStats jobs={jobs} />

        {/* Jobs Table */}
        {jobs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4"
            >
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
          <JobHistoryTable
            jobs={jobs}
            onJobSelect={setSelectedJob}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
