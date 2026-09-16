import { describe, expect, it } from "vitest";
import { getJobInsights, getJobQualityChecklist, getSuggestedQuestions } from "./jobInsights";

describe("getJobInsights", () => {
  const detailedPosting = {
    description: "About the role. You will build Python and SQL workflows. Requirements include 5 years of experience, AWS, and collaboration with the product team. Benefits include health insurance and a 401k.",
    salary: "$120,000 - $145,000",
    location: "Remote, United States",
    employmentType: "Full-time",
    experienceLevel: "Mid-Senior level",
    postedAt: "2 weeks ago",
    applicants: "Over 100 applicants",
    promoted: true,
    activelyReviewing: true,
    applicationMethod: "external_apply" as const,
    applicationUrl: "https://jobs.example.com/role",
  };

  it("groups full-page facts as non-scoring job context", () => {
    const insights = getJobInsights(detailedPosting);
    expect(insights.some((item) => item.group === "role" && item.id === "skills")).toBe(true);
    expect(insights.some((item) => item.group === "quality" && item.id === "salary")).toBe(true);
    expect(insights.some((item) => item.group === "application" && item.id === "application-method")).toBe(true);
    expect(insights.some((item) => item.group === "posting" && item.id === "actively-reviewing")).toBe(true);
  });

  it("creates practical questions without treating ordinary omissions as ghost evidence", () => {
    const questions = getSuggestedQuestions({ description: "A short role description." }, false);
    expect(questions).toContain("Can you confirm this role is currently open on the company careers site?");
    expect(questions.some((question) => question.includes("salary range"))).toBe(true);
  });

  it("reports job quality and clarity as neutral disclosure checks", () => {
    const checklist = getJobQualityChecklist({
      description: "You will build Python services. Requirements include SQL. This is a remote role with health insurance.",
      salary: "$120,000 - $145,000",
      location: "Remote, United States",
      employmentType: "Full-time",
      postedAt: "2 weeks ago",
      applicationMethod: "linkedin_apply",
      descriptionCoverage: "complete",
    });
    expect(checklist).toHaveLength(12);
    expect(checklist.find((item) => item.id === "compensation")?.status).toBe("found");
    expect(checklist.find((item) => item.id === "team-reporting")?.status).toBe("not_listed");
    expect(checklist.find((item) => item.id === "hiring-contact")?.detail).toContain("does not affect Trust Score");
  });

  it("uses unknown rather than a negative omission when job details are unavailable", () => {
    const checklist = getJobQualityChecklist({ descriptionCoverage: "unavailable" });
    expect(checklist.every((item) => item.status === "unknown")).toBe(true);
  });
});
