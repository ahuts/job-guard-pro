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
      "80–100 is Highly Verified; 60–79 has Positive Signals; 40–59 Needs Verification; 20–39 is Weakly Supported; and 0–19 has Contradictory Evidence. A 50 is neutral: evidence is unavailable or mixed, not negative.",
  },
  {
    question: "Does a low Trust Score mean the job is fake?",
    answer:
      "No. A low score means GhostJob found concrete contrary public evidence, such as an explicitly closed employer role. It is an estimate based on available public evidence, not proof about any employer's intent.",
  },
  {
    question: "Why did the score change for the same job?",
    answer:
      "Scores can change when an employer or ATS role becomes verifiable, closes, or changes. Reposting is a small caution; age alone is context, not a strong negative.",
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
        description="The GhostJob Trust Meter is one 0–100 score based on available public employer and ATS evidence. Learn what verification signals, cautions, and limits mean."
        path="/how-trust-score-works"
        type="article"
        jsonLd={[
          articleSchema({
            headline: "How the GhostJob Trust Score Works",
            description:
              "The GhostJob Trust Meter is one 0–100 score based on available public employer and ATS evidence. Learn what verification signals, cautions, and limits mean.",
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
            How the GhostJob Trust Meter works
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            The <strong className="text-foreground">GhostJob Trust Meter</strong> is one 0–100 Trust Score for a LinkedIn job posting. It starts at 50, adds only concrete public verification, and deducts only for concrete contrary evidence. The accompanying Ghost Risk is a plain-language label, never a second score.
          </p>

          <AnswerBox
            question="Quick answer: how is the Trust Score calculated?"
            answer="GhostJob starts at 50, checks supported public employer and ATS sources, and adds or deducts only when concrete evidence is available. Higher means more of the positive verification boxes are checked."
            points={[
              "Exact employer or ATS role match (+25) and active application destination (+10).",
              "Matching company identity, current source evidence, and concrete role scope (+5 each).",
              "An explicit employer or ATS closed-role conflict (−35).",
              "A LinkedIn repost label is a −5 caution, not proof; missing evidence remains neutral.",
            ]}
          />

          <div className="prose prose-invert max-w-none space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">What signals does the Trust Score use?</h2>
              <ul className="space-y-3 text-muted-foreground list-disc list-inside">
                <li><strong className="text-foreground">Employer/ATS verification</strong> — a normalized exact title and compatible location or remote status on Greenhouse, Lever, Ashby, or a public employer JobPosting page.</li>
                <li><strong className="text-foreground">Active destination</strong> — a direct live application page for that role.</li>
                <li><strong className="text-foreground">Source and role detail</strong> — identity match, current source evidence, and concrete responsibilities, qualifications, and scope.</li>
                <li><strong className="text-foreground">Concrete contrary evidence</strong> — an employer/ATS role explicitly shown closed while LinkedIn remains active; a repost is only a small caution.</li>
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
                      <td className="p-3 font-medium text-foreground">0–19</td>
                      <td className="p-3">Contradictory Evidence · Very High Ghost Risk</td>
                      <td className="p-3">Check the official source before spending more time.</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">20–39</td>
                      <td className="p-3">Weakly Supported · High Ghost Risk</td>
                      <td className="p-3">Verify the exact role on the employer's application source.</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">40–59</td>
                      <td className="p-3">Needs Verification · Ghost Risk Unclear</td>
                      <td className="p-3">Unknown evidence is neutral; check the employer source.</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">60–79</td>
                      <td className="p-3">Positive Signals · Low–Moderate Ghost Risk</td>
                      <td className="p-3">Apply with normal care; some details may still need verification.</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">80–100</td>
                      <td className="p-3">Highly Verified · Low Ghost Risk</td>
                      <td className="p-3">Prioritize if it fits, while using your own judgment.</td>
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
