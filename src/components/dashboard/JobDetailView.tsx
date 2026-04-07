import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, AlertTriangle, CheckCircle, Clock, Building, MapPin, DollarSign, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

interface JobDetailViewProps {
  job: Job;
  onBack: () => void;
  onUpdate: (job: Job) => void;
  onDelete: (jobId: string) => void;
}

const statusOptions = [
  { value: "saved", label: "Saved", color: "bg-gray-500" },
  { value: "applied", label: "Applied", color: "bg-blue-500" },
  { value: "interviewing", label: "Interviewing", color: "bg-yellow-500" },
  { value: "offer", label: "Offer Received", color: "bg-green-500" },
  { value: "rejected", label: "Rejected", color: "bg-red-500" },
  { value: "ghosted", label: "Ghosted", color: "bg-purple-500" },
];

const getScoreColor = (score: number) => {
  if (score <= 30) return "text-green-600 bg-green-50";
  if (score <= 60) return "text-yellow-600 bg-yellow-50";
  if (score <= 80) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
};

const getScoreLabel = (score: number) => {
  if (score <= 30) return "Low Risk";
  if (score <= 60) return "Medium Risk";
  if (score <= 80) return "High Risk";
  return "Ghost Job Alert";
};

export function JobDetailView({ job, onBack, onUpdate, onDelete }: JobDetailViewProps) {
  const [notes, setNotes] = useState(job.notes || "");
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(
    job.follow_up_date ? new Date(job.follow_up_date) : undefined
  );

  const handleStatusChange = (status: string) => {
    onUpdate({ ...job, application_status: status as Job["application_status"] });
  };

  const handleNotesBlur = () => {
    onUpdate({ ...job, notes });
  };

  const handleFollowUpChange = (date: Date | undefined) => {
    setFollowUpDate(date);
    onUpdate({ ...job, follow_up_date: date ? format(date, "yyyy-MM-dd") : null });
  };

  const signals = job.signals || [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Jobs
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Job Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{job.job_title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>{job.company_name}</span>
                  </div>
                  {job.company_location && (
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{job.company_location}</span>
                    </div>
                  )}
                </div>
                <Badge className={cn("text-lg px-4 py-2", getScoreColor(job.ghost_score))}>
                  {job.ghost_score}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Ghost Score: {getScoreLabel(job.ghost_score)}</h3>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={cn(
                      "h-4 rounded-full transition-all",
                      job.ghost_score <= 30 && "bg-green-500",
                      job.ghost_score > 30 && job.ghost_score <= 60 && "bg-yellow-500",
                      job.ghost_score > 60 && job.ghost_score <= 80 && "bg-orange-500",
                      job.ghost_score > 80 && "bg-red-500"
                    )}
                    style={{ width: `${job.ghost_score}%` }}
                  />
                </div>
              </div>

              {signals.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Detected Signals
                  </h3>
                  <ul className="space-y-2">
                    {signals.map((signal: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {job.description && (
                <div>
                  <h3 className="font-semibold mb-2">Job Description</h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {job.description}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Posted: {job.posted_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Salary: {job.has_salary === null ? "Unknown" : job.has_salary ? "Listed" : "Not listed"}</span>
                </div>
              </div>

              {job.job_url && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                    View Original Job Posting
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Application Tracking */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Status</Label>
                <Select value={job.application_status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", option.color)} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Follow-up Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-2 justify-start text-left font-normal",
                        !followUpDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {followUpDate ? format(followUpDate, "PPP") : "Set a reminder"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={followUpDate}
                      onSelect={handleFollowUpChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add notes about this job..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => onDelete(job.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Job
          </Button>
        </div>
      </div>
    </div>
  );
}
