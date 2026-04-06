import { Button } from "@/components/ui/button";
import GhostScoreCard from "./GhostScoreCard";
import AuthDialog from "./AuthDialog";
import { Shield } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { JobInputForm } from "./JobInputForm";
import { GhostScoreDisplay } from "./GhostScoreDisplay";
import { EmailCaptureModal } from "./EmailCaptureModal";
import type { GhostScoreResult } from "@/lib/ghostScorer";

interface JobFormData {
  url: string;
  title: string;
  company: string;
  postedDate: string;
  hasSalary: "yes" | "no" | "unknown";
  description: string;
}

const HeroSection = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useAuth();
  const [showResults, setShowResults] = useState(false);
  const [ghostScoreResult, setGhostScoreResult] = useState<GhostScoreResult | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [submittedJobData, setSubmittedJobData] = useState<JobFormData | null>(null);

  const handleCTA = () => {
    if (!user) {
      setAuthOpen(true);
    }
  };

  const handleFormSubmit = (formData: JobFormData, scoreResult: GhostScoreResult) => {
    setSubmittedJobData(formData);
    setGhostScoreResult(scoreResult);
    setShowResults(true);
    
    // Open email modal after a brief delay to let user see results
    setTimeout(() => {
      if (!user) {
        setEmailModalOpen(true);
      }
    }, 2000);
  };

  const handleReset = () => {
    setShowResults(false);
    setGhostScoreResult(null);
    setSubmittedJobData(null);
  };

  return (
    <>
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/10 text-danger text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                43% of job postings are fake
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground">
                Don't Waste Time on{" "}
                <span className="text-gradient-hero">Ghost Jobs</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0">
                Enter any job details and instantly see if it's worth your time. Stop applying to positions that were never meant to be filled.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button variant="hero" size="lg" className="text-base px-8 py-6" onClick={handleCTA}>
                  {user ? "Start Scanning" : "Get 3 Free Scans"}
                </Button>
              </div>

              {/* Job Input Form Component */}
              <div className="mt-8">
                {!showResults ? (
                  <JobInputForm onSubmit={handleFormSubmit} />
                ) : (
                  ghostScoreResult && submittedJobData && (
                    <div className="space-y-4">
                      <GhostScoreDisplay 
                        result={{
                          job: {
                            title: submittedJobData.title,
                            company: submittedJobData.company,
                            location: "Unknown",
                            description: submittedJobData.description,
                            postedAt: submittedJobData.postedDate === "just-now" ? "Just now" : 
                                      submittedJobData.postedDate === "yesterday" ? "Yesterday" :
                                      submittedJobData.postedDate === "3-days" ? "3 days ago" :
                                      submittedJobData.postedDate === "1-week" ? "1 week ago" :
                                      submittedJobData.postedDate === "2-weeks" ? "2 weeks ago" :
                                      submittedJobData.postedDate === "1-month" ? "1 month ago" :
                                      submittedJobData.postedDate === "2-months" ? "2+ months ago" : "Unknown",
                            employmentType: null,
                            experienceLevel: null,
                            applicants: null,
                            salary: submittedJobData.hasSalary === "yes" ? "Salary disclosed" : null,
                          },
                          ghostScore: ghostScoreResult,
                        }} 
                        onSave={() => setEmailModalOpen(true)}
                      />
                      <Button 
                        onClick={handleReset} 
                        variant="outline" 
                        className="w-full"
                      >
                        Check Another Job
                      </Button>
                    </div>
                  )
                )}
              </div>

              <div className="flex items-center gap-2 justify-center lg:justify-start text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-safe" />
                <span>No credit card required · Free forever plan</span>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end lg:sticky lg:top-24">
              <GhostScoreCard />
            </div>
          </div>
        </div>
      </section>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <EmailCaptureModal 
        open={emailModalOpen} 
        onOpenChange={setEmailModalOpen}
        ghostScore={ghostScoreResult}
      />
    </>
  );
};

export default HeroSection;
