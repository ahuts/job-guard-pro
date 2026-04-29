import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Ghost } from "lucide-react";
import { ChromeIcon, CHROME_STORE_URL } from "@/components/ChromeIcon";
import { articleSchema } from "@/lib/seo";

const PUBLISHED = "2026-04-29";

const WhatIsAGhostJob = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="What Is a Ghost Job? Definition, Red Flags & Examples"
        description="A ghost job is a public listing that isn't tied to active hiring. Learn why companies post them, the most common red flags, and how ghost jobs differ from job scams."
        path="/what-is-a-ghost-job"
        type="article"
        jsonLd={articleSchema({
          headline: "What Is a Ghost Job? Definition, Red Flags & Examples",
          description:
            "A ghost job is a public listing that isn't tied to active hiring. Learn why companies post them, the most common red flags, and how ghost jobs differ from job scams.",
          path: "/what-is-a-ghost-job",
          datePublished: PUBLISHED,
        })}
      />
      <Navbar />
      <article className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Ghost className="h-4 w-4 text-primary" />
            <span>GhostJob Guide</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 leading-tight">
            What is a ghost job?
          </h1>

          {/* Answer-first paragraph */}
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            A <strong className="text-foreground">ghost job</strong> is a public job posting that isn't tied to active hiring. The role looks real — title, company, description, apply button — but no one is being seriously interviewed for it. Companies leave these listings up to build talent pipelines, signal growth, or hit recruiter activity targets, which means applicants spend hours on roles that were never going to be filled.
          </p>

          <div className="prose prose-invert max-w-none space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">Why companies post ghost jobs</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li><strong className="text-foreground">Pipeline building</strong> — collecting résumés for roles that may open later.</li>
                <li><strong className="text-foreground">Investor optics</strong> — signaling growth without committing headcount.</li>
                <li><strong className="text-foreground">Recruiter KPIs</strong> — keeping listings live to hit posting or sourcing targets.</li>
                <li><strong className="text-foreground">Internal candidate hedging</strong> — when a role is already going to an internal hire but is still posted externally.</li>
                <li><strong className="text-foreground">Forgotten posts</strong> — listings that simply weren't taken down after the role was filled or canceled.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">Common red flags</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Posting has been live for 30+ days with no updates.</li>
                <li>Same role keeps getting reposted every few weeks.</li>
                <li>Vague or missing salary range and benefits.</li>
                <li>Generic, copy-paste job description with no team specifics.</li>
                <li>Urgency language ("apply immediately," "hiring fast") with no real follow-through.</li>
                <li>Applicant counts that climb but never trigger outreach.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">Ghost job vs job scam</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-3 text-foreground font-semibold"></th>
                      <th className="text-left p-3 text-foreground font-semibold">Ghost job</th>
                      <th className="text-left p-3 text-foreground font-semibold">Job scam</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Company is real</td>
                      <td className="p-3">Yes</td>
                      <td className="p-3">Often impersonated</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Intent to hire</td>
                      <td className="p-3">Low or none</td>
                      <td className="p-3">None — usually fraud</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Asks for money or sensitive info</td>
                      <td className="p-3">No</td>
                      <td className="p-3">Yes</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Risk to applicant</td>
                      <td className="p-3">Wasted time</td>
                      <td className="p-3">Financial / identity theft</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">How GhostJob helps</h2>
              <p className="text-muted-foreground leading-relaxed">
                GhostJob is a free Chrome extension that scans LinkedIn job pages for the signals above and gives you a 0–100 Trust Score before you apply. Read more about{" "}
                <Link to="/ghost-jobs-on-linkedin" className="text-primary hover:underline">ghost jobs on LinkedIn</Link>{" "}
                or{" "}
                <Link to="/how-trust-score-works" className="text-primary hover:underline">how the Trust Score works</Link>.
              </p>
            </section>

            <div className="pt-4">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors text-lg shadow-md"
              >
                <ChromeIcon />
                Add GhostJob to Chrome — Free
              </a>
            </div>
          </div>
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default WhatIsAGhostJob;
