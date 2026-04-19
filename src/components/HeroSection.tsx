import GhostScoreCard from "./GhostScoreCard";
import AuthDialog from "./AuthDialog";
import { Shield } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { JobScanner } from "./JobScanner";
import { ChromeIcon, CHROME_STORE_URL } from "./ChromeIcon";

const HeroSection = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useAuth();

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
                Stop Getting Ghosted by{" "}
                <span className="text-gradient-hero">Fake Jobs</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0">
                GhostJob scans any LinkedIn posting for ghost job signals — reposted listings, vague salaries, urgency pressure, and more. Know what's real before you apply.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start">
                <a
                  href={CHROME_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors text-lg shadow-md"
                >
                  <ChromeIcon />
                  Add to Chrome — Free
                </a>
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 border border-border hover:border-foreground/40 text-foreground font-medium py-3 px-6 rounded-lg transition-colors text-lg"
                >
                  View Dashboard
                </a>
              </div>

              <div className="mt-8">
                <JobScanner />
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
    </>
  );
};

export default HeroSection;
