import { useEffect, useState } from "react";

const GhostScoreCard = () => {
  const [score, setScore] = useState(50);
  const targetScore = 28;

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setScore((previous) => {
          if (previous <= targetScore) {
            clearInterval(interval);
            return targetScore;
          }
          return previous - 1;
        });
      }, 20);
      return () => clearInterval(interval);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative bg-card rounded-2xl border border-border shadow-2xl shadow-primary/10 p-8 max-w-md w-full">
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center text-base font-bold text-muted-foreground">TC</div>
          <div><p className="font-semibold text-base text-foreground">Senior Product Manager</p><p className="text-sm text-muted-foreground">TechCorp Inc. · Remote</p></div>
        </div>
        <div className="flex gap-2.5 flex-wrap"><span className="text-sm px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">Full-time</span><span className="text-sm px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">Reposted</span></div>
        <div className="space-y-2"><div className="h-2.5 rounded-full bg-secondary w-full" /><div className="h-2.5 rounded-full bg-secondary w-4/5" /><div className="h-2.5 rounded-full bg-secondary w-3/5" /></div>
      </div>

      <div className="absolute -top-5 -right-5 animate-score-pulse"><div className="bg-danger rounded-xl px-5 py-3 shadow-lg"><p className="text-xs font-semibold tracking-wider uppercase text-white">Trust Meter</p><p className="text-3xl font-extrabold text-white">{score}/100</p></div></div>

      <div className="border-t border-border pt-4 mt-4 space-y-2">
        <p className="text-sm font-semibold text-danger flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-danger" /> Employer role not verified</p>
        <p className="text-sm font-semibold text-warning flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-warning" /> Reposted (a caution, not proof)</p>
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" /> More public evidence needed</p>
      </div>
      <div className="mt-4 text-center"><span className="text-sm font-bold text-danger">Weakly Supported · High Ghost Risk</span></div>
    </div>
  );
};

export default GhostScoreCard;
