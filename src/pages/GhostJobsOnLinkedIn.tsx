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
    question: "How can you tell if a LinkedIn job is a ghost job?",
    answer:
      "Check whether the role appears on a verified employer source, whether the application path is active, and whether the title, location, and requirements describe the same job. Reposting and applicant counts alone cannot establish hiring intent.",
  },
  {
    question: "Is a reposted LinkedIn job always a ghost job?",
    answer:
      "No. Employers may repost for many reasons. Treat a repost as context and check the employer's current posting before drawing a conclusion.",
  },
  {
    question: "Should I still apply if the Trust Score is borderline?",
    answer:
      "A middle score often means public evidence is incomplete. Check the employer's own careers page and review any matching role before deciding how much time to spend.",
  },
];

const GhostJobsOnLinkedIn = () => {
  useEffect(() => {
    track("organic_landing_view", { page: "/ghost-jobs-on-linkedin" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Ghost Jobs on LinkedIn: How to Spot Them Before You Apply"
        description="Check a LinkedIn job against employer sources, application links, role details, and available public evidence before applying."
        path="/ghost-jobs-on-linkedin"
        type="article"
        jsonLd={[
          articleSchema({
            headline: "Ghost Jobs on LinkedIn: How to Spot Them Before You Apply",
            description:
              "Check a LinkedIn job against employer sources, application links, role details, and available public evidence before applying.",
            path: "/ghost-jobs-on-linkedin",
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
            Ghost jobs on LinkedIn: how to spot them before you apply
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            A LinkedIn listing is a starting point, not proof that a role is still open. Look for a corresponding posting on a verified employer source and compare the title, location, requirements, and application path. If a page is unavailable or the description is incomplete, keep that uncertainty visible.
          </p>

          <AnswerBox
            question="Quick answer: how do you spot a ghost job on LinkedIn?"
            answer="Check the employer's public posting and application path. Compare role details when enough text is available, and treat missing evidence as unknown."
            points={[
              "Confirm the source belongs to the employer or its authorized hiring platform.",
              "Compare title, responsibilities, qualifications, and location.",
              "Check whether the application path still works.",
              "Review coverage limits before treating a missing match as a conflict.",
            ]}
          />

          <div className="prose prose-invert max-w-none space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">1. How long has the posting been live?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Posting age gives context, but it does not prove whether a role is open. Check the employer's current posting and application destination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">2. Has the same role been reposted?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Reposting can reflect a changed role, a renewed search, or routine distribution. GhostJob shows the repost label as context; it does not deduct Trust Score points for it in the current scoring version.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">3. Does the applicant count make sense?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Applicant counts are not a reliable measure of a company's hiring intent or your chance of an interview. GhostJob keeps them separate from the Trust Score.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">4. Is the description specific or boilerplate?</h2>
              <p className="text-muted-foreground leading-relaxed">
                A specific description makes a role easier to compare with an employer posting. Missing pay or team details do not by themselves mean that a job is inactive.
              </p>
            </section>

            <ScanCTA location="ghost_jobs_on_linkedin_mid" />

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">When should you verify a listing manually?</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>The role is critical to your search and the Trust Score is borderline (40–60).</li>
                <li>The company recently announced layoffs or a hiring freeze.</li>
                <li>The recruiter has no public activity and the posting was made by a generic HR account.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                In those cases, cross-check the role on the company's own careers page. If it is not listed there, the result remains unresolved unless a source explicitly confirms closure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">How do you check these signals automatically?</h2>
              <p className="text-muted-foreground leading-relaxed">
                GhostJob checks public sources through its service. You can scan on this site or use the extension while reading a LinkedIn listing. Read about{" "}
                <Link to="/how-trust-score-works" className="text-primary hover:underline">how the Trust Score works</Link>{" "}
                or the{" "}
                <Link to="/what-is-a-ghost-job" className="text-primary hover:underline">underlying ghost-job definition</Link>.
              </p>
            </section>

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

            <ScanCTA location="ghost_jobs_on_linkedin_end" />

            <div className="pt-4">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("extension_store_clicked", { location: "ghost_jobs_on_linkedin" })
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

export default GhostJobsOnLinkedIn;
