import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { redirectToCheckout } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";

interface ProUpgradeBannerProps {
  isPro: boolean;
}

export default function ProUpgradeBanner({ isPro }: ProUpgradeBannerProps) {
  const [upgrading, setUpgrading] = useState(false);
  const { toast } = useToast();

  if (isPro) return null;

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
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
  };

  return (
    <Card className="border-accent/40 bg-gradient-to-r from-accent/10 to-primary/10 mb-6">
      <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 justify-center sm:justify-start">
            <Sparkles className="h-5 w-5 text-accent" />
            Unlock unlimited scans
          </h3>
          <p className="text-muted-foreground mt-1">
            Free plan includes 3 scans per month. Upgrade to Pro for unlimited scans, priority signal updates, and more.
          </p>
        </div>
        <button
          onClick={handleUpgrade}
          disabled={upgrading}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-5 rounded-lg transition-colors whitespace-nowrap shadow-md disabled:opacity-60"
        >
          {upgrading && <Loader2 className="h-4 w-4 animate-spin" />}
          {upgrading ? "Redirecting..." : "Upgrade to Pro — $9/mo"}
        </button>
      </CardContent>
    </Card>
  );
}
