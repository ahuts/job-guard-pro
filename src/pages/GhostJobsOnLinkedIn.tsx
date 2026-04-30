import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Ghost } from "lucide-react";
import { ChromeIcon, CHROME_STORE_URL } from "@/components/ChromeIcon";
import { articleSchema } from "@/lib/seo";

const PUBLISHED = "2026-04-29";

const GhostJobsOnLinkedIn = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Ghost Jobs on LinkedIn: How to Spot Them Before You Apply"
        description="LinkedIn-specific ghost-job signals: reposted listings, applicant-count anomalies, posting age, vague descriptions, and when to verify a recruiter manually."
        path="/ghost-jobs-on-linkedin"
        type="article"
        jsonLd={articleSchema({
          headline: "Ghost Jobs on LinkedIn: How to Spot Them Before You Apply",
          description:
            "LinkedIn-specific ghost-job signals: reposted listings, applicant-count anomalies, posting age, vague descriptions, and when to verify a recruiter manually.",
          path: "/ghost-jobs-on-linkedin",
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
            Ghost jobs on LinkedIn: how to spot them before you apply
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            LinkedIn is the largest source of ghost jobs because reposting is fast, cheap, and rewarded by the platform. The most reliable LinkedIn-specific signals are <strong className="text-foreground">posting age</strong>, <strong className="text-foreground">repost frequency</strong>, <strong className="text-foreground">applicant-count behavior</strong>, and <strong className="text-foreground">description quality</strong>. Use them together — no single signal is enough on its own.
          </p>

          <div className="prose prose-invert max-w-none space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">1. Posting age</h2>
              <p className="text-muted-foreground leading-relaxed">
                Most genuinely active LinkedIn roles are filled or closed within 30 days. If a posting has been live for 30+ days with no edits, treat it with suspicion — especially for high-volume titles like "Software Engineer" or "Marketing Manager."
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">2. Reposted listings</h2>
              <p className="text-muted-foreground leading-relaxed">
                The single strongest LinkedIn ghost-job signal. If the same role keeps reappearing every 2–4 weeks under a slightly different title or recruiter, the company is almost certainly using it as a pipeline. GhostJob automatically detects repost patterns based on title, company, and description fingerprint.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">3. Applicant-count anomalies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Watch for postings with hundreds or thousands of applicants but no movement on the role's status, or roles that show "Be among the first 25 applicants" weeks after going live. Both patterns suggest the funnel isn't being worked.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">4. Vague descriptions</h2>
              <p className="text-muted-foreground leading-relaxed">
                Active hiring managers write specific descriptions: team name, tech stack, day-one priorities. Ghost jobs lean on generic boilerplate, missing salary ranges, and copy-paste responsibilities that could apply to any company.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">When to verify manually</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>The role is critical to your search and the Trust Score is borderline (40–60).</li>
                <li>The company recently announced layoffs or a hiring freeze.</li>
                <li>The recruiter has no public activity and the posting was made by a generic HR account.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                In those cases, cross-check the role on the company's own careers page. If it isn't listed there, the LinkedIn post is likely stale.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">Get the signals automatically</h2>
              <p className="text-muted-foreground leading-relaxed">
                GhostJob runs all of these checks in your browser as you read the listing — no copy/paste, no extra tab. Read about{" "}
                <Link to="/how-trust-score-works" className="text-primary hover:underline">how the Trust Score works</Link>{" "}
                or the{" "}
                <Link to="/what-is-a-ghost-job" className="text-primary hover:underline">underlying ghost-job definition</Link>.
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

export default GhostJobsOnLinkedIn;
