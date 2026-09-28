import { AlertTriangle, CheckCircle2, Search, Shield, Clock, Building2 } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Trust Score (0–100)",
    description: "A 0–100 summary of supported public evidence. Missing evidence stays neutral; a score is not a verdict on hiring intent.",
    color: "text-safe",
    bg: "bg-safe/10",
  },
  {
    icon: AlertTriangle,
    title: "Employer Source Checks",
    description: "Look for the role on the employer's public careers page or a hiring platform linked to the company.",
    color: "text-danger",
    bg: "bg-danger/10",
  },
  {
    icon: CheckCircle2,
    title: "Direct Posting Links",
    description: "Open the employer's posting when GhostJob can establish a reliable source for the role.",
    color: "text-safe",
    bg: "bg-safe/10",
  },
  {
    icon: Search,
    title: "Compare the Role with Pro",
    description: "When public evidence is available, compare responsibilities, qualifications, seniority, location, and application details.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Clock,
    title: "Posting Context",
    description: "See reposting, posting age, compensation, and other job details as context. They do not establish hiring intent on their own.",
    color: "text-danger",
    bg: "bg-danger/10",
  },
  {
    icon: Building2,
    title: "Evidence and Limits",
    description: "Review what matched, what conflicted, and where the available listing or employer source was incomplete.",
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
            Check the Posting Against the Employer's Evidence
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start with basic verification for free. Pro investigates public employer sources more deeply and compares the role when it can.
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

      </div>
    </section>
  );
};

export default FeaturesSection;
