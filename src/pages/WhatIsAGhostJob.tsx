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
              <h2 className="text-2xl font-bold text-foreground mb-3">The numbers</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Ghost jobs aren't edge cases — they're a systemic problem.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-3 text-foreground font-semibold">Statistic</th>
                      <th className="text-left p-3 text-foreground font-semibold">Number</th>
                      <th className="text-left p-3 text-foreground font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-t border-border">
                      <td className="p-3">Jobs that are ghost postings</td>
                      <td className="p-3 font-semibold text-foreground">43%</td>
                      <td className="p-3">Resume Builder 2024</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3">Recruiters who admit posting ghost jobs</td>
                      <td className="p-3 font-semibold text-foreground">81%</td>
                      <td className="p-3">Resume Builder 2024</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3">Reposted roles that never fill</td>
                      <td className="p-3 font-semibold text-foreground">1 in 5</td>
                      <td className="p-3">Built In / Freshteam</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3">US LinkedIn listings showing ghost patterns</td>
                      <td className="p-3 font-semibold text-foreground">27%</td>
                      <td className="p-3">Industry Research 2025</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3">Money lost to fake job offers since 2019</td>
                      <td className="p-3 font-semibold text-foreground">$737M+</td>
                      <td className="p-3">FTC & BBB</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">The impact on job seekers</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Ghost jobs don't just waste time — they do real psychological damage.
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li><strong className="text-foreground">72% of job seekers</strong> report negative mental health impacts from drawn-out hiring processes.</li>
                <li>The average job seeker spends <strong className="text-foreground">3+ hours</strong> on a single application.</li>
                <li>Repeated rejection from ghost jobs leads to <strong className="text-foreground">imposter syndrome, anxiety, and depression</strong>.</li>
                <li>Job seekers start to <strong className="text-foreground">blame themselves</strong> for not hearing back, when the job was never real.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">Common questions</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Are ghost jobs illegal?</h3>
                  <p className="text-muted-foreground leading-relaxed">Not currently. California passed a law in 2024 requiring employers to disclose whether a role is actively hiring, but most states have no such requirement. The FTC has flagged deceptive job postings as a growing concern.</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Can I report a ghost job?</h3>
                  <p className="text-muted-foreground leading-relaxed">You can report suspicious postings to the platform (LinkedIn, Indeed, etc.) and to the FTC. However, enforcement is limited — most platforms don't verify that roles are actively hiring.</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Why doesn't LinkedIn do anything about it?</h3>
                  <p className="text-muted-foreground leading-relaxed">LinkedIn's business model benefits from more listings, not fewer. Removing ghost jobs could reduce their job posting count by an estimated 30–40%.</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Is every job without a salary a ghost job?</h3>
                  <p className="text-muted-foreground leading-relaxed">No. Many legitimate roles don't post salary ranges. It's one signal among many — the key is looking at the <em>pattern</em>. No salary + no hiring manager + generic description + reposted 3× = likely ghost. No salary + specific requirements + team details + real hiring manager = probably legitimate.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">How to spot a ghost job</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Red flags are patterns, not single signals. One yellow flag doesn't mean a job is fake — but three or more should make you cautious.
              </p>
              <div className="space-y-4">
                <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4">
                  <h4 className="text-red-400 font-semibold mb-2">🚩 Red Flags (Strong Indicators)</h4>
                  <ul className="space-y-1 text-muted-foreground list-disc list-inside text-sm">
                    <li>Reposted multiple times without closing the original</li>
                    <li>Urgency language ("immediate start," "ASAP") without clear reason</li>
                    <li>Vague or missing salary ("competitive" or absent)</li>
                    <li>Unrealistic requirements (5 years for entry-level)</li>
                    <li>Generic description with no team or project details</li>
                  </ul>
                </div>
                <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-4">
                  <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Yellow Flags (Caution)</h4>
                  <ul className="space-y-1 text-muted-foreground list-disc list-inside text-sm">
                    <li>No salary range listed</li>
                    <li>No hiring manager or team info</li>
                    <li>Vague or missing location</li>
                    <li>AI-generated, buzzword-heavy language</li>
                    <li>Stale listing (30+ days with no updates)</li>
                  </ul>
                </div>
                <div className="bg-green-950/30 border border-green-800/50 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-2">✅ Green Flags (Positive)</h4>
                  <ul className="space-y-1 text-muted-foreground list-disc list-inside text-sm">
                    <li>Salary transparency — clear range or exact number</li>
                    <li>Benefits and perks detailed</li>
                    <li>Flexible work options specified</li>
                    <li>Hiring manager contact info</li>
                    <li>Clear, specific requirements and scope</li>
                  </ul>
                </div>
              </div>
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
