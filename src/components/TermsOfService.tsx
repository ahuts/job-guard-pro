import { FileText } from 'lucide-react';

const TermsOfService = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">Last updated: April 14, 2026 · Effective: April 14, 2026</p>
        </div>

        <div className="mb-8 p-4 rounded-lg border border-border bg-secondary/40 text-sm text-muted-foreground">
          <strong className="text-foreground">In plain English:</strong> GhostJob is a free Chrome extension that estimates whether LinkedIn job postings are real. Scores are informational, not guarantees. Use them alongside your own judgment.
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using GhostJob ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostJob provides tools to analyze job postings and identify potential ghost jobs — listings that may not represent genuine hiring intent. Our analysis is based on publicly available information and proprietary algorithms, and results are provided for informational purposes only.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may be required to create an account to access certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to reverse-engineer or interfere with the Service; (c) scrape, harvest, or collect data from the Service beyond normal use; (d) impersonate any person or entity; or (e) use the Service to harass, defame, or harm others.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of the Service — including text, graphics, logos, and software — are the exclusive property of GhostJob and are protected by copyright, trademark, and other intellectual property laws.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind. GhostJob does not guarantee the accuracy, completeness, or reliability of any ghost job analysis. Our scores and signals are estimates and should not be the sole basis for your job search decisions.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, GhostJob shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, including but not limited to lost opportunities or reliance on ghost job analysis results.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your access to the Service at any time, with or without cause or notice. Upon termination, your right to use the Service will immediately cease.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms. We encourage you to review this page periodically.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us at{' '}
              <a href="mailto:legal@jobghost.io" className="text-primary hover:underline">
                legal@jobghost.io
              </a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TermsOfService;
