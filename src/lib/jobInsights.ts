export type DescriptionCoverage = "expanded" | "complete" | "partial" | "unavailable";
export type JobInsightGroup = "role" | "quality" | "application" | "posting";

export interface JobInsight {
  id: string;
  group: JobInsightGroup;
  label: string;
  detail: string;
  excerpt?: string;
  sourceUrl?: string;
}

export type JobQualityCheckStatus = "found" | "not_listed" | "unknown";

/**
 * A disclosure-quality check is deliberately separate from Trust Evidence.
 * It answers “what useful job details are available?” without treating a
 * normal omission as evidence the employer is ghosting applicants.
 */
export interface JobQualityCheck {
  id: string;
  label: string;
  status: JobQualityCheckStatus;
  detail: string;
  excerpt?: string;
}

export interface JobInsightInput {
  description?: string | null;
  salary?: string | null;
  location?: string | null;
  employmentType?: string | null;
  experienceLevel?: string | null;
  postedAt?: string | null;
  applicants?: string | null;
  reposted?: boolean;
  promoted?: boolean;
  activelyReviewing?: boolean;
  applicationUrl?: string | null;
  applicationMethod?: "linkedin_easy_apply" | "linkedin_apply" | "external_apply" | "unknown";
  descriptionCoverage?: DescriptionCoverage;
}

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

function extractSkills(description: string): string[] {
  const skills = ["AI", "API", "AWS", "Azure", "Docker", "Excel", "Figma", "GCP", "HubSpot", "Java", "JavaScript", "Jira", "Kubernetes", "Node.js", "Postgres", "Python", "React", "Salesforce", "SQL", "Tableau", "TypeScript"];
  return skills.filter(skill => new RegExp('(?:^|[^a-z0-9])' + skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^a-z0-9])', 'i').test(description)).slice(0, 8);
}

function sectionPresent(description: string, pattern: RegExp): boolean {
  return pattern.test(description);
}

function linesOf(description: string): string[] {
  return description.replace(/\r\n?/g, "\n").split("\n").map(compact).filter(Boolean);
}

/**
 * Prefer the text under the section named by LinkedIn over the first generic
 * keyword match in the entire description. A long responsibilities section
 * commonly mentions "experience" before the actual Required Qualifications
 * heading appears.
 */
function sectionExcerpt(description: string, heading: RegExp): string | undefined {
  const lines = linesOf(description);
  const start = lines.findIndex(line => heading.test(line));
  if (start < 0) return undefined;
  const selected: string[] = [];
  for (let index = start; index < lines.length && selected.length < 3; index++) {
    const line = lines[index];
    if (index > start && /^(?:primary |key )?(?:responsibilities|qualifications)|^(?:preferred |required )?qualifications|^benefits|^about (?:the )?company/i.test(line)) break;
    selected.push(line);
  }
  return compact(selected.join(" ")).slice(0, 400) || undefined;
}

export function getJobInsights(input: JobInsightInput): JobInsight[] {
  const description = compact(input.description ?? "");
  const insights: JobInsight[] = [];
  const passages = (input.description ?? '').split(/\n+|(?<=[.!?])\s+/).map(compact).filter(s => s.length > 15);
  const patterns: Record<string, RegExp> = {
    responsibilities: /responsibilit|what you'?ll do|you will|day to day/i,
    qualifications: /qualificat|requirements?|must have|preferred|nice to have/i,
    team: /report(?:ing)? to|team|collaborat/i,
    benefits: /health insurance|401\(?k\)?|dental|vision|parental leave/i,
    salary: /\$\d|salary|compensation/i,
    'work-arrangement': /remote|hybrid|on[- ]site/i,
  };
  const push = (id: string, group: JobInsightGroup, label: string, detail: string, excerptOverride?: string) => {
    const excerpt = excerptOverride ?? (patterns[id] ? passages.find(p => patterns[id].test(p))?.slice(0, 400) : undefined);
    insights.push({ id, group, label, detail: excerpt || detail, excerpt });
  };

  if (description.length >= 500) push("role-detail", "role", "Detailed job description", `${description.length.toLocaleString()} characters of job detail were analyzed.`);
  const responsibilitiesExcerpt = sectionExcerpt(input.description ?? "", /^(?:primary |key )?responsibilities\b|^what you'?ll do\b/i);
  const qualificationsExcerpt = sectionExcerpt(input.description ?? "", /^(?:required |preferred )?qualifications\b|^requirements\b|^what you bring\b/i);
  if (sectionPresent(description, /responsibilit|what you'?ll do|you will|day to day/i)) push("responsibilities", "role", "Responsibilities are described", "The posting explains work the role is expected to own or deliver.", responsibilitiesExcerpt);
  if (sectionPresent(description, /requirement|qualification|must have|preferred|nice to have/i)) push("qualifications", "role", "Qualifications are described", "The posting includes required or preferred candidate qualifications.", qualificationsExcerpt);
  const skills = extractSkills(description);
  if (skills.length) push("skills", "role", "Skills and tools mentioned", skills.join(", "));
  if (sectionPresent(description, /report to|reporting to|manager|team|collaborat/i)) push("team", "role", "Team or reporting context mentioned", "The posting gives some context about collaboration, team, or reporting structure.");
  if (input.employmentType) push("employment-type", "role", "Employment type", input.employmentType);
  if (input.experienceLevel) push("experience-level", "role", "Experience level", input.experienceLevel);

  if (input.salary || /\$\d[\d,]*|\b\d{2,3}k\b/i.test(description)) push("salary", "quality", "Salary information listed", input.salary || "A compensation amount or range appears in the posting.");
  if (sectionPresent(description, /health insurance|401\(?k\)?|dental|vision|benefits package|parental leave/i)) push("benefits", "quality", "Benefits mentioned", "The posting names at least one benefit. This does not affect Trust Score.");
  const workMode = [input.location, description].join(" ").match(/\b(remote|hybrid|on[- ]site|work from home|wfh)\b/i)?.[1];
  if (workMode) push("work-arrangement", "quality", "Work arrangement", workMode.replace(/^\w/, (letter) => letter.toUpperCase()));
  if (input.location) push("location", "quality", "Location", input.location);

  const appMethod = input.applicationMethod ?? (input.applicationUrl ? "external_apply" : "unknown");
  const appText = appMethod === "linkedin_easy_apply" ? "LinkedIn Easy Apply" : appMethod === "linkedin_apply" ? "LinkedIn Apply" : appMethod === "external_apply" ? "External employer or ATS application" : "Application method was not identified";
  push("application-method", "application", "Application path", appText);
  if (input.applicationUrl) {
    try {
      push("application-destination", "application", "Public application destination", new URL(input.applicationUrl).hostname);
    } catch {
      push("application-destination", "application", "Public application destination", "A direct application destination was supplied.");
    }
  }

  if (input.postedAt) push("posted-at", "posting", "Posting age", input.postedAt);
  if (input.reposted) push("reposted", "posting", "LinkedIn repost label", "LinkedIn marks this listing as reposted. This is a caution, not proof of a ghost job.");
  if (input.promoted) push("promoted", "posting", "Promoted by hirer", "LinkedIn displays a promotion label. This is context only.");
  if (input.activelyReviewing) push("actively-reviewing", "posting", "Actively reviewing applicants", "LinkedIn displays this hiring-status label. This is context only.");
  if (input.applicants) push("applicants", "posting", "Applicant count", input.applicants);

  return insights;
}

export function getJobQualityChecklist(input: JobInsightInput): JobQualityCheck[] {
  const description = compact(input.description ?? "");
  const hasDescription = description.length > 0 && input.descriptionCoverage !== "unavailable";
  const location = compact(input.location ?? "");
  const hasLocation = Boolean(location) && !/^unknown(?: location)?$/i.test(location);
  const salary = compact(input.salary ?? "");
  const skills = extractSkills(description);
  const workArrangement = /\b(remote|remotely|hybrid|on[- ]site|work from home|wfh|flexible work)\b/i;
  const reporting = /\breport(?:ing)? to\b|\bmanager\b|\bsupervisor\b|\bteam of\b|\bjoin (?:our )?team\b/i;
  const contact = /\bhiring manager\b|\breach out to\b|\bcontact\b.{0,50}\b(?:at|via|@)\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const benefits = /health insurance|401\(?k\)?|dental|vision|benefits package|parental leave|paid time off|\bpto\b/i;
  const employment = /\b(full[- ]time|part[- ]time|contract(?:or)?|temporary|internship|apprenticeship|seasonal|freelance)\b/i;
  const responsibilities = /responsibilit|what you'?ll do|you will|you'll|day to day|responsible for|\bown\b|\bdeliver\b/i;
  const qualifications = /requirements?|qualifications?|must have|preferred|nice to have|experience with/i;
  const responsibilitiesExcerpt = sectionExcerpt(input.description ?? "", /^(?:primary |key )?responsibilities\b|^what you'?ll do\b/i);
  const qualificationsExcerpt = sectionExcerpt(input.description ?? "", /^(?:required |preferred )?qualifications\b|^requirements\b|^what you bring\b/i);
  const applicationKnown = Boolean(input.applicationUrl) || (input.applicationMethod && input.applicationMethod !== "unknown");
  const check = (id: string, label: string, found: boolean, foundDetail: string, missingDetail: string, pattern?: RegExp): JobQualityCheck => {
    const excerpt = pattern ? description.split(/\n+|(?<=[.!?])\s+/).map(compact).find(line => pattern.test(line))?.slice(0, 400) : undefined;
    if (found) return { id, label, status: "found", detail: excerpt || foundDetail, excerpt };
    if (!hasDescription) return { id, label, status: "unknown", detail: "Job details were unavailable, so GhostJob could not check this item." };
    return { id, label, status: "not_listed", detail: `${missingDetail} This does not affect Trust Score.` };
  };

  return [
    check("compensation", "Compensation", Boolean(salary) || /\$\d[\d,]*|\b\d{2,3}k\b|salary|compensation/i.test(description), "A salary amount, range, or compensation detail is listed.", "Compensation was not listed in the scanned job details.", /\$\d[\d,]*|\b\d{2,3}k\b|salary|compensation/i),
    hasLocation
      ? { id: "location", label: "Location", status: "found", detail: location }
      : hasDescription
        ? { id: "location", label: "Location", status: "not_listed", detail: "A specific location was not listed in the scanned job details. This does not affect Trust Score." }
        : { id: "location", label: "Location", status: "unknown", detail: "Job details were unavailable, so GhostJob could not check this item." },
    check("work-arrangement", "Work setup", workArrangement.test(description) || workArrangement.test(location), "A remote, hybrid, on-site, or flexible-work detail is listed.", "Work setup was not listed in the scanned job details.", workArrangement),
    check("team-reporting", "Team or reporting line", reporting.test(description), "The posting gives team or reporting context.", "A team or reporting line was not listed in the scanned job details.", reporting),
    check("hiring-contact", "Hiring contact", contact.test(description), "The posting includes a hiring contact or contact route.", "A hiring contact or contact route was not listed in the scanned job details.", contact),
    check("benefits", "Benefits", benefits.test(description), "The posting names at least one benefit.", "Benefits were not listed in the scanned job details.", benefits),
    // An explicit header value is authoritative. Do not replace it with the
    // first instance of "full-time" in prose, which is often salary wording.
    check("employment-type", "Employment type", Boolean(input.employmentType) || employment.test(description), input.employmentType || "The posting identifies an employment type.", "Employment type was not listed in the scanned job details.", input.employmentType ? undefined : employment),
    check("responsibilities", "Responsibilities", responsibilities.test(description), responsibilitiesExcerpt || "The posting describes work the role is expected to own or deliver.", "Responsibilities were not clearly listed in the scanned job details.", responsibilitiesExcerpt ? undefined : responsibilities),
    check("qualifications", "Qualifications", qualifications.test(description), qualificationsExcerpt || "The posting includes required or preferred qualifications.", "Qualifications were not clearly listed in the scanned job details.", qualificationsExcerpt ? undefined : qualifications),
    check("skills-tools", "Skills and tools", skills.length > 0, skills.length ? `Mentioned: ${skills.join(", ")}.` : "Skills or tools are listed.", "Specific skills or tools were not listed in the scanned job details."),
    check("application-path", "Application path", applicationKnown, input.applicationUrl ? "A direct application destination is available." : "LinkedIn identifies an application method.", "An application path was not identified in the scanned job details."),
    check("posting-age", "Posting age", Boolean(input.postedAt), input.postedAt || "LinkedIn displays a posting age.", "A visible posting age was not available in the scanned job details."),
  ];
}

export function getSuggestedQuestions(input: JobInsightInput, employerRoleVerified: boolean): string[] {
  const description = compact(input.description ?? "");
  const questions: string[] = [];
  if (!employerRoleVerified) questions.push("Can you confirm this role is currently open on the company careers site?");
  if (!input.salary && !/\$\d[\d,]*|\b\d{2,3}k\b/i.test(description)) questions.push("What is the approved salary range for this position?");
  if (!/report to|reporting to|manager|supervisor/i.test(description)) questions.push("Who would this role report to, and what does the team look like?");
  if (!/responsibilit|what you'?ll do|you will|deliver/i.test(description)) questions.push("What would success look like in the first 90 days?");
  return questions.slice(0, 4);
}
