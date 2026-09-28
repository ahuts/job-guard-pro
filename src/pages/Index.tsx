import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
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
import { track } from "@/lib/analytics";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    track("organic_landing_view", { page: "/" });
  }, []);

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
        title="GhostJob — Check LinkedIn Jobs Against Employer Sources"
        description="Check a LinkedIn job against public employer sources. Free includes a Trust Score and basic verification; Pro adds deeper posting comparison when available."
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
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
