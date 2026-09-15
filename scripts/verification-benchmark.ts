/** Read-only live checks. Input expectations must be independently reviewed. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolveEmployer, type ResolverInput } from '../src/server/employerResolver';
import { publicFetch } from '../src/server/publicFetch';
import { calculateTrustScore } from '../src/lib/trustScore';

interface Case { id: string; input: ResolverInput; reviewer: string; reviewedAt: string; evidenceUrl: string; expected: 'matched' | 'closed' | 'unverified' }
const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) throw new Error('Usage: npx tsx scripts/verification-benchmark.ts reviewed-cases.json report.json');
const cases = JSON.parse(readFileSync(inputPath, 'utf8')) as Case[];
if (!Array.isArray(cases) || cases.length < 50 || cases.some(c => !c.reviewer || !c.reviewedAt || !c.evidenceUrl || !c.input?.title || !c.input?.company || !['matched', 'closed', 'unverified'].includes(c.expected))) throw new Error('At least 50 independently reviewed cases with dated evidence are required. Synthetic fixtures do not satisfy this gate.');
// Cache only public HTTP source responses during this read-only benchmark.
const pages = new Map<string, Awaited<ReturnType<typeof publicFetch>>>();
const fetcher: typeof publicFetch = async (url, deadline) => {
  if (pages.has(url)) return { ...pages.get(url)!, cached: true };
  const page = await publicFetch(url, deadline); pages.set(url, page); return page;
};
const results = [];
for (const c of cases) {
  const started = Date.now();
  const resolution = await resolveEmployer(c.input, { deadline: started + 8500, fetcher });
  const outcome = resolution.verification.outcome;
  results.push({ id: c.id, expected: c.expected, outcome, elapsedMs: Date.now() - started,
    falseVerification: outcome === 'matched' && c.expected !== 'matched',
    falseClosure: outcome === 'closed' && c.expected !== 'closed',
    scoringVersion: 3, score: calculateTrustScore({ ...resolution.score, scoringVersion: 3 }).trustScore,
    verification: resolution.verification });
}
const unsafe = results.filter(r => r.falseVerification || r.falseClosure).length;
const report = { checkedAt: new Date().toISOString(), count: results.length, falseClaims: unsafe,
  matched: results.filter(r => r.outcome === 'matched').length,
  scope: 'Public-source resolver only; LinkedIn DOM coverage and authenticated paid-search integration require separate pilot checks.', results };
writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ count: results.length, falseClaims: unsafe, report: outputPath }));
if (unsafe) process.exitCode = 1;
