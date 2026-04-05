import { Button } from "@/components/ui/button";
import GhostScoreCard from "./GhostScoreCard";
import { Shield } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
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
              Paste any job URL and instantly see if it's worth your time. Stop applying to positions that were never meant to be filled.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button variant="hero" size="lg" className="text-base px-8 py-6">
                Get 3 Free Scans
              </Button>
              <Button variant="heroOutline" size="lg" className="text-base px-8 py-6">
                See How It Works
              </Button>
            </div>

            <div className="flex items-center gap-2 justify-center lg:justify-start text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-safe" />
              <span>No credit card required · Free forever plan</span>
            </div>
          </div>

          {/* Right visual */}
          <div className="flex justify-center lg:justify-end">
            <GhostScoreCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
