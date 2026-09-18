import type { SourceCheck, VerificationDetails } from '../lib/verification';
import type { TrustScoreInput } from '../lib/trustScore';
import { publicFetch, publicUrl, type PublicPage } from './publicFetch.js';
import { cacheGet, cachePut, hash } from './searchStore.js';

export interface ResolverInput {
  title: string; company: string; location?: string; url?: string;
  companyLinkedInUrl?: string | null; employerUrl?: string | null;
  applicationUrl?: string | null; requisitionId?: string | null;
}
export interface Resolution { score: TrustScoreInput; verification: VerificationDetails }
export interface Posting {
  title: string; company?: string; locations: string[]; url: string;
  applyUrl?: string; date?: string; id?: string; closed?: boolean;
}
export const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const companyKey = (s: string) => normalize(s).replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation)\b/g, '').trim();
export const companyMatches = (a: string, b: string) => Boolean(companyKey(a) && companyKey(a) === companyKey(b));
export const titlesMatchV3 = (a: string, b: string) => Boolean(normalize(a) && normalize(a) === normalize(b));
const locationKey = (s: string) => normalize(s).replace(/\bunited states(?: of america)?\b|\busa\b/g, 'us').replace(/\bunited kingdom\b/g, 'uk');
export function locationsMatch(a: string, locations: string[]): boolean {
  const left = locationKey(a);
  if (!left) return false;
  return locations.some(raw => {
    const right = locationKey(raw);
    if (!right) return false;
    // Generic remote is not evidence of matching country eligibility.
    if (left === 'remote' || right === 'remote') return false;
    if (left === right) return true;
    const withoutMode = (s: string) => s.replace(/\b(remote|hybrid|on site|onsite)\b/g, '').trim();
    const x = withoutMode(left), y = withoutMode(right);
    if (/\bremote\b/.test(left) !== /\bremote\b/.test(right)) return false;
    return Boolean(x && y && x === y);
  });
}
export const isFresh = (date?: string, now = Date.now()) => {
  const value = Date.parse(date ?? '');
  return Number.isFinite(value) && value <= now && now - value <= 30 * 86400000;
};
export const text = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
export function schemas(html: string): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  function visit(value: any, depth = 0) {
    if (!value || depth > 8) return;
    if (Array.isArray(value)) { value.forEach(v => visit(v, depth + 1)); return; }
    if (typeof value !== 'object') return;
    if (value['@type']) out.push(value);
    if (value['@graph']) visit(value['@graph'], depth + 1);
    if (value.hiringOrganization) visit(value.hiringOrganization, depth + 1);
    if (value.mainEntity) visit(value.mainEntity, depth + 1);
  }
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(match[1])); } catch { /* malformed structured data is neutral */ }
  }
  return out;
}
const isType = (value: Record<string, any>, type: string) => [value['@type']].flat().includes(type);
export function links(html: string, base: string): Array<{ url: string; label: string }> {
  const found: Array<{ url: string; label: string }> = [];
  for (const match of html.matchAll(/<(a|iframe)\b[^>]*?(?:href|src)\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)(?:<\/a>|<\/iframe>)/gi)) {
    try { found.push({ url: publicUrl(new URL(match[2].replace(/&amp;/g, '&'), base).href).href, label: text(match[3]).slice(0, 160) }); } catch { /* ignore non-public links */ }
    if (found.length >= 500) break;
  }
  return found;
}
export function provider(raw: string): { kind: string; board: string; endpoint: string } | null {
  const u = new URL(raw), parts = u.pathname.split('/').filter(Boolean);
  if (['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(u.hostname)) {
    const board = parts[0] === 'embed' ? u.searchParams.get('for') : parts[0];
    if (board) return { kind: 'greenhouse', board, endpoint: `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true` };
  }
  if (['jobs.lever.co', 'jobs.eu.lever.co'].includes(u.hostname) && parts[0]) return { kind: 'lever', board: parts[0], endpoint: `https://api${u.hostname.includes('.eu.') ? '.eu' : ''}.lever.co/v0/postings/${encodeURIComponent(parts[0])}?mode=json` };
  if (u.hostname === 'jobs.ashbyhq.com' && parts[0]) return { kind: 'ashby', board: parts[0], endpoint: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(parts[0])}` };
  return null;
}
export function providerPostings(kind: string, data: any): Posting[] {
  const rows = kind === 'lever' ? data : data.jobs;
  if (!Array.isArray(rows)) throw new Error('Incomplete provider response');
  if (data.next || data.nextPage || data.hasMore || (typeof data.meta?.total === 'number' && data.meta.total > rows.length)) throw new Error('Provider response requires additional pages');
  return rows.map((j: any) => kind === 'greenhouse' ? {
    title: j.title ?? '', locations: (j.location?.name ?? '').split(/\s*[•;]\s*/), url: j.absolute_url ?? '', date: j.updated_at, id: String(j.requisition_id ?? j.id ?? ''),
  } : kind === 'lever' ? {
    title: j.text ?? '', locations: j.categories?.allLocations ?? [j.categories?.location ?? ''], url: j.hostedUrl ?? '', applyUrl: j.applyUrl,
    date: typeof j.createdAt === 'number' && Number.isFinite(j.createdAt) ? new Date(j.createdAt).toISOString() : undefined, id: j.id,
  } : {
    title: j.title ?? '', locations: [j.location ?? '', ...(j.secondaryLocations ?? []).map((l: any) => l.location ?? '')].map(l => j.isRemote && !/remote/i.test(l) ? `Remote ${l}` : l),
    url: j.jobUrl ?? '', applyUrl: j.applyUrl, date: j.publishedAt, id: j.id,
  }).filter((j: Posting) => j.title && j.url);
}
export function structuredPostings(html: string, base: string): Posting[] {
  const jobSchemas = schemas(html).filter(s => isType(s, 'JobPosting'));
  return jobSchemas.map(s => {
    const locations = [s.jobLocation ?? []].flat().map((l: any) => typeof l === 'string' ? l : [l.address?.addressLocality, l.address?.addressRegion, typeof l.address?.addressCountry === 'object' ? l.address.addressCountry.name : l.address?.addressCountry].filter(Boolean).join(', '));
    if (s.jobLocationType === 'TELECOMMUTE') {
      locations.length = 0;
      for (const country of [s.applicantLocationRequirements ?? []].flat()) locations.push(`Remote ${country.name ?? ''}`);
    }
    return { title: s.title ?? '', company: s.hiringOrganization?.name, locations, url: base,
      date: s.datePosted, id: typeof s.identifier === 'string' ? s.identifier : s.identifier?.value,
      // Expiry metadata alone may be stale; explicit visible closure is required.
      closed: jobSchemas.length === 1 && explicitlyClosed(html, s.title ?? ''),
    };
  });
}
function explicitlyClosed(html: string, title: string): boolean {
  const main = html.match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i)?.[1] ?? html;
  const heading = main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!heading || !titlesMatchV3(text(heading[1]), title)) return false;
  const following = text(main.slice((heading.index ?? 0) + heading[0].length)).slice(0, 1200);
  return /(?:this (?:job|position|role) (?:is |has been )?(?:closed|filled|no longer available)|job is no longer available|position has been filled)/i.test(following);
}
function identity(page: PublicPage, input: ResolverInput): boolean {
  const entries = schemas(page.body);
  // A JobPosting on an aggregator does not establish website ownership.
  return entries.some(s => isType(s, 'Organization') && companyMatches(s.name ?? '', input.company) &&
    [s.url, s['@id']].some(raw => { try { return new URL(raw).hostname === new URL(page.url).hostname; } catch { return false; } })) ||
    Boolean(input.companyLinkedInUrl && links(page.body, page.url).some(l => {
      try { const a = new URL(l.url), b = new URL(input.companyLinkedInUrl!); return /(^|\.)linkedin\.com$/.test(a.hostname) && a.pathname.replace(/\/$/, '') === b.pathname.replace(/\/$/, ''); } catch { return false; }
    }));
}
export async function resolveEmployer(input: ResolverInput, options: {
  deadline: number; search?: (query: string) => Promise<string[]>;
  fetcher?: typeof publicFetch;
}): Promise<Resolution> {
  const fetcher = options.fetcher ?? publicFetch;
  const checks: SourceCheck[] = [];
  const requestPages = new Map<string, PublicPage>();
  const visited = new Set<string>();
  const queue: Array<{ url: string; trusted: boolean; board?: boolean }> = [];
  let ownerHost = '', boardFound = false, unavailable = false;
  const checkedAt = new Date().toISOString();
  const result: Resolution = { score: { careersVerification: 'unverified' }, verification: { outcome: 'identity_unresolved', reason: 'Could not establish the employer website from available sources.', checkedAt, sources: checks } };
  async function load(raw: string): Promise<PublicPage> {
    if (requestPages.has(raw)) return { ...requestPages.get(raw)!, cached: true };
    const key = `gj:source:${hash(raw)}`;
    const cached = options.fetcher ? null : await cacheGet<PublicPage>(key);
    if (cached) { requestPages.set(raw, cached); return { ...cached, cached: true }; }
    const page = await fetcher(raw, options.deadline);
    requestPages.set(raw, page);
    if (!options.fetcher) await cachePut(key, page, page.status >= 200 && page.status < 300 ? 900 : 120).catch(() => {});
    return page;
  }
  function enqueue(url: string, trusted = false, board = false) {
    try {
      const normalized = publicUrl(url).href;
    if (!visited.has(normalized + ':' + trusted) && !queue.some(q => q.url === normalized && q.trusted === trusted)) queue.push({ url: normalized, trusted, board });
    } catch { /* supplied URLs are candidates, never trust assertions */ }
  }
  for (const url of [input.employerUrl, input.applicationUrl]) if (url) enqueue(url);
  const discoveryKey = `gj:employer:${hash([companyKey(input.company), input.companyLinkedInUrl ?? ''])}`;
  const discovered = options.fetcher ? null : await cacheGet<string>(discoveryKey);
  if (discovered) enqueue(discovered);
  let searchCalls = 0;
  async function search() {
    if (!options.search || searchCalls >= 2 || Date.now() >= options.deadline) return;
    const query = searchCalls++ === 0
      ? `"${input.company}" official careers ${input.companyLinkedInUrl ?? ''}`
      : `"${input.title}" "${input.company}" ${input.requisitionId ?? ''} ${input.location ?? ''} ${ownerHost ? `site:${ownerHost}` : 'careers'}`;
    for (const url of (await options.search(query)).slice(0, 5)) enqueue(url);
  }
  while (checks.length < 16 && Date.now() < options.deadline) {
    if (!queue.length) {
      await search();
      if (!queue.length) { if (options.search && searchCalls < 2 && Date.now() < options.deadline) continue; break; }
    }
    const candidate = queue.shift()!;
    const visitKey = candidate.url + ':' + candidate.trusted;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);
    try {
      const p = provider(candidate.url);
      const page = await load(p ? p.endpoint : candidate.url);
      const check: SourceCheck = { url: candidate.url, checkedAt: page.checkedAt, cached: page.cached, status: 'checked', reason: 'Source fetched; identity or role remains unresolved.' };
      checks.push(check);
      if (page.status < 200 || page.status >= 300) { unavailable = true; check.status = 'unavailable'; check.reason = `Source returned HTTP ${page.status}; no deduction.`; continue; }
      // A trusted page link can establish an ATS board relationship. Cross-domain
      // redirects on ordinary pages must establish their own identity.
      let trusted = candidate.trusted && (Boolean(p) || new URL(page.url).hostname === new URL(candidate.url).hostname);
      if (!p && identity(page, input)) {
        trusted = true; ownerHost = new URL(page.url).hostname;
        check.reason = 'Employer identity confirmed from public source information.';
        result.score.companyIdentityVerified = true;
        if (!options.fetcher) await cachePut(discoveryKey, page.url, 86400).catch(() => {});
      }
      let postings = p ? providerPostings(p.kind, JSON.parse(page.body)) : structuredPostings(page.body, page.url);
      const foundLinks = p ? [] : links(page.body, page.url);
      if (!p) {
        const homepage = new URL('/', page.url).href;
        if (!trusted && homepage !== page.url) enqueue(homepage);
        for (const link of foundLinks.filter(l => /careers?|jobs?|join us|open positions|apply/i.test(l.label + ' ' + new URL(l.url).pathname) || provider(l.url)).slice(0, 10)) {
          const sameHost = new URL(link.url).hostname === new URL(page.url).hostname;
          const linkedEmployerSubdomain = new URL(link.url).hostname.endsWith('.' + new URL(page.url).hostname.replace(/^www\./, ''));
          enqueue(link.url, trusted && (sameHost || linkedEmployerSubdomain || Boolean(provider(link.url))), true);
        }
        if (trusted && !candidate.board) {
          for (const path of ['/careers', '/jobs', '/join-us']) enqueue(new URL(path, page.url).href, true, true);
          const domain = new URL(page.url).hostname.replace(/^www\./, '');
          for (const prefix of ['careers.', 'jobs.']) enqueue(`https://${prefix}${domain}`, false, true);
        }
        // A direct job page without JSON-LD must have an exact heading and
        // explicit requisition/location evidence before it can be considered.
        if (!postings.length && trusted && input.requisitionId && text(page.body).includes(input.requisitionId)) {
          const heading = text(page.body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
          const location = input.location && text(page.body).includes(input.location) ? input.location : '';
          postings = [{ title: heading, locations: [location], url: page.url, id: input.requisitionId,
            closed: explicitlyClosed(page.body, input.title) }];
        }
      }
      if (trusted && (p || candidate.board)) { boardFound = true; result.verification.sourceUrl = candidate.url; }
      if (!trusted) continue;
      const matches = postings.filter(j => (!j.company || companyMatches(j.company, input.company)) && titlesMatchV3(j.title, input.title) && locationsMatch(input.location ?? '', j.locations) && (!input.requisitionId || !j.id || String(j.id) === input.requisitionId));
      if (matches.length !== 1) {
        if (postings.some(j => titlesMatchV3(j.title, input.title))) { check.status = 'possible_match'; check.reason = 'Title found, but location, requisition, or uniqueness was not confirmed.'; }
        continue;
      }
      const match = matches[0];
      // Verify role URLs from provider feeds before exposing them to a client.
      const rolePage = match.url === page.url ? page : await load(publicUrl(match.url).href);
      const exactClosed = match.closed || (Boolean(input.requisitionId && match.id === input.requisitionId) && explicitlyClosed(rolePage.body, input.title));
      if (exactClosed) {
        check.url = rolePage.url; check.checkedAt = rolePage.checkedAt; check.cached = rolePage.cached; check.reason = 'The identified employer role explicitly reports it is closed.';
        result.score = { careersVerification: 'closed_conflict', companyIdentityVerified: true, sourceUrl: rolePage.url };
        result.verification = { ...result.verification, outcome: 'closed', reason: 'The identified employer role explicitly reports it is closed.', sourceUrl: rolePage.url, checkedAt: rolePage.checkedAt };
        return result;
      }
      if (rolePage.status < 200 || rolePage.status >= 300 || new URL(rolePage.url).pathname.replace(/\/$/, '') !== new URL(match.url).pathname.replace(/\/$/, '')) { check.reason = 'Role destination unavailable or redirected; no verification awarded.'; unavailable = true; continue; }
      let applicationActive = false;
      const apply = match.applyUrl || links(rolePage.body, rolePage.url).find(l => /^apply(?: now| for this (?:job|position))?$/i.test(l.label))?.url;
      if (apply) {
        const target = publicUrl(new URL(apply, rolePage.url).href);
        const targetProvider = provider(target.href), roleProvider = provider(rolePage.url);
        if (target.hostname === new URL(rolePage.url).hostname && (!roleProvider || (targetProvider?.kind === roleProvider.kind && targetProvider?.board === roleProvider.board))) {
          const application = await load(target.href);
          applicationActive = application.status >= 200 && application.status < 300 && new URL(application.url).pathname === target.pathname && /<form\b/i.test(application.body) && /submit application|upload resume|upload cv/i.test(application.body) && !/position has been filled|job is no longer available/i.test(text(application.body));
        }
      } else applicationActive = /<form\b/i.test(rolePage.body) && /submit application|upload resume|upload cv/i.test(rolePage.body);
      check.status = 'matched'; check.reason = 'Employer relationship, exact title, and location matched.';
      check.url = rolePage.url; check.checkedAt = rolePage.checkedAt; check.cached = rolePage.cached;
      result.score = { careersVerification: 'verified_match', exactRoleMatch: true, companyIdentityVerified: true, applicationActive, currentSourceEvidence: isFresh(match.date), sourceUrl: rolePage.url };
      result.verification = { ...result.verification, outcome: 'matched', reason: check.reason, sourceUrl: rolePage.url, checkedAt: rolePage.checkedAt };
      return result;
    } catch (error) {
      unavailable = true;
      checks.push({ url: candidate.url, checkedAt: new Date().toISOString(), status: 'unavailable', reason: error instanceof Error ? error.message.slice(0, 160) : 'Source unavailable' });
    }
  }
  result.score.careersVerification = boardFound ? 'active_board_no_match' : 'unverified';
  result.verification.outcome = boardFound ? 'board_no_match' : unavailable ? 'source_unavailable' : 'identity_unresolved';
  result.verification.reason = boardFound ? 'Available employer sources did not establish a unique matching role. Missing evidence is neutral.' : unavailable ? 'A source was inaccessible or the check reached its limit. Missing evidence is neutral.' : 'Could not establish the employer website from available sources.';
  result.verification.sources = checks.slice(0, 16);
  return result;
}
