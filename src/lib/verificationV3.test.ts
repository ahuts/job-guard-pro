// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateTrustScore } from './trustScore';
import { companyMatches, isFresh, locationsMatch, provider, providerPostings, resolveEmployer, titlesMatchV3 } from '../server/employerResolver';
import { isPublicAddress, publicUrl } from '../server/publicFetch';
import { scanSchema, v3Allowed } from '../server/scanV3';
import { getJobInsights } from './jobInsights';
import snapshots from './fixtures/public-provider-snapshots.json';

describe('v3 evidence scoring', () => {
  it('keeps v2 weights but makes reposts and long observations neutral in v3', () => {
    const input = { careersVerification: 'unverified' as const, reposted: true, repeatedWithoutVerification: true };
    expect(calculateTrustScore(input).trustScore).toBe(25);
    expect(calculateTrustScore({ ...input, scoringVersion: 3 }).trustScore).toBe(50);
  });
  it('awards 100 for all positives and suppresses live evidence on closure', () => {
    const input = { scoringVersion: 3 as const, careersVerification: 'verified_match' as const, exactRoleMatch: true, applicationActive: true, companyIdentityVerified: true, currentSourceEvidence: true, concreteRoleDetails: true };
    expect(calculateTrustScore(input).trustScore).toBe(100);
    const closed = calculateTrustScore({ ...input, careersVerification: 'closed_conflict' });
    expect(closed.trustScore).toBe(25);
    expect(closed.evidence.some(e => ['exact-role-match', 'application-active', 'current-source'].includes(e.id))).toBe(false);
  });
  it('does not extract AI from ordinary words or Java from JavaScript', () => {
    expect(getJobInsights({ description: 'Maintain customer relationships using JavaScript.' }).find(i => i.id === 'skills')?.detail).toBe('JavaScript');
  });
});
describe('strict matching and source validation', () => {
  it('preserves specialization, seniority and employer identity', () => {
    expect(titlesMatchV3('Manager (Growth)', 'Manager (Finance)')).toBe(false);
    expect(titlesMatchV3('Engineer', 'Senior Engineer')).toBe(false);
    expect(companyMatches('Acme Inc.', 'Acme')).toBe(true);
    expect(companyMatches('Acme', 'Acme Staffing')).toBe(false);
  });
  it('requires locations and country-compatible remote eligibility', () => {
    expect(locationsMatch('', ['Austin, TX'])).toBe(false);
    expect(locationsMatch('Remote', ['Remote US'])).toBe(false);
    expect(locationsMatch('Remote UK', ['Remote US'])).toBe(false);
    expect(locationsMatch('Remote, United States', ['Remote US'])).toBe(true);
  });
  it('requires real nonfuture source dates', () => {
    const now = Date.now();
    expect(isFresh(new Date(now + 1000).toISOString(), now)).toBe(false);
    expect(isFresh(new Date(now - 86400000).toISOString(), now)).toBe(true);
    expect(isFresh('')).toBe(false);
  });
  it.each(['127.0.0.1', '10.0.0.1', '100.64.0.1', '169.254.169.254', '192.168.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1', '2002:7f00:1::'])('blocks private/reserved address %s', address => expect(isPublicAddress(address)).toBe(false));
  it.each(['http://example.com', 'https://user:pass@example.com', 'https://example.com:8443', 'https://127.0.0.1'])('rejects unsafe URL %s', url => expect(() => publicUrl(url)).toThrow());
  it('matches provider host boundaries and known embed/EU formats', () => {
    expect(provider('https://greenhouse.io.attacker.example/acme')).toBeNull();
    expect(provider('https://boards.greenhouse.io/embed/job_board?for=acme')?.board).toBe('acme');
    expect(provider('https://jobs.eu.lever.co/acme')?.endpoint).toContain('api.eu.lever.co');
  });
  it('fails neutral on incomplete provider pagination', () => {
    expect(() => providerPostings('greenhouse', { jobs: [], meta: { total: 50 } })).toThrow('additional pages');
  });
});

describe('employer verification fixtures', () => {
  it('parses dated provider projections without mixing identical titles in different regions', () => {
    const greenhouse = providerPostings('greenhouse', snapshots.greenhouse);
    expect(greenhouse[0].id).toBe('1451');
    expect(greenhouse[0].title).toBe('Account Executive, Enterprise');
    const lever = providerPostings('lever', snapshots.lever.jobs);
    expect(lever[0].title).toBe('AI Operations Manager');
    expect(lever[0].applyUrl).toBe(snapshots.lever.jobs[0].applyUrl);
    const ashby = providerPostings('ashby', snapshots.ashby);
    expect(ashby).toHaveLength(2);
    expect(locationsMatch('Remote Europe', ashby[0].locations)).toBe(true);
    expect(locationsMatch('Remote Europe', ashby[1].locations)).toBe(false);
  });
  const home = 'https://acme.example/';
  const board = 'https://jobs.lever.co/acme';
  const job = board + '/abc';
  const input = { company: 'Acme', title: 'Engineer', location: 'Austin, TX', employerUrl: home };
  const homepage = `<script type="application/ld+json">{"@type":"Organization","name":"Acme","url":"${home}"}</script><a href="${board}">Careers</a>`;
  function fixture(options: { title?: string; form?: boolean; two?: boolean; closed?: boolean } = {}) {
    const entries = [{ text: options.title || 'Engineer', categories: { location: 'Austin, TX' }, hostedUrl: job, applyUrl: job + '/apply', id: 'abc', createdAt: Date.now() - 86400000 }];
    if (options.two) entries.push({ ...entries[0], id: 'def', hostedUrl: board + '/def' });
    const pages: Record<string, string> = {
      [home]: homepage,
      ['https://api.lever.co/v0/postings/acme?mode=json']: JSON.stringify(entries),
      [job]: options.closed ? '<h1>Engineer</h1>This job is closed' : '<h1>Engineer</h1>',
      [job + '/apply']: options.form ? '<form><label>First name</label>Upload resume<button>Submit application</button></form>' : '<h1>Welcome</h1>',
    };
    return vi.fn(async (url: string) => ({ url, body: pages[url] ?? '', status: pages[url] === undefined ? 404 : 200, checkedAt: '2026-09-15T12:00:00Z' }));
  }
  it('requires an independently usable application page', async () => {
    const result = await resolveEmployer(input, { fetcher: fixture(), deadline: Date.now() + 10000 });
    expect(result.score.exactRoleMatch).toBe(true);
    expect(result.score.applicationActive).toBe(false);
    const active = await resolveEmployer(input, { fetcher: fixture({ form: true }), deadline: Date.now() + 10000 });
    expect(active.score.applicationActive).toBe(true);
  });
  it('does not reuse one board match for another job or verify ambiguous roles', async () => {
    const result = await resolveEmployer({ ...input, title: 'Designer' }, { fetcher: fixture(), deadline: Date.now() + 10000 });
    expect(result.score.careersVerification).toBe('active_board_no_match');
    const ambiguous = await resolveEmployer(input, { fetcher: fixture({ two: true }), deadline: Date.now() + 10000 });
    expect(ambiguous.score.exactRoleMatch).not.toBe(true);
  });
  it('requires identity linkage even when a third-party board has the exact title', async () => {
    const result = await resolveEmployer({ ...input, employerUrl: undefined, applicationUrl: job }, { fetcher: fixture(), deadline: Date.now() + 10000 });
    expect(result.score.exactRoleMatch).not.toBe(true);
  });
  it('can revisit a board after discovering its employer relationship', async () => {
    const result = await resolveEmployer({ ...input, employerUrl: undefined, applicationUrl: board }, { fetcher: fixture(), search: async () => [home], deadline: Date.now() + 10000 });
    expect(result.score.exactRoleMatch).toBe(true);
  });
  it('requires exact requisition identity for visible closure on a provider page', async () => {
    const result = await resolveEmployer({ ...input, requisitionId: 'abc' }, { fetcher: fixture({ closed: true }), deadline: Date.now() + 10000 });
    expect(result.score.careersVerification).toBe('closed_conflict');
  });
});

describe('release controls and request bounds', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('defaults missing client versions to the legacy route and rejects malformed fields', () => {
    expect(scanSchema.parse({ title: 'Engineer', company: 'Acme' }).scoringVersion).toBeUndefined();
    expect(scanSchema.safeParse({ title: 42, company: 'Acme' }).success).toBe(false);
    expect(scanSchema.safeParse({ title: 'Engineer', company: 'Acme', description: 'x'.repeat(12001) }).success).toBe(false);
  });
  it('requires schema readiness and an authenticated pilot account', () => {
    vi.stubEnv('GHOSTJOB_V3_ENABLED', 'true'); vi.stubEnv('GHOSTJOB_V3_SCHEMA_READY', 'false'); vi.stubEnv('GHOSTJOB_V3_PILOT_USERS', 'pilot'); vi.stubEnv('GHOSTJOB_V3_ROLLOUT', 'pilot');
    expect(v3Allowed('pilot')).toBe(false);
    vi.stubEnv('GHOSTJOB_V3_SCHEMA_READY', 'true');
    expect(v3Allowed('pilot')).toBe(true);
    expect(v3Allowed(null)).toBe(false);
    expect(v3Allowed('someone-else')).toBe(false);
  });
});
