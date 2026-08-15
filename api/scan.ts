import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  calculateTrustScore,
  getQualityBadges,
  hasConcreteRoleDetails,
  type CareersVerification,
  type TrustScoreResult,
} from "../src/lib/trustScore";

// Structural request/response types keep this handler independently testable;
// Vercel supplies compatible objects at runtime.
interface VercelRequest {
  method?: string;
  body: unknown;
}
interface VercelResponse<T> {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse<T>;
  json(value: T): VercelResponse<T>;
  end(): VercelResponse<T>;
}

interface ScanRequest {
  url?: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  salary?: string | null;
  applicationUrl?: string | null;
  companyLinkedInUrl?: string | null;
  reposted?: boolean;
  firstObservedAt?: string | null;
}

interface CareerCheck {
  verification: CareersVerification;
  exactRoleMatch: boolean;
  applicationActive: boolean;
  companyIdentityVerified: boolean;
  currentSourceEvidence: boolean;
  sourceUrl?: string;
}

const cache = new Map<string, { expiresAt: number; value: CareerCheck }>();
const CACHE_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4_000;
const MAX_RESPONSE_BYTES = 1_000_000;

function normalise(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function locationsCompatible(left?: string | null, right?: string | null): boolean {
  const a = normalise(left);
  const b = normalise(right);
  if (!a || !b) return true;
  if (a.includes("remote") && b.includes("remote")) return true;
  return a === b || a.includes(b) || b.includes(a);
}

function titlesMatch(left?: string | null, right?: string | null): boolean {
  const a = normalise(left);
  const b = normalise(right);
  return Boolean(a && b && a === b);
}

function isPrivateAddress(address: string): boolean {
  if (address === "::1" || address === "0.0.0.0") return true;
  if (address.includes(":")) {
    const lower = address.toLowerCase();
    if (lower.startsWith("::ffff:") && lower.slice(7).includes(".")) return isPrivateAddress(lower.slice(7));
    if (lower.startsWith("::ffff")) {
      const groups = lower.split(":").filter(Boolean);
      const high = Number.parseInt(groups.at(-2) ?? "", 16);
      const low = Number.parseInt(groups.at(-1) ?? "", 16);
      if (Number.isFinite(high) && Number.isFinite(low)) {
        return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
      }
    }
    return lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower.startsWith("::") || lower === "::";
  }
  const [first, second] = address.split(".").map(Number);
  return first === 10 || first === 127 || first === 0 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168;
}

async function assertPublicHttps(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Only public HTTPS application sources are supported");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname) && isPrivateAddress(hostname)) throw new Error("Private network sources are not allowed");
  if (!isIP(hostname)) {
    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error("Private network sources are not allowed");
  }
  return url;
}

async function fetchPublic(rawUrl: string): Promise<{ response: Response; body: string; url: string }> {
  let url = await assertPublicHttps(rawUrl);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "GhostJob/2.0 public-job-verifier", Accept: "application/json,text/html;q=0.9,*/*;q=0.1" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) break;
      url = await assertPublicHttps(new URL(location, url).toString());
      continue;
    }
    const body = (await response.text()).slice(0, MAX_RESPONSE_BYTES);
    return { response, body, url: url.toString() };
  }
  throw new Error("Too many redirects while checking the public application source");
}

function sourceLooksLikeCompany(company: string, sourceUrl: string): boolean {
  const companyWords = normalise(company).split(" ").filter((word) => word.length >= 3);
  const source = normalise(sourceUrl);
  return companyWords.some((word) => source.includes(word));
}

function companyIdentityMatches(request: ScanRequest, sourceUrl: string): boolean {
  if (!request.companyLinkedInUrl) return false;
  try {
    const linkedIn = new URL(request.companyLinkedInUrl);
    if (!/(^|\.)linkedin\.com$/.test(linkedIn.hostname)) return false;
    const linkedInSlug = normalise(linkedIn.pathname.split("/").filter(Boolean).pop());
    return Boolean(linkedInSlug) && (sourceLooksLikeCompany(linkedInSlug, sourceUrl) || sourceLooksLikeCompany(request.company, sourceUrl));
  } catch {
    return false;
  }
}

function freshDate(value?: string | null): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= 30 * 24 * 60 * 60 * 1000;
}

async function checkGreenhouse(url: URL, request: ScanRequest): Promise<CareerCheck | null> {
  if (!/(^|\.)greenhouse\.io$/.test(url.hostname)) return null;
  const token = url.pathname.split("/").filter(Boolean)[0];
  if (!token) return null;
  const { response, body } = await fetchPublic(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`);
  if (!response.ok) return null;
  const data = JSON.parse(body) as { jobs?: Array<{ title?: string; location?: { name?: string }; absolute_url?: string; updated_at?: string }> };
  const match = (data.jobs ?? []).find((job) => titlesMatch(job.title, request.title) && locationsCompatible(job.location?.name, request.location));
  return {
    verification: match ? "verified_match" : "active_board_no_match",
    exactRoleMatch: Boolean(match),
    applicationActive: Boolean(match),
    companyIdentityVerified: companyIdentityMatches(request, match?.absolute_url ?? url.toString()) || companyIdentityMatches(request, token),
    currentSourceEvidence: freshDate(match?.updated_at),
    sourceUrl: match?.absolute_url ?? url.toString(),
  };
}

async function checkLever(url: URL, request: ScanRequest): Promise<CareerCheck | null> {
  if (!/(^|\.)lever\.co$/.test(url.hostname)) return null;
  const site = url.pathname.split("/").filter(Boolean)[0];
  if (!site) return null;
  const { response, body } = await fetchPublic(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`);
  if (!response.ok) return null;
  const jobs = JSON.parse(body) as Array<{ text?: string; categories?: { location?: string }; hostedUrl?: string; createdAt?: number }>;
  const match = jobs.find((job) => titlesMatch(job.text, request.title) && locationsCompatible(job.categories?.location, request.location));
  return {
    verification: match ? "verified_match" : "active_board_no_match",
    exactRoleMatch: Boolean(match),
    applicationActive: Boolean(match),
    companyIdentityVerified: companyIdentityMatches(request, match?.hostedUrl ?? url.toString()) || companyIdentityMatches(request, site),
    currentSourceEvidence: Boolean(match?.createdAt && Date.now() - match.createdAt <= 30 * 24 * 60 * 60 * 1000),
    sourceUrl: match?.hostedUrl ?? url.toString(),
  };
}

async function checkAshby(url: URL, request: ScanRequest): Promise<CareerCheck | null> {
  if (!/(^|\.)ashbyhq\.com$/.test(url.hostname)) return null;
  const board = url.pathname.split("/").filter(Boolean)[0];
  if (!board) return null;
  const { response, body } = await fetchPublic(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`);
  if (!response.ok) return null;
  const data = JSON.parse(body) as { jobs?: Array<{ title?: string; location?: string; jobUrl?: string; publishedAt?: string }> };
  const match = (data.jobs ?? []).find((job) => titlesMatch(job.title, request.title) && locationsCompatible(job.location, request.location));
  return {
    verification: match ? "verified_match" : "active_board_no_match",
    exactRoleMatch: Boolean(match),
    applicationActive: Boolean(match),
    companyIdentityVerified: companyIdentityMatches(request, match?.jobUrl ?? url.toString()) || companyIdentityMatches(request, board),
    currentSourceEvidence: freshDate(match?.publishedAt),
    sourceUrl: match?.jobUrl ?? url.toString(),
  };
}

function extractJobPosting(body: string): Array<Record<string, unknown>> {
  const scripts = [...body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return scripts.flatMap((match) => {
    try {
      const parsed = JSON.parse(match[1]);
      const values = Array.isArray(parsed) ? parsed : parsed?.["@graph"] ?? [parsed];
      return values.filter((item: Record<string, unknown>) => item?.["@type"] === "JobPosting");
    } catch {
      return [];
    }
  });
}

async function checkEmployerPage(url: URL, request: ScanRequest): Promise<CareerCheck> {
  const { response, body, url: finalUrl } = await fetchPublic(url.toString());
  const explicitlyClosed = response.status === 410 || /job (is )?(no longer available|closed|has been filled)|position has been filled/i.test(body);
  if (explicitlyClosed) return { verification: "closed_conflict", exactRoleMatch: false, applicationActive: false, companyIdentityVerified: false, currentSourceEvidence: false, sourceUrl: finalUrl };
  const postings = extractJobPosting(body);
  const match = postings.find((posting) => {
    const title = typeof posting.title === "string" ? posting.title : "";
    const location = typeof posting.jobLocation === "string" ? posting.jobLocation : JSON.stringify(posting.jobLocation ?? "");
    return titlesMatch(title, request.title) && locationsCompatible(location, request.location);
  });
  return {
    verification: match ? "verified_match" : "unverified",
    exactRoleMatch: Boolean(match),
    applicationActive: Boolean(match && response.ok),
    companyIdentityVerified: companyIdentityMatches(request, finalUrl),
    currentSourceEvidence: Boolean(match && response.ok),
    sourceUrl: finalUrl,
  };
}

async function verifyCareers(request: ScanRequest): Promise<CareerCheck> {
  if (!request.applicationUrl) return { verification: "unverified", exactRoleMatch: false, applicationActive: false, companyIdentityVerified: false, currentSourceEvidence: false };
  const cached = cache.get(request.applicationUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const sourceUrl = await assertPublicHttps(request.applicationUrl);
    const check = await checkGreenhouse(sourceUrl, request) ?? await checkLever(sourceUrl, request) ?? await checkAshby(sourceUrl, request) ?? await checkEmployerPage(sourceUrl, request);
    cache.set(request.applicationUrl, { expiresAt: Date.now() + CACHE_MS, value: check });
    return check;
  } catch {
    return { verification: "unverified", exactRoleMatch: false, applicationActive: false, companyIdentityVerified: false, currentSourceEvidence: false };
  }
}

function isRepeatedWithoutVerification(firstObservedAt: string | null | undefined, verification: CareersVerification): boolean {
  if (!firstObservedAt || verification === "verified_match") return false;
  const first = Date.parse(firstObservedAt);
  return Number.isFinite(first) && Date.now() - first >= 45 * 24 * 60 * 60 * 1000;
}

export default async function handler(req: VercelRequest, res: VercelResponse<TrustScoreResult | { error: string }>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const request = req.body as ScanRequest;
  if (!request?.title?.trim() || !request?.company?.trim()) return res.status(400).json({ error: "Job title and company are required" });

  const career = await verifyCareers(request);
  const result = calculateTrustScore({
    careersVerification: career.verification,
    exactRoleMatch: career.exactRoleMatch,
    applicationActive: career.applicationActive,
    companyIdentityVerified: career.companyIdentityVerified,
    currentSourceEvidence: career.currentSourceEvidence,
    concreteRoleDetails: hasConcreteRoleDetails(request.description ?? ""),
    reposted: Boolean(request.reposted),
    repeatedWithoutVerification: isRepeatedWithoutVerification(request.firstObservedAt, career.verification),
    sourceUrl: career.sourceUrl,
    qualityBadges: getQualityBadges(request.description ?? "", request.salary),
  });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(result);
}

// Pure helpers exposed only for fixture coverage; production callers use the
// handler above. Network provider calls remain private to this module.
export const __testables = { titlesMatch, locationsCompatible, isPrivateAddress, assertPublicHttps };
