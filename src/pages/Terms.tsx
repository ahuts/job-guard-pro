import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TermsOfService from "@/components/TermsOfService";
import SEO from "@/components/SEO";
import { organizationSchema, webPageSchema } from "@/lib/seo";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service"
        description="The terms governing use of GhostJob, the Chrome extension that detects ghost jobs on LinkedIn."
        path="/terms"
        jsonLd={[
          organizationSchema,
          webPageSchema({
            name: "GhostJob Terms of Service",
            description: "Terms and conditions for using GhostJob.",
            path: "/terms",
          }),
        ]}
      />
      <Navbar />
      <TermsOfService />
      <Footer />
    </div>
  );
};

export default Terms;
