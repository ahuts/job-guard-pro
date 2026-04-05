import { Gauge, AlertTriangle, Bookmark } from "lucide-react";

const features = [
  {
    icon: Gauge,
    title: "Ghost Score (0–100)",
    description: "AI-powered legitimacy rating that instantly tells you how likely a job posting is fake. Color-coded from green (safe) to red (ghost).",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: AlertTriangle,
    title: "Red Flag Detection",
    description: "Automatically checks posting age, salary transparency, company health, hiring patterns, and more to surface hidden warning signs.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: Bookmark,
    title: "Application Tracker",
    description: "Save jobs you've analyzed, track your application status, and never lose an opportunity. Your job search command center.",
    color: "text-safe",
    bg: "bg-safe/10",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Job Search Smarter
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Stop guessing. Start knowing which jobs are real and worth your time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
