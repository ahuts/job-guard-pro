import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthDialog from "./AuthDialog";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: ["3 scans per month", "Basic Trust Score", "Red flag summary", "Chrome extension included"],
    cta: "Start Free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For serious job seekers",
    features: [
      "Unlimited scans",
      "Full Trust Score breakdown",
      "Application tracker",
      "Weekly insight reports",
      "Priority support",
      "Export to CSV",
    ],
    cta: "Upgrade to Pro",
    featured: true,
  },
];

const PricingSection = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useAuth();

  const handleCTA = () => {
    if (!user) {
      setAuthOpen(true);
    }
  };

  return (
    <>
      <section id="pricing" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Start free. Upgrade when you're ready for unlimited power.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border p-8 transition-all ${
                  tier.featured
                    ? "border-primary bg-card shadow-xl shadow-primary/10 scale-[1.02]"
                    : "border-border bg-card"
                }`}
              >
                {tier.featured && (
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold ghost-gradient text-primary-foreground mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground ml-1">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-safe flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={tier.featured ? "hero" : "heroOutline"}
                  className="w-full py-5"
                  onClick={handleCTA}
                >
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
};

export default PricingSection;
