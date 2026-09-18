import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, CheckCircle2, CircleHelp, Ghost, Save, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import type { EvidenceGroup } from "@/lib/trustScore";
import type { DescriptionCoverage, JobInsightGroup, JobQualityCheckStatus } from "@/lib/jobInsights";
import type { AnalysisResult } from "@/services/jobScraper";
import { refineAnalysis } from '@/services/jobScraper';
import { useEffect, useState } from 'react';
import { verificationLabels } from '@/lib/verification';
import { SUPPORT_EMAIL } from '@/lib/seo';

interface GhostScoreDisplayProps {
  result: AnalysisResult;
  onSave?: () => void | Promise<void>;
  onResultChange?: (result: AnalysisResult) => void;
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

const insightGroups: Array<{ id: JobInsightGroup; title: string; icon: string }> = [
  { id: "role", title: "Role Snapshot", icon: "📋" },
  { id: "quality", title: "Job Quality", icon: "✨" },
  { id: "application", title: "Application Path", icon: "↗" },
  { id: "posting", title: "Posting Context", icon: "◷" },
];

const coverageLabel: Record<DescriptionCoverage, string> = {
  expanded: "Expanded full job details",
  complete: "Analyzed full job details",
  partial: "Partial job details available",
  unavailable: "Job details unavailable",
};

const qualityCheckPresentation: Record<JobQualityCheckStatus, { label: string; className: string; icon: string }> = {
  found: { label: "Found", className: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "✓" },
  not_listed: { label: "Not listed", className: "border-amber-200 bg-amber-50 text-amber-800", icon: "–" },
  unknown: { label: "Unknown", className: "border-slate-200 bg-slate-50 text-slate-700", icon: "?" },
};

export function GhostScoreDisplay({ result, onSave, onResultChange }: GhostScoreDisplayProps) {
  const [current, setCurrent] = useState(result);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(result.job);
  useEffect(() => { setCurrent(result); setDraft(result.job); }, [result]);
  const { job, trustScore } = current;
  const qualityChecklist = trustScore.jobQualityChecklist ?? [];
  const foundQualityDetails = qualityChecklist.filter((item) => item.status === "found").length;
  async function recheck(mode: 'standard' | 'deep') {
    setBusy(true); setError('');
    try {
      const next = await refineAnalysis({ ...current, job: mode === 'standard' ? { ...draft, descriptionCoverage: 'partial' } : job }, mode);
      setCurrent(next); onResultChange?.(next); setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Check unavailable'); }
    finally { setBusy(false); }
  }
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
          {trustScore.verification && <section className="space-y-2 rounded-lg border p-4" aria-label="Verification finding">
            <h3 className="font-semibold">{verificationLabels[trustScore.verification.outcome]}</h3>
            <p className="text-sm">{trustScore.verification.reason}</p>
            {trustScore.verification.sourceUrl && <a href={trustScore.verification.sourceUrl} target="_blank" rel="noreferrer" className="block underline">View employer {trustScore.verification.outcome === 'matched' ? 'posting' : 'source'} ↗</a>}
            <p className="text-xs text-muted-foreground">Checked {new Date(trustScore.verification.checkedAt).toLocaleString()}</p>
            {trustScore.verification.outcome !== 'matched' && trustScore.verification.outcome !== 'closed' && <Button disabled={busy || trustScore.verification.deepSearch === 'disabled'} onClick={() => recheck('deep')}>{busy ? 'Checking…' : 'Search more sources'}</Button>}
            <p className="text-xs">Deeper checks use separate search capacity and do not use another scan allowance. A completed no-match check is a result.</p>
          </section>}
          <details><summary className="cursor-pointer">View analyzed description</summary><p className="text-xs">Website scans may include only publicly accessible LinkedIn content. {trustScore.coverageDetails?.truncated ? 'Analysis capped at 12,000 characters.' : ''}</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap text-sm">{job.description.slice(0, 12000)}</pre></details>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEditing(!editing)}>Review details / Provide employer URL</Button><Button variant="outline" asChild><a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('GhostJob verification mismatch')}&body=${encodeURIComponent(`Please describe the mismatch:\n\nJob: ${job.url}\nScoring version: ${trustScore.scoringVersion}\nFinding: ${trustScore.verification?.outcome ?? 'unavailable'}`)}`}>Report a mismatch</a></Button></div>
          {editing && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void recheck('standard'); }}>
            {(['title', 'company', 'location', 'employerUrl', 'description'] as const).map(name => <label key={name} className="block text-sm">{{ title: 'Job title', company: 'Company', location: 'Location / eligibility', employerUrl: 'Employer or job URL', description: 'Description' }[name]}{name === 'description' ? <textarea className="block min-h-40 w-full rounded border p-2" maxLength={12000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /> : <input className="block w-full rounded border p-2" maxLength={name === 'employerUrl' ? 2048 : 300} required={name === 'title' || name === 'company'} type={name === 'employerUrl' ? 'url' : 'text'} value={draft[name] ?? ''} onChange={e => setDraft({ ...draft, [name]: e.target.value })} />}</label>)}
            <Button disabled={busy} type="submit">Verify these details</Button>
          </form>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {trustScore.qualityBadges.map((badge) => <Badge key={badge.id} variant="outline">{badge.label}</Badge>)}
            <Badge variant="outline">{coverageLabel[trustScore.descriptionCoverage] || 'Coverage unavailable'}</Badge>
            <Badge variant="secondary">Scoring v{trustScore.scoringVersion}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">This score is an estimate based on available public evidence—not a verdict on an employer. <Link to="/how-trust-score-works" className="underline hover:text-foreground">See how the Trust Score works</Link>.</p>
          {onSave && <Button onClick={async () => { setSaving(true); setSaveMessage(''); try { await onSave(); setSaveMessage('Saved to your tracker.'); } catch (e) { setSaveMessage(e instanceof Error ? e.message : 'Save failed. Please retry.'); } finally { setSaving(false); } }} disabled={busy || saving || (current !== result && !onResultChange)} variant="outline" className="w-full"><Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save to Tracker'}</Button>}
          {saveMessage && <p role="status" className="text-sm">{saveMessage}</p>}
        </CardContent>
      </Card>

      {qualityChecklist.length > 0 && <Card>
        <CardHeader>
          <CardTitle>Job Quality &amp; Clarity</CardTitle>
          <p className="text-sm text-muted-foreground">{foundQualityDetails} of {qualityChecklist.length} useful details found. These checks make the posting easier to evaluate; they never change Trust Score.</p>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="quality-checklist">
            <AccordionItem value="quality-checklist">
              <AccordionTrigger className="text-left">Review posting details ({qualityChecklist.length})</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {qualityChecklist.map((item) => {
                    const status = qualityCheckPresentation[item.status];
                    return <li key={item.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.label}</strong><Badge variant="outline" className={status.className}><span aria-hidden="true" className="mr-1 font-bold">{status.icon}</span>{status.label}</Badge></div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    </li>;
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>}

      <Card>
        <CardHeader><CardTitle>Trust Meter evidence</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={["verified", "caution", "unverified"]}>
            <AccordionItem value="sources"><AccordionTrigger>Sources Checked</AccordionTrigger><AccordionContent>{(trustScore.verification?.sources ?? []).map((source, i) => <p className="mb-3 text-sm" key={i}><a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.url}</a><br />{source.reason}<br />{new Date(source.checkedAt).toLocaleString()}{source.cached ? ' (cached)' : ''}</p>)}</AccordionContent></AccordionItem>
            <AccordionItem value="calculation"><AccordionTrigger>Score Calculation</AccordionTrigger><AccordionContent><p>Neutral starting point: 50</p>{trustScore.evidence.filter(e => e.points).map(e => <p key={e.id}>{e.label}: {e.points > 0 ? '+' : ''}{e.points}</p>)}<p>Trust Score: {trustScore.trustScore}/100</p></AccordionContent></AccordionItem>
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

      <Card>
        <CardHeader>
          <CardTitle>Full job audit</CardTitle>
          <p className="text-sm text-muted-foreground">Useful job and application context. These items do not change Trust Score.</p>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={["role", "quality", "application", "posting", "questions"]}>
            {insightGroups.map(({ id, title, icon }) => {
              const items = (trustScore.jobInsights ?? []).filter((item) => item.group === id);
              if (!items.length) return null;
              return <AccordionItem key={id} value={id}>
                <AccordionTrigger className="text-left"><span>{icon} {title} ({items.length})</span></AccordionTrigger>
                <AccordionContent><ul className="space-y-3">{items.map((item) => <li key={item.id} className="rounded-md border p-3"><strong>{item.label}</strong><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p></li>)}</ul></AccordionContent>
              </AccordionItem>;
            })}
            {(trustScore.suggestedQuestions ?? []).length > 0 && <AccordionItem value="questions"><AccordionTrigger className="text-left">💬 Questions to Ask</AccordionTrigger><AccordionContent><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{trustScore.suggestedQuestions.map((question) => <li key={question}>{question}</li>)}</ul></AccordionContent></AccordionItem>}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
