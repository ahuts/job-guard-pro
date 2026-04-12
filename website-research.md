# GhostJob — Website Research & Statistics

## The Ghost Job Crisis

### Key Statistics
- **~43% of job postings are ghost jobs** — listings with no real hiring intent (2024-2025 research)
- **28-32% across US job boards** in 2026
- **$737M lost to fake job offers** in the US since 2019
- **$500M+ lost to job/employment scams** in 2023 alone (FTC data)
- **11+ hours/week** wasted by job seekers on fake listings
- **Average application takes 38 minutes** — 15% of search time wasted on ghosts
- **30-40% of reposted roles never result in a hire**

### Why Companies Post Ghost Jobs
1. **Talent pipeline building** — collecting resumes "just in case"
2. **Compliance** — federal contractors must post even with internal candidates lined up
3. **Investor optics** — appearing to grow and hire
4. **Employee retention pressure** — making employees feel replaceable
5. **Recruiter KPIs** — "active reqs" metrics look good on reports

### The Impact on Job Seekers
- Apply → hear nothing → false hope → wasted time
- Emotional toll of repeated rejection from jobs that were never real
- Financial loss from identity theft in scam postings
- Delayed career progress from time spent on phantom opportunities

---

## How GhostJob Detects Ghost Jobs

### Our Signal System
We analyze job postings across **3 signal categories** — each backed by research from Subspace's 39-signal model (0.904 correlation with LLM analysis), JobScamScore's 25 flags, and Inteller's 30+ signals.

#### 🔴 Red Flags (Strong Ghost Signals)
| Signal | Weight | Why It Matters |
|--------|--------|----------------|
| Reposted job | -10 | Companies recycle postings to appear active. 30-40% of reposted roles never hire. |
| Urgency language ("ASAP", "immediate start") | -10 | Legitimate companies don't need to pressure applicants. |
| Unrealistic experience requirements | -8 | "10 years in React" — impossible, signals recycled or generic posting. |
| Vague salary ("competitive", "commensurate") | -8 | Companies confident in their pay share numbers upfront. |
| Vague/generic description (<200 chars substance) | -6 | Pipeline postings are generic by nature. |
| High experience requirements (5+ years for entry) | -6 | Mismatch between title and expectations. |

#### 🟡 Yellow Flags (Caution Signals)
| Signal | Weight | Why It Matters |
|--------|--------|----------------|
| No salary range listed | -4 | 43% of job postings hide pay — often below market rate. |
| No team or manager mentioned | -4 | Ghost jobs skip specifics about who you'd work with. |
| "Various locations" or missing location | -3 | Legitimate roles name a city; ghosts stay vague. |
| AI-generated language patterns | -3 | Overly smooth, generic text that could apply to any company. |
| Culture buzzwords + red flags contradiction | -4 | Claims "work-life balance" but also "fast-paced" and "wear many hats." |
| Stale listing (30+ days open) | -6 | Most legitimate hires close within 30 days. |

#### 🟢 Green Flags (Legitimacy Signals)
| Signal | Weight | Why It Matters |
|--------|--------|----------------|
| Salary transparency | +10 | Companies that share pay ranges are confident in their compensation. |
| Benefits mentioned | +6 | Genuine postings include specific benefits. |
| Flexible work options | +5 | Indicates real operational planning. |
| Hiring manager contact | +4 | Named contact person = real hiring intent. |
| Clear, specific requirements | +4 | Detailed job descriptions correlate with real positions. |

### Trust Score
- **0-30**: 🔴 Likely Ghost Job
- **31-60**: 🟡 Proceed with Caution
- **61-100**: 🟢 Looks Legitimate

---

## Competitive Landscape

| Tool | Type | Our Edge |
|------|------|----------|
| JobScamScore | Web checker (copy/paste) | We scan inline — no leaving the page |
| Inteller.ai | AI career advisor | We're focused solely on ghost detection |
| Trouvr | Chrome extension | We have more signals + quote extraction |
| Deghost | Verified listings marketplace | We analyze, not just list |
| Lumen | Web checker | We work directly on LinkedIn |
| Subspace | API/Web (39 signals) | We're the only inline LinkedIn scanner |
| **GhostJob** | **Chrome extension** | **Only tool that injects directly into LinkedIn** |

**Our unique advantage:** One-click scanning directly on LinkedIn. No copy/paste, no leaving the page, no separate dashboard needed.

---

## Sources
- Subspace Research: "Ghost Job Detection via Multi-Signal Analysis" (2024) — 39 signals, 0.904 correlation
- JobScamScore: FTC, BBB, FBI data integration for scam detection
- Wall Street Journal (2024): Companies admit to keeping postings active for "talent pipeline"
- Built In / Cory Stahle: Reposting analysis and hiring timelines
- FTC Report (2023): $500M+ lost to employment scams
- Inteller.ai: 30+ signal model for job legitimacy scoring