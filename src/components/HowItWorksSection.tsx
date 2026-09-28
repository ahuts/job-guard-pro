import { Chrome, Search, ShieldCheck } from "lucide-react";

const steps = [
  {
    icon: Chrome,
    title: "Choose a LinkedIn job",
    description: "Paste the job URL here or use the GhostJob Chrome extension while viewing the listing.",
  },
  {
    icon: Search,
    title: "Check public evidence",
    description: "GhostJob checks employer sources, the application path, and the job details available to it.",
  },
  {
    icon: ShieldCheck,
    title: "Review the findings",
    description: "Read the Trust Score and coverage limits. Pro adds a closer comparison with the employer posting when available.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Scan on this site or directly from LinkedIn with the extension.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-border" />

          {steps.map((step, idx) => (
            <div key={step.title} className="text-center relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-card border-2 border-primary/20 flex items-center justify-center mb-5 relative z-10">
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full ghost-gradient flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {idx + 1}
                </div>
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Key differentiator */}
        <div className="mt-14 max-w-2xl mx-auto text-center">
          <div className="bg-card rounded-xl border border-primary/20 p-6">
            <p className="text-lg font-semibold text-foreground mb-2">
              Evidence before you invest time applying
            </p>
            <p className="text-muted-foreground text-sm">
              A missing source does not mean a job is fake. GhostJob shows what it could verify and where public evidence stops.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
