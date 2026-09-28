const GhostScoreCard = () => {
  return (
    <div className="relative bg-card rounded-2xl border border-border shadow-2xl shadow-primary/10 p-8 max-w-md w-full">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Illustrative example</p>
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center text-base font-bold text-muted-foreground">TC</div>
          <div><p className="font-semibold text-base text-foreground">Senior Product Manager</p><p className="text-sm text-muted-foreground">TechCorp Inc. · Remote</p></div>
        </div>
        <div className="flex gap-2.5 flex-wrap"><span className="text-sm px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">Full-time</span><span className="text-sm px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">Reposted</span></div>
        <div className="space-y-2"><div className="h-2.5 rounded-full bg-secondary w-full" /><div className="h-2.5 rounded-full bg-secondary w-4/5" /><div className="h-2.5 rounded-full bg-secondary w-3/5" /></div>
      </div>

      <div className="absolute -top-5 -right-5"><div className="bg-warning rounded-xl px-5 py-3 shadow-lg"><p className="text-xs font-semibold tracking-wider uppercase text-white">Trust Meter</p><p className="text-3xl font-extrabold text-white">50/100</p></div></div>

      <div className="border-t border-border pt-4 mt-4 space-y-2">
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" /> Employer role not yet verified</p>
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" /> Reposted (context, not a score deduction)</p>
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" /> More public evidence needed</p>
      </div>
      <div className="mt-4 text-center"><span className="text-sm font-bold text-muted-foreground">Needs Verification · Ghost Risk Unclear</span></div>
    </div>
  );
};

export default GhostScoreCard;
