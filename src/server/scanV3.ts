import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { calculateTrustScore, getQualityBadges, hasConcreteRoleDetails } from '../lib/trustScore.js';
import { getJobInsights, getJobQualityChecklist, getSuggestedQuestions } from '../lib/jobInsights.js';
import { investigateJob } from './investigateJob.js';

const url = z.preprocess(v => v === '' ? undefined : v, z.string().url().max(2048).refine(v => new URL(v).protocol === 'https:', 'HTTPS required').nullish());
export const scanSchema = z.object({
  title: z.string().trim().min(1).max(300), company: z.string().trim().min(1).max(300),
  location: z.string().max(300).optional(), description: z.string().max(12000).optional(),
  url, applicationUrl: url, employerUrl: url, companyLinkedInUrl: url,
  requisitionId: z.string().max(120).nullish(), salary: z.string().max(500).nullish(),
  scoringVersion: z.union([z.literal(2), z.literal(3)]).optional(),
  scanMode: z.enum(['standard', 'deep']).default('standard'),
  scanAttemptId: z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/).optional(),
  descriptionCoverage: z.enum(['expanded', 'complete', 'partial', 'unavailable']).optional(),
  coverageDetails: z.object({ status: z.enum(['expanded', 'complete', 'partial', 'unavailable']), truncated: z.boolean(), analyzedCharacters: z.number().int().min(0).max(12000), reason: z.string().max(300).optional() }).optional(),
  reposted: z.boolean().optional(), postedAt: z.string().max(100).nullish(),
  applicants: z.string().max(100).nullish(), employmentType: z.string().max(100).nullish(), experienceLevel: z.string().max(100).nullish(),
  promoted: z.boolean().optional(), activelyReviewing: z.boolean().optional(),
  applicationMethod: z.enum(['linkedin_easy_apply', 'linkedin_apply', 'external_apply', 'unknown']).optional(),
  firstObservedAt: z.string().max(100).nullish(),
});
export class ScanError extends Error { constructor(public status: number, message: string) { super(message); } }
export type AuthFailure = 'not_configured' | 'configuration_invalid' | 'session_invalid' | 'provider_unavailable';
export async function verifiedUser(authorization?: string, onFailure?: (reason: AuthFailure) => void): Promise<string | null> {
  if (!authorization?.startsWith('Bearer ')) { onFailure?.('session_invalid'); return null; }
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) { onFailure?.('not_configured'); return null; }
  try {
    const client = createClient(base, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3000) }) } });
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (!error && data.user && !data.user.is_anonymous) return data.user.id;
    // Only fixed classifications leave this helper; never expose provider error text.
    onFailure?.(error && /invalid api key|no api key/i.test(error.message) ? 'configuration_invalid' : error && (error.status ?? 0) >= 500 ? 'provider_unavailable' : 'session_invalid');
    return null;
  } catch { onFailure?.('provider_unavailable'); return null; }
}
export function v3Allowed(userId: string | null): boolean {
  if (process.env.GHOSTJOB_V3_ENABLED !== 'true' || process.env.GHOSTJOB_V3_SCHEMA_READY !== 'true') return false;
  const pilot = (process.env.GHOSTJOB_V3_PILOT_USERS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return process.env.GHOSTJOB_V3_ROLLOUT === 'public' || Boolean(userId && pilot.includes(userId));
}
export async function scanV3(body: unknown, authorization?: string) {
  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) throw new ScanError(400, 'Invalid scan details: ' + parsed.error.issues.map(i => i.path.join('.') + ' ' + i.message).slice(0, 3).join('; '));
  const input = parsed.data;
  const userId = await verifiedUser(authorization);
  if (!v3Allowed(userId)) throw new ScanError(503, 'GhostJob 1.3 is not enabled for this account yet. The production pilot requires a compatible database and server release.');
  if (input.scanMode === 'deep' && !userId) throw new ScanError(401, 'Sign in to search more sources.');
  const deadline = Date.now() + 30_000;
  const { resolution, investigation } = await investigateJob({ ...input, title: input.title!, company: input.company!, url: input.url ?? undefined }, userId, deadline);
  const result = calculateTrustScore({ ...resolution.score, scoringVersion: 3,
    concreteRoleDetails: hasConcreteRoleDetails(input.description ?? ''), reposted: input.reposted,
    repeatedWithoutVerification: Boolean(input.firstObservedAt && Date.now() - Date.parse(input.firstObservedAt) >= 45 * 86400000),
    qualityBadges: getQualityBadges(input.description ?? '', input.salary),
  });
  result.descriptionCoverage = input.descriptionCoverage ?? (input.description ? 'partial' : 'unavailable');
  result.coverageDetails = { status: result.descriptionCoverage, truncated: input.coverageDetails?.truncated ?? false, analyzedCharacters: input.description?.length ?? 0, reason: input.coverageDetails?.reason };
  result.verification = { ...resolution.verification, deepSearch: investigation.status === 'completed' ? 'completed' : investigation.status === 'sign_in_required' ? 'sign_in_required' : investigation.status === 'budget_exhausted' ? 'limited' : 'disabled' };
  result.investigation = investigation;
  result.jobInsights = getJobInsights(input).map(i => ({ ...i, sourceUrl: input.url ?? undefined }));
  result.jobQualityChecklist = getJobQualityChecklist(input);
  result.suggestedQuestions = getSuggestedQuestions(input, resolution.score.careersVerification === 'verified_match');
  result.scanAttemptId = input.scanAttemptId;
  // No descriptions, account IDs, or URLs in operational metrics.
  console.info('ghostjob_scan', { version: 3, mode: input.scanMode, outcome: result.verification.outcome, sources: result.verification.sources.length });
  return result;
}
