import { useEffect, useState } from "react";

const GhostScoreCard = () => {
  const [score, setScore] = useState(0);
  const targetScore = 28; // Low trust score = likely ghost job

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setScore((prev) => {
          if (prev >= targetScore) {
            clearInterval(interval);
            return targetScore;
          }
          return prev + 1;
        });
      }, 20);
      return () => clearInterval(interval);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getScoreColor = (s: number) => {
    if (s >= 61) return "text-safe";
    if (s >= 31) return "text-warning";
    return "text-danger";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 61) return "Likely Legitimate";
    if (s >= 31) return "Proceed with Caution";
    return "Likely Ghost Job";
  };

  const getBadgeColor = (s: number) => {
    if (s >= 61) return "bg-safe";
    if (s >= 31) return "bg-warning";
    return "bg-danger";
  };

  return (
    <div className="relative bg-card rounded-xl border border-border shadow-2xl shadow-primary/10 p-6 max-w-sm w-full">
      {/* Fake job listing */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">TC</div>
          <div>
            <p className="font-semibold text-sm text-foreground">Senior Product Manager</p>
            <p className="text-xs text-muted-foreground">TechCorp Inc. · Remote</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">Full-time</span>
          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">"Competitive salary"</span>
          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">Reposted 3x</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-secondary w-full" />
          <div className="h-2 rounded-full bg-secondary w-4/5" />
          <div className="h-2 rounded-full bg-secondary w-3/5" />
        </div>
      </div>

      {/* Trust Score Badge Overlay */}
      <div className="absolute -top-4 -right-4 animate-score-pulse">
        <div className={`${getBadgeColor(score)} rounded-xl px-4 py-2.5 shadow-lg`}>
          <p className="text-[10px] font-semibold tracking-wider uppercase text-white">Trust Score</p>
          <p className="text-2xl font-extrabold text-white">{score}</p>
        </div>
      </div>

      {/* Red/yellow flags */}
      <div className="border-t border-border pt-3 mt-3 space-y-1.5">
        <p className="text-xs font-semibold text-danger flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger" /> 🔁 Reposted 3 times
        </p>
        <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" /> 💰 Vague "competitive" salary
        </p>
        <p className="text-xs font-semibold text-danger flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger" /> ⚡ "Immediate start" urgency language
        </p>
      </div>

      <div className="mt-3 text-center">
        <span className={`text-xs font-bold ${getScoreColor(score)}`}>
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
};

export default GhostScoreCard;