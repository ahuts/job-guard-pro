import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Ghost } from "lucide-react";
import { ChromeIcon, CHROME_STORE_URL } from "@/components/ChromeIcon";
import { articleSchema, faqPageSchema } from "@/lib/seo";
import { AnswerBox, ScanCTA } from "@/components/LearnBlocks";
import { track } from "@/lib/analytics";

const PUBLISHED = "2026-04-29";

const faqs = [
  {
    question: "Can public evidence prove a job is a ghost job?",
    answer:
      "No. Public sources can show whether a matching employer posting or application path exists, or whether a role is explicitly closed. They cannot reveal a company's private hiring intent.",
  },
  {
    question: "Can I report a ghost job?",
    answer:
      "You can report a suspicious listing to the platform and check the employer's official careers page. If a posting asks for payment or credentials, avoid sharing them and use the official company site to verify the request.",
  },
  {
    question: "Does a repost mean the role is inactive?",
    answer:
      "No. Employers repost roles for many reasons. Reposting is context, not proof of an inactive role, and it does not reduce the current GhostJob Trust Score.",
  },
  {
    question: "Is every job without a salary a ghost job?",
    answer:
      "No. Missing salary information is a job-quality detail, not proof of an inactive posting and not a current Trust Score deduction.",
  },
];

const WhatIsAGhostJob = () => {
  useEffect(() => {
    track("organic_landing_view", { page: "/what-is-a-ghost-job" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="What Is a Ghost Job? Definition, Red Flags & Examples"
        description="Learn what a ghost job is, what employer sources can verify, and where public evidence cannot establish hiring intent."
        path="/what-is-a-ghost-job"
        type="article"
        jsonLd={[
          articleSchema({
            headline: "What Is a Ghost Job? Definition, Red Flags & Examples",
            description:
              "Learn what a ghost job is, what employer sources can verify, and where public evidence cannot establish hiring intent.",
            path: "/what-is-a-ghost-job",
            datePublished: PUBLISHED,
          }),
          faqPageSchema(faqs),
        ]}
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
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            A <strong className="text-foreground">ghost job</strong> is a public job posting that appears open without a corresponding active hiring opportunity. A listing can look complete while the employer's public source has changed. Public evidence can reveal a match or conflict, but it cannot establish private hiring intent.
          </p>

          <AnswerBox
            question="Quick answer: what is a ghost job?"
            answer="A ghost job appears open even though it is not tied to active hiring. The best public check is whether the employer's own posting and application path support the listing."
            points={[
              "A verified matching employer role supports the public listing.",
              "An explicit employer closure can conflict with an active LinkedIn posting.",
              "Missing or inaccessible sources leave the result unresolved.",
              "A scam may seek money or sensitive information; GhostJob can flag some requests but cannot guarantee safety.",
            ]}
          />


          <div className="prose prose-invert max-w-none space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">Why do companies post ghost jobs?</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li><strong className="text-foreground">Pipeline building</strong> — collecting résumés for roles that may open later.</li>
                <li><strong className="text-foreground">Investor optics</strong> — signaling growth without committing headcount.</li>
                <li><strong className="text-foreground">Recruiter KPIs</strong> — keeping listings live to hit posting or sourcing targets.</li>
                <li><strong className="text-foreground">Internal candidate hedging</strong> — when a role is already going to an internal hire but is still posted externally.</li>
                <li><strong className="text-foreground">Forgotten posts</strong> — listings that simply weren't taken down after the role was filled or canceled.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">What can public evidence establish?</h2>
              <p className="text-muted-foreground leading-relaxed">An employer posting can support that a corresponding role and application path were public when checked. An explicit closure can conflict with a still-active LinkedIn listing. Missing pages, partial descriptions, and unavailable sources leave questions open.</p>
            </section>

            <ScanCTA location="what_is_a_ghost_job_mid" />

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">Common questions</h2>
              <div className="space-y-6">
                {faqs.map((faq) => (
                  <div key={faq.question}>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{faq.question}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>



            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">How do you check a posting?</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Find an employer-owned careers page or an authorized hiring platform.</li>
                <li>Compare the job title, location, responsibilities, and qualifications with the LinkedIn listing.</li>
                <li>Check whether the employer's application path is still available.</li>
                <li>Keep missing descriptions or inaccessible pages marked as unknown.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">Ghost job vs job scam: what's the difference?</h2>
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
              <h2 className="text-2xl font-bold text-foreground mb-3">How does GhostJob help?</h2>
              <p className="text-muted-foreground leading-relaxed">
                GhostJob checks available public employer sources and returns a 0–100 Trust Score based on supported evidence. Pro adds deeper posting comparison when available. Read more about{" "}
                <Link to="/ghost-jobs-on-linkedin" className="text-primary hover:underline">how ghost jobs show up on LinkedIn</Link>{" "}
                or{" "}
                <Link to="/how-trust-score-works" className="text-primary hover:underline">how the Trust Score is calculated</Link>.
              </p>
            </section>

            <ScanCTA location="what_is_a_ghost_job_end" />

            <div className="pt-4">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("extension_store_clicked", { location: "what_is_a_ghost_job" })
                }
                className="inline-flex items-center gap-2 border border-border hover:border-foreground/40 text-foreground font-medium py-3 px-6 rounded-lg transition-colors"
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
