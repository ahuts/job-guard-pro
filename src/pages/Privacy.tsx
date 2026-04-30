import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PrivacyPolicy from "@/components/PrivacyPolicy";
import SEO from "@/components/SEO";
import { organizationSchema, webPageSchema } from "@/lib/seo";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy"
        description="GhostJob runs locally in your browser. We don't collect personal data, browsing history, or LinkedIn account information. Read the full privacy policy."
        path="/privacy"
        jsonLd={[
          organizationSchema,
          webPageSchema({
            name: "GhostJob Privacy Policy",
            description: "How GhostJob handles data and protects your privacy.",
            path: "/privacy",
          }),
        ]}
      />
      <Navbar />
      <PrivacyPolicy />
      <Footer />
    </div>
  );
};

export default Privacy;
