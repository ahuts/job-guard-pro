import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { scanSchema, v3Allowed } from '../src/server/scanV3';
import { investigateJob, investigationAccess, investigationFingerprint } from '../src/server/investigateJob';
import { cacheGet, hash } from '../src/server/searchStore';
import { matchFindings } from '../src/lib/investigation';

const caseSchema = z.object({
  id: z.string().min(1), split: z.enum(['rubric', 'holdout']),
  category: z.enum(['exact', 'title_variation', 'different_role', 'closed', 'unresolved', 'caution']),
  reviewer: z.string().min(2), reviewedAt: z.string().datetime(), evidenceUrl: z.string().url(),
  input: scanSchema, expectedNative: z.enum(['matched', 'closed', 'unverified']), expectedFinding: z.enum(matchFindings),
  expectedCautions: z.array(z.enum(['payment_demand', 'credential_request', 'sensitive_data_request'])),
  expectedJev: z.object({ responsibilities: z.enum(['aligned', 'conflicting', 'insufficient_evidence']), qualifications: z.enum(['aligned', 'conflicting', 'insufficient_evidence']), seniority: z.enum(['aligned', 'conflicting', 'insufficient_evidence']), material_consistency: z.enum(['aligned', 'conflicting', 'insufficient_evidence']) }),
});
const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('Usage: npx tsx --env-file=.env.local scripts/ai-investigation-benchmark.ts private-benchmarks/reviewed-cases.json private-benchmarks/report.json');
const cases = z.array(caseSchema).length(24).parse(JSON.parse(readFileSync(inputPath, 'utf8')));
if (new Set(cases.map(c => c.id)).size !== 24 || cases.filter(c => c.split === 'rubric').length !== 12 || cases.filter(c => c.split === 'holdout').length !== 12 || cases.some(c => Date.parse(c.reviewedAt) > Date.now())) throw new Error('Require 24 unique, already-reviewed cases split 12/12.');
for (const category of ['exact', 'title_variation', 'different_role', 'closed', 'unresolved', 'caution']) {
  for (const split of ['rubric', 'holdout']) if (cases.filter(c => c.category === category && c.split === split).length !== 2) throw new Error(`Require two ${category} cases in each split.`);
}
const userId = process.env.GHOSTJOB_BENCHMARK_USER_ID;
if (!userId || !v3Allowed(userId) || investigationAccess(userId) !== 'available' || process.env.GHOSTJOB_JEV_EVALUATION_ENABLED !== 'true' || !process.env.TYPESAFE_API_KEY) throw new Error('Require a configured pilot UUID, enabled investigation and Jev credentials. This runner shares the $25 budget.');
type BenchmarkResult = {
  split: string; status: string; nativeCorrect: boolean; comparisonCorrect: boolean;
  falseExact: boolean; falseNativeClaim: boolean; abstained: boolean; cautionCorrect: boolean;
  jevCorrect: boolean | null; elapsedMs: number;
  metrics: { costMicroUsd: number; usageUncertain: boolean; cached: boolean; latencyMs: number };
  [key: string]: unknown;
};
const results: BenchmarkResult[] = [];
for (const c of cases) {
  const started = Date.now();
  let metrics = { costMicroUsd: 0, usageUncertain: false, cached: false, latencyMs: 0 };
  const result = await investigateJob({ ...c.input, title: c.input.title!, company: c.input.company!, url: c.input.url ?? undefined }, userId, Date.now() + 30_000, { onMetrics: value => { metrics = value; } });
  const fingerprint = investigationFingerprint({ ...c.input, title: c.input.title!, company: c.input.company!, url: c.input.url ?? undefined });
  const jev = await cacheGet<{ evaluation?: { answers: Record<string, { choice: string; confidence: number }>; latencyMs: number; usage: { input_tokens: number; output_tokens: number } } }>(`gj:jev-evaluation:${hash([userId, fingerprint])}`);
  const native = result.resolution.verification.outcome === 'matched' ? 'matched' : result.resolution.verification.outcome === 'closed' ? 'closed' : 'unverified';
  results.push({ id: c.id, split: c.split, category: c.category, reviewedAt: c.reviewedAt, evidenceUrl: c.evidenceUrl,
    expectedNative: c.expectedNative, native, nativeCorrect: native === c.expectedNative,
    expectedFinding: c.expectedFinding, finding: result.investigation.finding, status: result.investigation.status,
    comparisonCorrect: result.investigation.finding === c.expectedFinding,
    falseExact: result.investigation.finding === 'exact_match' && c.expectedFinding !== 'exact_match',
    falseNativeClaim: (native === 'matched' || native === 'closed') && native !== c.expectedNative,
    abstained: result.investigation.finding === 'insufficient_evidence',
    cautionCorrect: JSON.stringify([...result.investigation.cautionFlags.map(f => f.kind)].sort()) === JSON.stringify([...c.expectedCautions].sort()),
    jevAnswers: jev?.evaluation?.answers ?? null,
    jevCorrect: jev?.evaluation ? Object.entries(c.expectedJev).every(([key, expected]) => jev.evaluation!.answers[key]?.choice === expected) : null,
    elapsedMs: Date.now() - started, metrics });
  // Do not label unevaluated cases as completed when shared budget/storage fails.
  if (['budget_exhausted', 'disabled', 'not_eligible'].includes(result.investigation.status)) break;
  // Observe the same five-starts/minute budget limit as actual users. This delay
  // is confined to the offline runner, never an HTTP request or agent tool wait.
  if (!metrics.cached) await new Promise(resolve => setTimeout(resolve, 12_100));
}
const holdout = results.filter(r => r.split === 'holdout');
const summary = (rows: typeof results) => ({ count: rows.length, completed: rows.filter(r => r.status === 'completed').length,
  nativeAccuracy: rows.length ? rows.filter(r => r.nativeCorrect).length / rows.length : null,
  comparisonAccuracy: rows.length ? rows.filter(r => r.comparisonCorrect).length / rows.length : null,
  jevEvaluated: rows.filter(r => r.jevCorrect !== null).length,
  jevAccuracy: rows.some(r => r.jevCorrect !== null) ? rows.filter(r => r.jevCorrect === true).length / rows.filter(r => r.jevCorrect !== null).length : null,
  falseExact: rows.filter(r => r.falseExact).length, falseNativeClaims: rows.filter(r => r.falseNativeClaim).length,
  abstained: rows.filter(r => r.abstained).length, cautionAccuracy: rows.length ? rows.filter(r => r.cautionCorrect).length / rows.length : null,
  p95LatencyMs: rows.length ? [...rows].sort((a, b) => a.elapsedMs - b.elapsedMs)[Math.ceil(rows.length * 0.95) - 1].elapsedMs : null,
  estimatedUsageUsd: rows.reduce((sum, r) => sum + r.metrics.costMicroUsd, 0) / 1_000_000,
  uncertainCostCases: rows.filter(r => r.metrics.usageUncertain).length });
const passed = results.length === 24 && results.every(r => r.status === 'completed' && r.jevCorrect !== null) && holdout.length === 12 && !holdout.some(r => r.falseExact || r.falseNativeClaim);
writeFileSync(outputPath, JSON.stringify({ checkedAt: new Date().toISOString(), acceptanceGatePassed: passed, summary: summary(results), holdout: summary(holdout), results }, null, 2));
console.log(JSON.stringify({ acceptanceGatePassed: passed, count: results.length, report: outputPath }));
if (!passed) process.exitCode = 1;
