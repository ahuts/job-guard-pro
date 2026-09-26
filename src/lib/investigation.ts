import { z } from 'zod';

export const matchFindings = ['exact_match', 'probable_match', 'different_role', 'insufficient_evidence'] as const;
export const dimensionNames = ['responsibilities', 'required_qualifications', 'preferred_qualifications', 'seniority', 'location', 'employment_type', 'requisition_id'] as const;
export const findingLabels: Record<typeof matchFindings[number], string> = {
  exact_match: 'Exact employer posting confirmed', probable_match: 'Possible employer posting match',
  different_role: 'The compared posting appears to be a different role', insufficient_evidence: 'Not enough evidence to compare the role',
};
export const dimensionLabels: Record<typeof dimensionNames[number], string> = {
  responsibilities: 'Responsibilities', required_qualifications: 'Required qualifications', preferred_qualifications: 'Preferred qualifications',
  seniority: 'Seniority', location: 'Location eligibility', employment_type: 'Employment type', requisition_id: 'Requisition ID',
};
const httpsUrl = z.string().url().max(2048).refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; });
export const excerptSchema = z.object({ sourceId: z.string().max(80), sourceUrl: httpsUrl, quote: z.string().min(12).max(800) });
export const investigationSchema = z.object({
  version: z.literal(1),
  status: z.enum(['completed', 'disabled', 'sign_in_required', 'not_eligible', 'budget_exhausted', 'source_unavailable', 'provider_error', 'timed_out', 'in_progress']),
  finding: z.enum(matchFindings), reason: z.string().max(600), checkedAt: z.string(),
  sourceUrl: httpsUrl.optional(),
  dimensions: z.array(z.object({ dimension: z.enum(dimensionNames), finding: z.enum(['aligned', 'conflicting', 'insufficient_evidence']), excerpts: z.array(excerptSchema).max(6) })).max(7),
  cautionFlags: z.array(z.object({ kind: z.enum(['payment_demand', 'credential_request', 'sensitive_data_request']), label: z.string().max(160), excerpts: z.array(excerptSchema).max(3) })).max(3),
  limitations: z.array(z.string().max(300)).max(8),
});
export type Investigation = z.infer<typeof investigationSchema>;
export type InvestigationExcerpt = z.infer<typeof excerptSchema>;
export const investigationLimitations = [
  'Public evidence confirms publication and consistency, not private hiring intent or recruiter identity.',
  'Semantic comparisons and caution flags do not change the Trust Score during this pilot.',
];
export function emptyInvestigation(status: Investigation['status'], reason: string): Investigation {
  return { version: 1, status, finding: 'insufficient_evidence', reason, checkedAt: new Date().toISOString(), dimensions: [], cautionFlags: [], limitations: [...investigationLimitations] };
}
