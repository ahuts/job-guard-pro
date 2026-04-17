import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ghost, Zap, Loader2 } from "lucide-react";
import { redirectToCheckout } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";

interface FreePlanBannerProps {
  scansUsed: number;
  maxScans: number;
}

export default function FreePlanBanner({ scansUsed, maxScans }: FreePlanBannerProps) {
  const remaining = Math.max(0, maxScans - scansUsed);
  const [upgrading, setUpgrading] = useState(false);
  const { toast } = useToast();

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
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Ghost className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Free Plan — {remaining} of {maxScans} scans remaining
            </p>
            <p className="text-xs text-muted-foreground">
              Upgrade for unlimited scans, advanced signals, and priority support.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={handleUpgrade}
          disabled={upgrading}
        >
          {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {upgrading ? "Redirecting..." : "Upgrade to Pro"}
        </Button>
      </CardContent>
    </Card>
  );
}
