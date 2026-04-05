import { Link2, Search, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Link2,
    title: "Paste Job URL",
    description: "Copy any job listing URL from LinkedIn, Indeed, Glassdoor, or any job board.",
  },
  {
    icon: Search,
    title: "Get Instant Ghost Score",
    description: "Our AI analyzes the posting in seconds, checking dozens of legitimacy signals.",
  },
  {
    icon: CheckCircle2,
    title: "Apply with Confidence",
    description: "Focus your energy on real opportunities. Skip the ghost jobs entirely.",
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
            Three simple steps to a smarter job search.
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
      </div>
    </section>
  );
};

export default HowItWorksSection;
