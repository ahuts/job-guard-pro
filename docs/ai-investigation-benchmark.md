# OpenAI / Jev live benchmark

**Not completed:** the research shortlist has human review notes but is not a
balanced, frozen benchmark corpus. Fixture tests verify behavior, not model accuracy.

Collect 24 real, dated LinkedIn listings from at least six employers. Freeze 12
rubric cases for prompt refinement and 12 holdout cases before making changes.
Each split contains two cases from each category: `exact`, `title_variation`,
`different_role`, `closed`, `unresolved`, `caution`. Independently read the LinkedIn
listing and employer source. Record expected native finding, semantic finding,
caution types and four Jev dimension labels before inspecting model output.
Do not manufacture a suspicious listing to satisfy the live-corpus requirement;
adversarial and fabricated postings belong in fixture tests.

Store evidence and reports under gitignored `private-benchmarks/`. Each JSON case:

```json
{
  "id": "unique-case-id",
  "split": "rubric",
  "category": "title_variation",
  "reviewer": "Actual reviewer",
  "reviewedAt": "Actual ISO timestamp",
  "evidenceUrl": "https://official-employer.example/actual-role",
  "input": {
    "title": "Observed LinkedIn title",
    "company": "Observed company",
    "location": "Observed location",
    "description": "Observed description",
    "url": "https://www.linkedin.com/jobs/view/ACTUAL_ID/",
    "employerUrl": "https://official-employer.example/",
    "descriptionCoverage": "complete"
  },
  "expectedNative": "unverified",
  "expectedFinding": "probable_match",
  "expectedCautions": [],
  "expectedJev": {
    "responsibilities": "aligned",
    "qualifications": "aligned",
    "seniority": "aligned",
    "material_consistency": "aligned"
  }
}
```

This illustrates the shape only; it is not a reviewed case. `expectedNative` is
`matched`, `closed` or `unverified`. Semantic findings are `exact_match`,
`probable_match`, `different_role`, `insufficient_evidence`. Jev answers are
`aligned`, `conflicting`, `insufficient_evidence`. Caution kinds are
`payment_demand`, `credential_request`, `sensitive_data_request`.

With server-only credentials, configured pilot switches and
`GHOSTJOB_BENCHMARK_USER_ID` set to an actual allowlisted account UUID:

```sh
npx tsx --env-file=.env.local scripts/ai-investigation-benchmark.ts \
  private-benchmarks/reviewed-cases.json private-benchmarks/report.json
```

This invokes paid providers under the same $25 ledger as the pilot. It never
inserts saved jobs or applications. The runner reports native/OpenAI accuracy,
Jev dimension agreement, false claims, abstention, caution accuracy, p95 latency,
estimated usage costs and uncertain cost cases. It stops on unavailable capacity
and cannot pass with incomplete cases or missing Jev evaluations. Inspect the
report and dated sources; zero false holdout claims alone does not establish
reliability across all employers. Retest changed/removed listings against updated,
independently reviewed expectations rather than trusting stale labels.

The 2026-09-26 research shortlist and review sheet are intake material, not a
runner input. A `reviewed` status or selected category does not substitute for a
dated source snapshot, independent expected findings, and four Jev labels.
The 24-case gate must not be relaxed to fit weak or missing categories. Preserve
the original reviewer notes and replace or adjudicate cases before freezing the
rubric and holdout sets. Source text captured after the human review must be
rechecked for material changes before it is used as the reviewed input.
