import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, CheckCircle2, CircleHelp, Ghost, Save, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import type { EvidenceGroup } from "@/lib/trustScore";
import type { AnalysisResult } from "@/services/jobScraper";

interface GhostScoreDisplayProps {
  result: AnalysisResult;
  onSave?: () => void;
}

const presentation = {
  highly_verified: { label: "Highly Verified", risk: "Low Ghost Risk", color: "text-emerald-600", progress: "bg-emerald-500", ghost: "opacity-100 text-emerald-600", icon: CheckCircle2 },
  positive: { label: "Positive Signals", risk: "Low–Moderate Ghost Risk", color: "text-amber-600", progress: "bg-amber-500", ghost: "opacity-90 text-amber-600", icon: CheckCircle2 },
  unverified: { label: "Needs Verification", risk: "Ghost Risk: Unclear", color: "text-yellow-700", progress: "bg-yellow-500", ghost: "opacity-60 text-yellow-700", icon: CircleHelp },
  weak: { label: "Weakly Supported", risk: "High Ghost Risk", color: "text-orange-600", progress: "bg-orange-500", ghost: "opacity-45 text-orange-600", icon: TriangleAlert },
  contradictory: { label: "Contradictory Evidence", risk: "Very High Ghost Risk", color: "text-red-600", progress: "bg-red-500", ghost: "opacity-30 text-red-600", icon: TriangleAlert },
} as const;

const groups: Array<{ id: EvidenceGroup; title: string; Icon: typeof CheckCircle2 }> = [
  { id: "verified", title: "Verified signals", Icon: CheckCircle2 },
  { id: "caution", title: "Cautions", Icon: TriangleAlert },
  { id: "unverified", title: "Not enough data", Icon: CircleHelp },
];

export function GhostScoreDisplay({ result, onSave }: GhostScoreDisplayProps) {
  const { job, trustScore } = result;
  const style = presentation[trustScore.trustBand];
  const BandIcon = style.icon;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="bg-muted/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Ghost aria-hidden="true" className={`h-9 w-9 shrink-0 ${style.ghost}`} />
              <div className="min-w-0">
                <CardTitle className="truncate text-xl">{job.title}</CardTitle>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Building2 className="h-4 w-4" />{job.company} · {job.location}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GhostJob Trust Meter</p>
              <p className={`text-4xl font-bold ${style.color}`}>{trustScore.trustScore}<span className="text-base text-muted-foreground"> / 100</span></p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-1">
            <div className={`flex items-center gap-2 font-semibold ${style.color}`}><BandIcon className="h-4 w-4" />{style.label}</div>
            <p className="text-sm text-muted-foreground">{style.risk}</p>
          </div>
          <Progress value={trustScore.trustScore} className="h-3" indicatorClassName={style.progress} />
          <p className="text-sm">{trustScore.summary}</p>
          <div className="flex flex-wrap gap-2">
            {trustScore.qualityBadges.map((badge) => <Badge key={badge.id} variant="outline">{badge.label}</Badge>)}
            <Badge variant="secondary">Scoring v{trustScore.scoringVersion}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">This score is an estimate based on available public evidence—not a verdict on an employer. <Link to="/how-trust-score-works" className="underline hover:text-foreground">See how the Trust Score works</Link>.</p>
          {onSave && <Button onClick={onSave} variant="outline" className="w-full"><Save className="mr-2 h-4 w-4" />Save to Tracker</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Trust Meter evidence</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={["verified", "caution", "unverified"]}>
            {groups.map(({ id, title, Icon }) => {
              const items = trustScore.evidence.filter((item) => item.group === id);
              return <AccordionItem key={id} value={id}>
                <AccordionTrigger className="text-left"><span className="flex items-center gap-2"><Icon className="h-4 w-4" />{title} ({items.length})</span></AccordionTrigger>
                <AccordionContent>
                  {items.length === 0 ? <p className="text-sm text-muted-foreground">No {title.toLowerCase()} were returned for this scan.</p> : <ul className="space-y-3">{items.map((item) => <li key={item.id} className="rounded-md border p-3"><div className="flex flex-wrap items-center gap-2"><strong>{item.label}</strong>{item.points !== 0 && <Badge variant={item.points > 0 ? "default" : "destructive"}>{item.points > 0 ? "+" : ""}{item.points} points</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{item.description}</p>{item.sourceUrl && <a className="mt-1 inline-block text-sm underline" href={item.sourceUrl} target="_blank" rel="noreferrer">View public source</a>}</li>)}</ul>}
                </AccordionContent>
              </AccordionItem>;
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
