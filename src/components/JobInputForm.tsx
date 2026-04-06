import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, AlertTriangle, XCircle } from "lucide-react";
import { calculateGhostScore, type GhostScoreResult } from "@/lib/ghostScorer";

interface JobFormData {
  url: string;
  title: string;
  company: string;
  postedDate: string;
  hasSalary: "yes" | "no" | "unknown";
  description: string;
}

interface JobInputFormProps {
  onSubmit: (formData: JobFormData, ghostScore: GhostScoreResult) => void;
}

const postedDateOptions = [
  { value: "just-now", label: "Just posted / Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "3-days", label: "3 days ago" },
  { value: "1-week", label: "1 week ago" },
  { value: "2-weeks", label: "2 weeks ago" },
  { value: "1-month", label: "1 month ago" },
  { value: "2-months", label: "2+ months ago" },
  { value: "unknown", label: "Unknown" },
];

const salaryOptions = [
  { value: "yes", label: "Yes - Salary listed" },
  { value: "no", label: "No - No salary info" },
  { value: "unknown", label: "Unknown / Not sure" },
];

export function JobInputForm({ onSubmit }: JobInputFormProps) {
  const [formData, setFormData] = useState<JobFormData>({
    url: "",
    title: "",
    company: "",
    postedDate: "",
    hasSalary: "unknown",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scansRemaining] = useState(3);

  const handleInputChange = (field: keyof JobFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const getPostedDays = (postedDate: string): number | null => {
    switch (postedDate) {
      case "just-now":
        return 0;
      case "yesterday":
        return 1;
      case "3-days":
        return 3;
      case "1-week":
        return 7;
      case "2-weeks":
        return 14;
      case "1-month":
        return 30;
      case "2-months":
        return 60;
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.title.trim()) {
      setError("Job Title is required");
      return;
    }

    if (!formData.company.trim()) {
      setError("Company Name is required");
      return;
    }

    if (!formData.postedDate) {
      setError("Please select when the job was posted");
      return;
    }

    setLoading(true);

    try {
      // Calculate Ghost Score
      const postedDays = getPostedDays(formData.postedDate);
      const descriptionLength = formData.description.trim()
        ? formData.description.trim().split(/\s+/).length
        : 0;

      const signals = {
        postedDays,
        hasSalary: formData.hasSalary === "yes",
        descriptionLength,
        hasRepostIndicator: false,
        companyName: formData.company,
        hasRecentLayoffs: null,
        roleOnCareersPage: null,
        daysSinceApplied: null,
        receivedResponse: null,
      };

      const ghostScore = calculateGhostScore(signals);

      // Simulate a brief delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      onSubmit(formData, ghostScore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card className="border border-border shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Search className="w-5 h-5 text-primary" />
            Check a Job Posting
          </CardTitle>
          <CardDescription>
            Fill in the job details below to get an instant Ghost Score
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Job URL - Optional */}
            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm font-medium">
                Job URL <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://linkedin.com/jobs/view/..."
                value={formData.url}
                onChange={(e) => handleInputChange("url", e.target.value)}
                disabled={loading}
                className="w-full"
              />
            </div>

            {/* Job Title - Required */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Job Title <span className="text-danger">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g., Senior Software Engineer"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                disabled={loading}
                className="w-full"
                required
              />
            </div>

            {/* Company Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium">
                Company Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="company"
                type="text"
                placeholder="e.g., Acme Corp"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                disabled={loading}
                className="w-full"
                required
              />
            </div>

            {/* Two-column layout for mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Posted Date - Required */}
              <div className="space-y-2">
                <Label htmlFor="postedDate" className="text-sm font-medium">
                  Posted Date <span className="text-danger">*</span>
                </Label>
                <Select
                  value={formData.postedDate}
                  onValueChange={(value) => handleInputChange("postedDate", value)}
                  disabled={loading}
                >
                  <SelectTrigger id="postedDate" className="w-full">
                    <SelectValue placeholder="Select date..." />
                  </SelectTrigger>
                  <SelectContent>
                    {postedDateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Has Salary - Required */}
              <div className="space-y-2">
                <Label htmlFor="hasSalary" className="text-sm font-medium">
                  Salary Listed?
                </Label>
                <Select
                  value={formData.hasSalary}
                  onValueChange={(value: "yes" | "no" | "unknown") =>
                    handleInputChange("hasSalary", value)
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="hasSalary" className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {salaryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description - Optional */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Job Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Paste the job description here for a more detailed analysis..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                disabled={loading}
                className="w-full min-h-[100px] resize-y"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Get Ghost Score"
              )}
            </Button>
          </form>

          {/* Free Scans Info */}
          {scansRemaining > 0 ? (
            <div className="text-sm text-muted-foreground text-center">
              {scansRemaining} free scan{scansRemaining !== 1 ? "s" : ""} remaining
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                You&apos;ve used all your free scans.{" "}
                <a href="#pricing" className="underline">
                  Upgrade to Pro
                </a>{" "}
                for unlimited scans.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
