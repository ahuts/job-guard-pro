import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthDialog from "./AuthDialog";
import { redirectToCheckout } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Check the public evidence",
    features: ["3 new job checks per month", "Current Trust Score", "Basic employer-source verification", "Saved job tracker", "Chrome extension included"],
    cta: "Start Free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "Investigate before you invest time applying",
    features: [
      "Unlimited standard scans",
      "Deeper employer-posting investigation when available",
      "Role, qualifications, and location comparison",
      "Source links and evidence-supported cautions",
      "All Free features included",
    ],
    cta: "Upgrade to Pro",
    featured: true,
  },
];

const PricingSection = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCTA = async (tier: typeof tiers[0]) => {
    track("cta_click", { cta: tier.cta, location: "pricing" });
    if (tier.featured) {
      if (!user) {
        setAuthOpen(true);
        return;
      }
      try {
        setUpgrading(true);
        track("checkout_started", { location: "pricing", plan: "pro" });
        await redirectToCheckout();
      } catch (err: any) {
        console.error("Checkout error:", err);
        toast({
          title: "Could not start checkout",
          description: err.message ?? "Please try again.",
          variant: "destructive",
        });
        setUpgrading(false);
      }
    } else if (!user) {
      setAuthOpen(true);
    } else {
      document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
              Start with the Trust Score. Go Pro for a closer look at the employer's posting.
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">Public sources may be incomplete or unavailable. Pro investigation has shared monthly capacity; standard scans remain available.</p>

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
                  onClick={() => handleCTA(tier)}
                  disabled={tier.featured && upgrading}
                >
                  {tier.featured && upgrading ? "Redirecting..." : tier.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} upgradeIntent />
    </>
  );
};

export default PricingSection;
