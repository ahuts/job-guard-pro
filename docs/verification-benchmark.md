# Live benchmark review gate

Status: **pending independently reviewed cases**. Automated fixtures test software
behavior and are not the approximately 50 real listings required for release.

Collect cases with these coverage targets (50 total):

| Category | Cases |
|---|---:|
| Greenhouse exact open roles | 8 |
| Lever exact open roles | 8 |
| Ashby exact open roles | 8 |
| Direct employer pages | 6 |
| Same-role explicit closures | 5 |
| Staffing / similar company names | 5 |
| Remote country restrictions / multiple locations | 5 |
| Easy Apply only / blocked sources / evergreen postings | 5 |

For each case record the input as observed on LinkedIn, the independently checked
employer source, reviewer, review timestamp, and expected finding. Do not derive the
expected finding from GhostJob's output. Include cases from at least ten employers.

Input format (example structure, not a reviewed listing):

```json
[
  {
    "id": "case-001",
    "input": {
      "title": "Observed title",
      "company": "Observed employer",
      "location": "Observed location",
      "url": "https://www.linkedin.com/jobs/view/JOB_ID/",
      "employerUrl": "https://employer.example/",
      "companyLinkedInUrl": "https://www.linkedin.com/company/EMPLOYER/"
    },
    "reviewer": "Reviewer name",
    "reviewedAt": "ISO timestamp",
    "evidenceUrl": "https://employer.example/careers/ROLE_ID",
    "expected": "matched"
  }
]
```

Run `npx tsx scripts/verification-benchmark.ts reviewed-cases.json report.json`.
The runner makes bounded public GET requests and writes only a report. It neither
saves scans nor queries the production database. No paid search is invoked.
Zero false verifications/closures is necessary but not sufficient: inspect coverage,
reasons for unresolved jobs, and latency before approving the pilot. Separately test
DOM coverage on active Chrome LinkedIn layouts and authenticated deep-search budgets.
