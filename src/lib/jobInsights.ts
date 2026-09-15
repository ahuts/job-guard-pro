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
}

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

function extractSkills(description: string): string[] {
  const skills = ["AI", "API", "AWS", "Azure", "Docker", "Excel", "Figma", "GCP", "HubSpot", "Java", "JavaScript", "Jira", "Kubernetes", "Node.js", "Postgres", "Python", "React", "Salesforce", "SQL", "Tableau", "TypeScript"];
  return skills.filter(skill => new RegExp('(?:^|[^a-z0-9])' + skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^a-z0-9])', 'i').test(description)).slice(0, 8);
}

function sectionPresent(description: string, pattern: RegExp): boolean {
  return pattern.test(description);
}

export function getJobInsights(input: JobInsightInput): JobInsight[] {
  const description = compact(input.description ?? "");
  const insights: JobInsight[] = [];
  const passages = (input.description ?? '').split(/\n+|(?<=[.!?])\s+/).map(compact).filter(s => s.length > 15);
  const patterns: Record<string, RegExp> = {
    responsibilities: /responsibilit|you will|you'll|build|deliver|own/i,
    qualifications: /qualificat|require|must have|preferred|experience/i,
    team: /report(?:ing)? to|team|collaborat/i,
    benefits: /health insurance|401\(?k\)?|dental|vision|parental leave/i,
    salary: /\$\d|salary|compensation/i,
    'work-arrangement': /remote|hybrid|on[- ]site/i,
  };
  const push = (id: string, group: JobInsightGroup, label: string, detail: string) => {
    const excerpt = patterns[id] ? passages.find(p => patterns[id].test(p))?.slice(0, 400) : undefined;
    insights.push({ id, group, label, detail: excerpt || detail, excerpt });
  };

  if (description.length >= 500) push("role-detail", "role", "Detailed job description", `${description.length.toLocaleString()} characters of job detail were analyzed.`);
  if (sectionPresent(description, /responsibilit|what you'?ll do|you will|day to day/i)) push("responsibilities", "role", "Responsibilities are described", "The posting explains work the role is expected to own or deliver.");
  if (sectionPresent(description, /requirement|qualification|must have|preferred|nice to have/i)) push("qualifications", "role", "Qualifications are described", "The posting includes required or preferred candidate qualifications.");
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

export function getSuggestedQuestions(input: JobInsightInput, employerRoleVerified: boolean): string[] {
  const description = compact(input.description ?? "");
  const questions: string[] = [];
  if (!employerRoleVerified) questions.push("Can you confirm this role is currently open on the company careers site?");
  if (!input.salary && !/\$\d[\d,]*|\b\d{2,3}k\b/i.test(description)) questions.push("What is the approved salary range for this position?");
  if (!/report to|reporting to|manager|supervisor/i.test(description)) questions.push("Who would this role report to, and what does the team look like?");
  if (!/responsibilit|what you'?ll do|you will|deliver/i.test(description)) questions.push("What would success look like in the first 90 days?");
  return questions.slice(0, 4);
}
