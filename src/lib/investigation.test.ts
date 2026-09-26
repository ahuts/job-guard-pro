// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { investigationSchema } from './investigation';
import { evidenceState, investigateJob, investigationAccess, investigationFingerprint, validateComparison, type InvestigationInput } from '../server/investigateJob';
import { comparePostings, discoverOfficialSources, evaluateJev, newMeter, OPENAI_MODEL, type ModelComparison } from '../server/investigationProviders';
import { openaiCost, jevCost } from '../server/investigationBudget';
import { resolveEmployer, type EmployerCandidate, type Resolution } from '../server/employerResolver';

const description = 'Build payment APIs using TypeScript. Required qualifications: five years of backend engineering. Senior engineer working remotely in the United States.';
const input: InvestigationInput = { title: 'Senior Backend Engineer', company: 'Acme', location: 'Remote US', requisitionId: 'REQ-100', url: 'https://www.linkedin.com/jobs/view/123/', description, descriptionCoverage: 'complete' };
const candidate: EmployerCandidate = { id: 'employer-one', title: input.title, company: 'Acme', locations: ['Remote US'], requisitionId: 'REQ-100', url: 'https://acme.example/jobs/100', text: description, checkedAt: '2026-09-26T12:00:00Z', identitySourceUrl: 'https://acme.example/' };
const resolution: Resolution = { score: { careersVerification: 'verified_match', exactRoleMatch: true, companyIdentityVerified: true, sourceUrl: candidate.url }, verification: { outcome: 'matched', reason: 'Native match', checkedAt: candidate.checkedAt, sourceUrl: candidate.url, sources: [] }, candidates: [candidate] };
function comparison(): ModelComparison {
  return { selectedCandidateId: candidate.id, finding: 'exact_match', dimensions: ['responsibilities', 'required_qualifications'].map(dimension => ({ dimension: dimension as 'responsibilities' | 'required_qualifications', finding: 'aligned', excerpts: [
    { sourceId: 'linkedin', quote: dimension === 'responsibilities' ? 'Build payment APIs using TypeScript.' : 'Required qualifications: five years of backend engineering.' },
    { sourceId: candidate.id, quote: dimension === 'responsibilities' ? 'Build payment APIs using TypeScript.' : 'Required qualifications: five years of backend engineering.' },
  ] })), cautionFlags: [] };
}
function enabled() {
  for (const [key, value] of Object.entries({ GHOSTJOB_OPENAI_INVESTIGATION_ENABLED: 'true', GHOSTJOB_INVESTIGATION_SCHEMA_READY: 'true', GHOSTJOB_V3_PILOT_USERS: 'pilot', OPENAI_API_KEY: 'test', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test' })) vi.stubEnv(key, value);
}
function openaiResponse(value: unknown, extra: unknown[] = []) {
  return new Response(JSON.stringify({ model: OPENAI_MODEL, status: 'completed', usage: { input_tokens: 1000, output_tokens: 100 }, output: [...extra, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }), { status: 200 });
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('evidence-backed model findings', () => {
  it('accepts an exact match only with native identity, location and two-sided semantic evidence', () => {
    expect(validateComparison(comparison(), input, resolution).finding).toBe('exact_match');
    expect(validateComparison(comparison(), input, { ...resolution, score: { careersVerification: 'unverified' } }).finding).toBe('probable_match');
  });
  it('rejects invented quotes, unknown candidates and title-only matches', () => {
    const model = comparison(); model.dimensions[0].excerpts[1].quote = 'Invented qualifications and responsibilities.';
    expect(validateComparison(model, input, resolution).finding).toBe('insufficient_evidence');
    expect(validateComparison({ ...comparison(), selectedCandidateId: 'not-fetched' }, input, resolution).finding).toBe('insufficient_evidence');
    expect(validateComparison({ ...comparison(), dimensions: [] }, input, resolution).finding).toBe('insufficient_evidence');
  });
  it('keeps renamed matching titles probable and similar unrelated roles unresolved', () => {
    const renamed = { ...resolution, score: { careersVerification: 'active_board_no_match' as const }, candidates: [{ ...candidate, title: 'Senior Software Engineer, Payments' }] };
    expect(validateComparison(comparison(), input, renamed).finding).toBe('probable_match');
    const model = comparison(); model.finding = 'different_role'; model.dimensions[0].finding = 'conflicting';
    expect(validateComparison(model, input, resolution).finding).toBe('different_role');
  });
  it('known requisition conflicts prevent exact matches even when the model insists', () => {
    const result = validateComparison(comparison(), input, { ...resolution, candidates: [{ ...candidate, requisitionId: 'REQ-OTHER' }] });
    expect(result.finding).toBe('different_role'); expect(result.dimensions.find(d => d.dimension === 'requisition_id')?.finding).toBe('conflicting');
  });
  it('does not claim exact matches for incompatible remote eligibility', () => {
    const result = validateComparison(comparison(), input, { ...resolution, candidates: [{ ...candidate, locations: ['Remote UK'] }] });
    expect(result.finding).not.toBe('exact_match'); expect(result.limitations.join(' ')).toContain('Location eligibility');
  });
  it('preserves closure and partial-description limitations', () => {
    const result = validateComparison(comparison(), { ...input, descriptionCoverage: 'partial', coverageDetails: { truncated: true } }, { ...resolution, verification: { ...resolution.verification, outcome: 'closed' } });
    expect(result.finding).not.toBe('exact_match'); expect(result.limitations.join(' ')).toContain('closed'); expect(result.limitations.join(' ')).toContain('truncated');
  });
  it('only surfaces supported caution excerpts and never scores them', () => {
    const quote = 'Pay a $200 fee to obtain this job before you can interview.';
    const model = comparison(); model.cautionFlags = [{ kind: 'payment_demand', excerpts: [{ sourceId: 'linkedin', quote }] }, { kind: 'credential_request', excerpts: [{ sourceId: 'linkedin', quote: 'Invented request for your password.' }] }];
    const result = validateComparison(model, { ...input, description: description + ' ' + quote }, resolution);
    expect(result.cautionFlags).toHaveLength(1); expect(result.cautionFlags[0].kind).toBe('payment_demand');
    expect(resolution.score.careersVerification).toBe('verified_match');
  });
  it('rejects unsafe saved links and missing-description alignments', () => {
    const result = validateComparison(comparison(), { ...input, description: '' }, resolution);
    expect(result.finding).toBe('insufficient_evidence');
    expect(investigationSchema.safeParse({ ...result, sourceUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
  it('does not flag warnings against payment scams as payment demands', () => {
    const quote = 'We will never ask you to pay a fee to obtain this job.';
    const model = comparison(); model.cautionFlags = [{ kind: 'payment_demand', excerpts: [{ sourceId: 'linkedin', quote }] }];
    expect(validateComparison(model, { ...input, description: `${description} ${quote}` }, resolution).cautionFlags).toHaveLength(0);
  });
});
describe('provider boundaries', () => {
  it('uses a pinned model, non-stored responses, bounded mandatory search and actually returned URLs', async () => {
    enabled();
    const fetcher = vi.fn(async () => openaiResponse({ urls: ['https://acme.example/', 'https://invented.example/'] }, [{ type: 'web_search_call', action: { type: 'search', sources: [{ url: 'https://acme.example/' }] } }]));
    const meter = newMeter();
    expect(await discoverOfficialSources('Acme role', Date.now() + 1000, meter, fetcher)).toEqual(['https://acme.example/']);
    const body = JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ model: OPENAI_MODEL, store: false, tool_choice: 'required', max_tool_calls: 2 });
    expect(meter.costMicroUsd).toBe(openaiCost(1000, 100, 1));
  });
  it('retains uncertain costs on provider failures and does not retry', async () => {
    enabled(); const fetcher = vi.fn(async () => new Response('{}', { status: 429 })), meter = newMeter();
    await expect(comparePostings({}, Date.now() + 1000, meter, fetcher)).rejects.toThrow('provider unavailable');
    expect(meter.uncertain).toBe(true); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('accounts for incomplete paid responses before declining them', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ model: OPENAI_MODEL, status: 'incomplete', usage: { input_tokens: 1000, output_tokens: 2500 }, output: [] }), { status: 200 }));
    const meter = newMeter(); await expect(comparePostings({}, Date.now() + 1000, meter, fetcher)).rejects.toThrow('incomplete');
    expect(meter.costMicroUsd).toBeGreaterThan(0); expect(meter.uncertain).toBe(false);
  });
  it('batches independent Jev judgments and keeps free outputs out of cost', async () => {
    vi.stubEnv('TYPESAFE_API_KEY', 'test');
    const answer = { type: 'choice', choice: 'aligned', confidence: 0.9, probabilities: { aligned: 0.95, conflicting: 0.03, insufficient_evidence: 0.02 } };
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ model: 'jev-1.13.0', usage: { input_tokens: 10_000, output_tokens: 1000 }, answers: Object.fromEntries(['responsibilities', 'qualifications', 'seniority', 'material_consistency'].map(key => [key, answer])) }), { status: 200 }));
    const meter = newMeter(), result = await evaluateJev({ linkedin: { text: description }, candidate }, Date.now() + 1000, meter, fetcher);
    expect(result.model).toBe('jev-1.13.0'); expect(meter.costMicroUsd).toBe(jevCost(10_000)); expect(Object.keys(result.answers)).toHaveLength(4);
  });
});
describe('automatic investigation controls', () => {
  it('deduplicates attempt changes while invalidating corrected descriptions', () => {
    expect(investigationFingerprint({ ...input, scanAttemptId: 'new-attempt', scanMode: 'deep' })).toBe(investigationFingerprint(input));
    expect(investigationFingerprint({ ...input, description: `${description} Changed qualification.` })).not.toBe(investigationFingerprint(input));
  });
  it('requires explicit pilot membership even when native scoring rolls out publicly', () => {
    enabled(); vi.stubEnv('GHOSTJOB_V3_ROLLOUT', 'public');
    expect(investigationAccess('pilot')).toBe('available'); expect(investigationAccess('other')).toBe('not_eligible'); expect(investigationAccess(null)).toBe('sign_in_required');
    vi.stubEnv('OPENAI_API_KEY', ''); expect(investigationAccess('pilot')).toBe('disabled');
  });
  it('budget exhaustion and storage failure preserve native results without paid calls', async () => {
    enabled(); const fetcher = vi.fn(), resolver = vi.fn(async () => resolution), get = vi.fn(async () => null);
    const reserve = vi.fn(async () => ({ status: -1, attemptKey: 'a', monthKey: 'm', resultKey: 'r' }));
    const result = await investigateJob(input, 'pilot', Date.now() + 30_000, { resolver, get, reserve, fetcher });
    expect(result.investigation.status).toBe('budget_exhausted'); expect(result.resolution.score).toEqual(resolution.score); expect(fetcher).not.toHaveBeenCalled();
    reserve.mockRejectedValueOnce(new Error('offline'));
    expect((await investigateJob(input, 'pilot', Date.now() + 30_000, { resolver, get, reserve, fetcher })).investigation.status).toBe('disabled');
  });
  it('does not repeat provider calls on an already reserved attempt', async () => {
    enabled(); const fetcher = vi.fn();
    const result = await investigateJob(input, 'pilot', Date.now() + 30_000, { resolver: vi.fn(async () => resolution), get: vi.fn(async () => null), reserve: vi.fn(async () => ({ status: 0, attemptKey: 'a', monthKey: 'm', resultKey: 'r' })), fetcher });
    expect(result.investigation.status).toBe('in_progress'); expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps Jev private and preserves OpenAI findings when Jev fails', async () => {
    enabled(); vi.stubEnv('GHOSTJOB_JEV_EVALUATION_ENABLED', 'true'); vi.stubEnv('TYPESAFE_API_KEY', 'test');
    const fetcher = vi.fn(async (url: string | URL | Request) => String(url).includes('typesafe') ? new Response('{}', { status: 529 }) : openaiResponse(comparison()));
    const put = vi.fn(async () => undefined), settle = vi.fn(async () => undefined);
    const result = await investigateJob(input, 'pilot', Date.now() + 30_000, { resolver: vi.fn(async () => resolution), get: vi.fn(async () => null), reserve: vi.fn(async () => ({ status: 1, attemptKey: 'a', monthKey: 'm', resultKey: 'r' })), put, settle, fetcher });
    expect(result.investigation.finding).toBe('exact_match'); expect(JSON.stringify(result)).not.toContain('jev'); expect(settle).not.toHaveBeenCalled();
    expect(JSON.stringify(put.mock.calls)).not.toContain(description);
  });
  it('never includes provider/account secrets in the evidence state', () => {
    expect(JSON.stringify(evidenceState(input, [candidate]))).not.toContain('API_KEY');
  });
});
describe('candidate provenance', () => {
  it('collects a renamed role only after establishing employer and ATS relationship', async () => {
    const pages: Record<string, string> = {
      'https://acme.example/': '<script type="application/ld+json">{"@type":"Organization","name":"Acme","url":"https://acme.example/"}</script><a href="https://jobs.lever.co/acme">Careers</a>',
      'https://api.lever.co/v0/postings/acme?mode=json': JSON.stringify([{ text: 'Senior Payments Backend Engineer', id: 'REQ-100', hostedUrl: 'https://jobs.lever.co/acme/100', categories: { location: 'Remote US' }, descriptionPlain: description }]),
      'https://jobs.lever.co/acme/100': `<main><h1>Senior Payments Backend Engineer</h1><p>${description}</p></main>`,
    };
    const fetcher = vi.fn(async (url: string) => ({ url, status: pages[url] ? 200 : 404, body: pages[url] ?? '', checkedAt: candidate.checkedAt }));
    const result = await resolveEmployer({ ...input, employerUrl: 'https://acme.example/' }, { deadline: Date.now() + 5000, fetcher, collectCandidates: true });
    expect(result.candidates).toHaveLength(1); expect(result.candidates?.[0].identitySourceUrl).toBe('https://acme.example/'); expect(result.verification.outcome).not.toBe('matched');
    expect(result.candidates?.[0].requisitionId).toBeUndefined();
    const untrusted = await resolveEmployer({ ...input, applicationUrl: 'https://jobs.lever.co/acme/100' }, { deadline: Date.now() + 5000, fetcher, collectCandidates: true });
    expect(untrusted.candidates).toHaveLength(0);
  });
});
