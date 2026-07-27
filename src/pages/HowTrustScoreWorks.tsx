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
    question: "What is a good Trust Score?",
    answer:
      "Anything above 80 is a high-confidence active hire and worth prioritising. 61 to 80 is probably real. 31 to 60 means mixed signals — verify before investing time. 30 or below means multiple strong ghost-job flags.",
  },
  {
    question: "Does a low Trust Score mean the job is fake?",
    answer:
      "No. A low score means the listing shows several patterns associated with jobs that aren't being actively filled. It is a probability estimate based on public signals, not proof about any employer's intent.",
  },
  {
    question: "Why did the score change for the same job?",
    answer:
      "Scores use live signals such as posting age, applicant counts, and repost history. As a listing gets older or is reposted, those inputs change and the score moves with them.",
  },
];

const HowTrustScoreWorks = () => {
  useEffect(() => {
    track("organic_landing_view", { page: "/how-trust-score-works" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="How the GhostJob Trust Score Works"
        description="The GhostJob Trust Score combines 10+ ghost-job signals into a single 0–100 number. See the signal categories, what each score range means, a worked example, and the limitations."
        path="/how-trust-score-works"
        type="article"
        jsonLd={[
          articleSchema({
            headline: "How the GhostJob Trust Score Works",
            description:
              "The GhostJob Trust Score combines 10+ ghost-job signals into a single 0–100 number. See the signal categories, what each score range means, a worked example, and the limitations.",
            path: "/how-trust-score-works",
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
            <span>GhostJob Methodology</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 leading-tight">
            How the GhostJob Trust Score works
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            The <strong className="text-foreground">Trust Score</strong> is a 0–100 number GhostJob assigns to each LinkedIn job posting. It combines 10+ signals across four categories — listing freshness, repost behavior, salary and description quality, and recruiter activity — into a single confidence estimate. Higher scores mean the listing looks more like a real, actively-worked opening.
          </p>

          <AnswerBox
            question="Quick answer: how is the Trust Score calculated?"
            answer="GhostJob reads public signals from the listing, groups them into four categories, and combines them into one 0–100 confidence number. Higher means the posting looks more like a real, actively-worked opening."
            points={[
              "Freshness — posting age, last edit, time since first seen.",
              "Repost behaviour — duplicate titles and description fingerprints from the same company.",
              "Description quality — pay transparency, specificity, boilerplate detection.",
              "Recruiter and company signals — posting frequency, applicant-count behaviour, urgency language.",
            ]}
          />

          <div className="prose prose-invert max-w-none space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">What signals does the Trust Score use?</h2>
              <ul className="space-y-3 text-muted-foreground list-disc list-inside">
                <li><strong className="text-foreground">Freshness</strong> — posting age, last-edited timestamp, time since first seen.</li>
                <li><strong className="text-foreground">Repost behavior</strong> — duplicate detection across recent listings from the same company, including title and description fingerprints.</li>
                <li><strong className="text-foreground">Description quality</strong> — specificity of responsibilities, presence of team or stack details, salary transparency, generic boilerplate detection.</li>
                <li><strong className="text-foreground">Recruiter & company signals</strong> — recruiter posting frequency, applicant-count behavior, urgency language, and company hiring patterns.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">What each score range means</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-3 text-foreground font-semibold">Score</th>
                      <th className="text-left p-3 text-foreground font-semibold">Verdict</th>
                      <th className="text-left p-3 text-foreground font-semibold">What to do</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">0–30</td>
                      <td className="p-3">Likely ghost job</td>
                      <td className="p-3">Skip or deprioritize. Multiple strong red flags.</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">31–60</td>
                      <td className="p-3">Caution</td>
                      <td className="p-3">Apply only if the role is a strong fit. Verify on the company careers page first.</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">61–80</td>
                      <td className="p-3">Probably real</td>
                      <td className="p-3">Apply with normal effort. Watch for follow-up.</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">81–100</td>
                      <td className="p-3">High-confidence active hire</td>
                      <td className="p-3">Prioritize. Tailor your application.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">What does a scored listing look like in practice?</h2>
              <p className="text-muted-foreground leading-relaxed">
                A "Senior Backend Engineer" posting from a 200-person SaaS company is 6 days old, has been posted once, includes a $160k–$200k salary range, names the team and the database stack, and shows "Be among the first 25 applicants." That posting would land in the 80s — fresh, specific, transparent, and not part of a repost pattern.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                The same title from a company that has reposted the role 4 times in the last 90 days, with no salary, generic responsibilities, and 800+ applicants would land in the 20s.
              </p>
            </section>

            <ScanCTA location="how_trust_score_works_mid" label="Score a listing free" />

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">What does the Trust Score not prove?</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Trust Score is an estimate, not a verdict. Always pair it with your own judgment.</li>
                <li>Some companies legitimately repost roles to widen reach — context matters.</li>
                <li>GhostJob does not yet detect outright scams; it focuses on ghost-job signals on real companies.</li>
                <li>Newly posted roles (under 24 hours) have less historical data, so scores can swing as more signals come in.</li>
              </ul>
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

            <ScanCTA location="how_trust_score_works_end" label="Score a listing free" />

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">Related reading</h2>
              <p className="text-muted-foreground leading-relaxed">
                <Link to="/what-is-a-ghost-job" className="text-primary hover:underline">What is a ghost job?</Link>{" "}
                ·{" "}
                <Link to="/ghost-jobs-on-linkedin" className="text-primary hover:underline">Ghost jobs on LinkedIn</Link>
              </p>
            </section>

            <div className="pt-4">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("extension_store_clicked", { location: "how_trust_score_works" })
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

export default HowTrustScoreWorks;
