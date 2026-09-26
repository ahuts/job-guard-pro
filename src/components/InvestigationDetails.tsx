import { dimensionLabels, findingLabels, investigationSchema, type InvestigationExcerpt } from '@/lib/investigation';

function Excerpts({ excerpts }: { excerpts: InvestigationExcerpt[] }) {
  return <div className="space-y-2">{excerpts.map((excerpt, index) => <blockquote key={`${excerpt.sourceId}-${index}`} className="border-l-2 pl-3 text-sm">
    <p className="whitespace-pre-wrap">“{excerpt.quote}”</p>
    <a className="underline" href={excerpt.sourceUrl} target="_blank" rel="noopener noreferrer">{excerpt.sourceId === 'linkedin' ? 'LinkedIn listing' : 'Employer posting'} ↗</a>
  </blockquote>)}</div>;
}

export function InvestigationDetails({ value }: { value: unknown }) {
  const parsed = investigationSchema.safeParse(value);
  if (!parsed.success) return null;
  const investigation = parsed.data;
  return <section aria-label="Posting investigation" className="space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">Posting investigation</h3>
    <p className="text-sm" role="status">{investigation.status === 'completed' ? findingLabels[investigation.finding] : investigation.reason}</p>
    {investigation.sourceUrl ? <a className="block text-sm underline" href={investigation.sourceUrl} target="_blank" rel="noopener noreferrer">View compared employer posting ↗</a> : null}
    {investigation.dimensions.length ? <details><summary className="cursor-pointer text-sm font-medium">Compare responsibilities and qualifications</summary>
      <div className="mt-3 space-y-4">{investigation.dimensions.map(dimension => <div key={dimension.dimension} className="space-y-2">
        <p className="text-sm font-medium">{dimensionLabels[dimension.dimension]}: {dimension.finding === 'aligned' ? 'Aligned' : dimension.finding === 'conflicting' ? 'Difference found' : 'Not enough evidence'}</p>
        <Excerpts excerpts={dimension.excerpts} />
      </div>)}</div>
    </details> : null}
    {investigation.cautionFlags.length ? <div className="space-y-3"><h4 className="text-sm font-medium">Posting cautions</h4>
      {investigation.cautionFlags.map(flag => <div key={flag.kind} className="space-y-2"><p className="text-sm">{flag.label}</p><Excerpts excerpts={flag.excerpts} /></div>)}
    </div> : null}
    <p className="text-xs text-muted-foreground">Checked {new Date(investigation.checkedAt).toLocaleString()}</p>
    <div className="space-y-1 text-xs text-muted-foreground">{investigation.limitations.map(limit => <p key={limit}>{limit}</p>)}</div>
  </section>;
}
