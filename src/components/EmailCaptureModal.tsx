import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, X, Sparkles } from "lucide-react";
import type { GhostScoreResult } from "@/lib/ghostScorer";

interface EmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ghostScore: GhostScoreResult | null;
}

export function EmailCaptureModal({
  open,
  onOpenChange,
  ghostScore,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;

    setLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // TODO: Actually save email to Supabase or your backend
    console.log("Email captured:", email, "for ghost score:", ghostScore);
    
    setLoading(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation completes
    setTimeout(() => {
      setEmail("");
      setSubmitted(false);
    }, 300);
  };

  const getScoreEmoji = () => {
    if (!ghostScore) return "📊";
    if (ghostScore.rating === "low") return "✅";
    if (ghostScore.rating === "medium") return "⚠️";
    if (ghostScore.rating === "high") return "👻";
    return "🚨";
  };

  const getScoreMessage = () => {
    if (!ghostScore) return "";
    switch (ghostScore.rating) {
      case "low":
        return "This job looks legitimate!";
      case "medium":
        return "This job has some warning signs.";
      case "high":
        return "This job is likely a ghost job!";
      case "critical":
        return "Avoid this job - it's almost certainly fake!";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Mail className="w-5 h-5 text-primary" />
                {submitted ? "You're All Set!" : "Save Your Analysis"}
              </DialogTitle>
              <DialogDescription className="mt-2">
                {submitted
                  ? "Thanks! We've saved your results."
                  : "Enter your email to save this Ghost Score and track your job applications."}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {ghostScore && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-1">{getScoreEmoji()}</div>
                <div className="text-2xl font-bold">
                  Ghost Score: {ghostScore.score}/100
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {getScoreMessage()}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full"
                autoFocus
              />
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="submit"
                className="w-full"
                disabled={!email.trim() || !email.includes("@") || loading}
              >
                {loading ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Save My Results
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleClose}
              >
                No thanks, just browsing
              </Button>
            </DialogFooter>

            <p className="text-xs text-center text-muted-foreground">
              We&apos;ll never spam you. Unsubscribe anytime.
            </p>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-6 text-center">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="font-semibold text-lg mb-1">
                Successfully Saved!
              </h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a confirmation to {email}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">What you get:</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Track unlimited job applications</li>
                <li>✓ Get alerts on suspicious postings</li>
                <li>✓ Weekly ghost job reports</li>
              </ul>
            </div>

            <Button onClick={handleClose} className="w-full">
              Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
