import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { calculateTrustScore, getQualityBadges, hasConcreteRoleDetails } from '../lib/trustScore.js';
import { getJobInsights, getSuggestedQuestions } from '../lib/jobInsights.js';
import { resolveEmployer } from './employerResolver.js';
import { cacheGet, cachePut, hash, reserveSearch, storeConfigured } from './searchStore.js';

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
export async function verifiedUser(authorization?: string): Promise<string | null> {
  if (!authorization?.startsWith('Bearer ')) return null;
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return null;
  const client = createClient(base, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3000) }) } });
  try {
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    return !error && data.user && !data.user.is_anonymous ? data.user.id : null;
  } catch { return null; }
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
  const deepConfigured = process.env.GHOSTJOB_DEEP_SEARCH_ENABLED === 'true' && Boolean(process.env.BRAVE_SEARCH_API_KEY) && storeConfigured();
  const fingerprint = hash(input);
  const resultKey = `gj:deep-result:${hash([userId, input.scanAttemptId, fingerprint])}`;
  let search: ((query: string) => Promise<string[]>) | undefined;
  let deepState: 'available' | 'sign_in_required' | 'disabled' | 'limited' | 'completed' = !deepConfigured ? 'disabled' : !userId ? 'sign_in_required' : 'available';
  const deadline = Date.now() + (input.scanMode === 'deep' ? 23000 : 8500);
  if (input.scanMode === 'deep') {
    if (!userId) throw new ScanError(401, 'Sign in to search more sources.');
    if (!deepConfigured) throw new ScanError(503, 'Deeper search is currently unavailable. Your existing result is unchanged.');
    if (!input.scanAttemptId) throw new ScanError(400, 'A scan attempt identifier is required.');
    const cached = await cacheGet<ReturnType<typeof calculateTrustScore> & { failedStatus?: number; error?: string }>(resultKey);
    if (cached?.failedStatus) throw new ScanError(cached.failedStatus, cached.error || 'The prior search failed. No additional query was charged.');
    if (cached) return cached;
    let reservation: number;
    try { reservation = await reserveSearch(userId, input.scanAttemptId, fingerprint); } catch { throw new ScanError(503, 'Search budget service unavailable. No search was started.'); }
    if (reservation === 0) throw new ScanError(409, 'This deeper check has already started. Retry shortly to retrieve its result; no additional search will be charged.');
    if (reservation < 0) throw new ScanError(429, 'Search capacity reached. Your existing result is unchanged.');
    let count = 0;
    search = async query => {
      if (++count > 2 || Date.now() >= deadline) return [];
      const endpoint = new URL('https://api.search.brave.com/res/v1/web/search');
      endpoint.searchParams.set('q', query); endpoint.searchParams.set('count', '5');
      try {
        const response = await fetch(endpoint, { headers: { 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!, Accept: 'application/json' }, signal: AbortSignal.timeout(Math.max(1, Math.min(4000, deadline - Date.now()))) });
        if (!response.ok) throw new Error('Provider unavailable');
        const data = await response.json();
        return (data.web?.results ?? []).slice(0, 5).map((r: { url: string }) => r.url);
      } catch {
        const error = 'Search provider unavailable. No scan allowance was consumed; this attempt will not trigger another paid query.';
        await cachePut(resultKey, { failedStatus: 502, error }, 86400).catch(() => {});
        throw new ScanError(502, error);
      }
    };
    deepState = 'completed';
  }
  const resolution = await resolveEmployer({ ...input, title: input.title!, company: input.company!, url: input.url ?? undefined }, { deadline, search });
  const result = calculateTrustScore({ ...resolution.score, scoringVersion: 3,
    concreteRoleDetails: hasConcreteRoleDetails(input.description ?? ''), reposted: input.reposted,
    repeatedWithoutVerification: Boolean(input.firstObservedAt && Date.now() - Date.parse(input.firstObservedAt) >= 45 * 86400000),
    qualityBadges: getQualityBadges(input.description ?? '', input.salary),
  });
  result.descriptionCoverage = input.descriptionCoverage ?? (input.description ? 'partial' : 'unavailable');
  result.coverageDetails = { status: result.descriptionCoverage, truncated: input.coverageDetails?.truncated ?? false, analyzedCharacters: input.description?.length ?? 0, reason: input.coverageDetails?.reason };
  result.verification = { ...resolution.verification, deepSearch: deepState };
  result.jobInsights = getJobInsights(input).map(i => ({ ...i, sourceUrl: input.url ?? undefined }));
  result.suggestedQuestions = getSuggestedQuestions(input, resolution.score.careersVerification === 'verified_match');
  result.scanAttemptId = input.scanAttemptId;
  if (input.scanMode === 'deep') await cachePut(resultKey, result, 86400);
  // No descriptions, account IDs, or URLs in operational metrics.
  console.info('ghostjob_scan', { version: 3, mode: input.scanMode, outcome: result.verification.outcome, sources: result.verification.sources.length });
  return result;
}
