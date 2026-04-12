import { AlertTriangle, CheckCircle2, Search, Eye, Shield, Clock, Ban } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Trust Score (0–100)",
    description: "Instant legitimacy rating — higher means safer. Color-coded green (legit), yellow (caution), or red (likely ghost job).",
    color: "text-safe",
    bg: "bg-safe/10",
  },
  {
    icon: AlertTriangle,
    title: "Red & Yellow Flag Detection",
    description: "Reposted jobs, vague salaries, unrealistic requirements, urgency language, AI-generated text, and more — all surfaced with actual quotes from the posting.",
    color: "text-danger",
    bg: "bg-danger/10",
  },
  {
    icon: CheckCircle2,
    title: "Green Flag Highlights",
    description: "Salary transparency, benefits, flexible work, hiring manager contact — see what makes a job legitimate too, not just what's wrong.",
    color: "text-safe",
    bg: "bg-safe/10",
  },
  {
    icon: Search,
    title: "One-Click LinkedIn Scanning",
    description: "Our Chrome extension injects a Scan button directly into LinkedIn. No copy/paste, no leaving the page.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Eye,
    title: "Quote Extraction",
    description: "Every signal shows the actual text from the job posting — no guessing about why something was flagged.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: Clock,
    title: "Stale & Reposted Detection",
    description: "Jobs open 30+ days or reposted without closing the original? That's a major ghost signal. 30-40% of reposted roles never result in a hire.",
    color: "text-danger",
    bg: "bg-danger/10",
  },
  {
    icon: Ban,
    title: "AI Language Detection",
    description: "Catches generic, could-apply-anywhere text patterns that signal pipeline postings rather than real hiring.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Know Which Jobs Are Real Before You Apply
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            GhostJob scans 10+ legitimacy signals and shows you exactly what's wrong — and what's right — about every posting.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-xl border border-border p-7 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Signal breakdown */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-foreground text-center mb-8">
            What We Detect
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl border border-danger/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-danger" />
                <h4 className="font-semibold text-foreground">Red Flags</h4>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>🔄 Reposted job (-10)</li>
                <li>⚡ Urgency language (-10)</li>
                <li>📊 Unrealistic experience (-8)</li>
                <li>💰 Vague "competitive" salary (-8)</li>
                <li>📝 Generic description (-6)</li>
                <li>🎯 High experience for entry-level (-6)</li>
              </ul>
            </div>
            <div className="bg-card rounded-xl border border-warning/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-warning" />
                <h4 className="font-semibold text-foreground">Yellow Flags</h4>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>🔍 No salary range listed (-4)</li>
                <li>👤 No team/manager mentioned (-4)</li>
                <li>📍 Vague or missing location (-3)</li>
                <li>🤖 AI-generated language (-3)</li>
                <li>⚡ Culture buzzwords + red flags (-4)</li>
                <li>⏳ Stale listing 30+ days (-6)</li>
              </ul>
            </div>
            <div className="bg-card rounded-xl border border-safe/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-safe" />
                <h4 className="font-semibold text-foreground">Green Flags</h4>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>💰 Salary transparency (+10)</li>
                <li>🏥 Benefits mentioned (+6)</li>
                <li>🏠 Flexible work options (+5)</li>
                <li>👤 Hiring manager contact (+4)</li>
                <li>📋 Clear, specific requirements (+4)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;