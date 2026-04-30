import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Mail, MessageSquare, Bug } from "lucide-react";
import { SUPPORT_EMAIL, PRIVACY_EMAIL, webPageSchema } from "@/lib/seo";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact GhostJob"
        description="Get in touch with the GhostJob team — support, feedback, privacy questions, and partnership inquiries."
        path="/contact"
        jsonLd={webPageSchema({
          name: "Contact GhostJob",
          description: "Get in touch with the GhostJob team.",
          path: "/contact",
        })}
      />
      <Navbar />
      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Get in touch
            </h1>
            <p className="text-muted-foreground text-lg">
              We read every message. Most replies go out within 1–2 business days.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-start gap-4 p-5 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <MessageSquare className="h-5 w-5 text-primary mt-1" />
              <div>
                <div className="font-semibold text-foreground">General support & feedback</div>
                <div className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</div>
              </div>
            </a>

            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="flex items-start gap-4 p-5 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <Bug className="h-5 w-5 text-primary mt-1" />
              <div>
                <div className="font-semibold text-foreground">Privacy or security questions</div>
                <div className="text-sm text-muted-foreground">{PRIVACY_EMAIL}</div>
              </div>
            </a>
          </div>

          <p className="text-sm text-muted-foreground mt-10 text-center">
            Reporting a bug? Include your browser version and the LinkedIn job URL where you saw the issue — it helps us reproduce things quickly.
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Contact;
