import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import SocialProofSection from "@/components/SocialProofSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import PricingSection from "@/components/PricingSection";
import FAQSection, { homepageFaqs } from "@/components/FAQSection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import {
  organizationSchema,
  softwareApplicationSchema,
  faqPageSchema,
} from "@/lib/seo";

const Index = () => {
  const location = useLocation();

  // Scroll to hash when navigating to "/#features" etc. from another route
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      // Defer to allow sections to mount
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="GhostJob: Ghost Job Detector for LinkedIn | Spot Fake & Stale Job Posts"
        description="GhostJob is a free Chrome extension that scans LinkedIn job listings for repost, age, salary, urgency, and description-quality signals. Know what's real before you apply."
        path="/"
        jsonLd={[
          organizationSchema,
          softwareApplicationSchema,
          faqPageSchema(homepageFaqs),
        ]}
      />
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <SocialProofSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
