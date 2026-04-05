// Ghost Score Calculator
// Takes scraped job data and returns a 0-100 ghost score

export interface JobSignals {
  // Posting signals
  postedDays: number | null;        // Days since posted
  hasSalary: boolean;               // Salary disclosed?
  descriptionLength: number;      // Word count
  hasRepostIndicator: boolean;    // "Reposted" badge?
  
  // Company signals
  companyName: string;
  hasRecentLayoffs: boolean | null; // Requires external data
  roleOnCareersPage: boolean | null; // Requires external check
  
  // Application signals (user-provided)
  daysSinceApplied: number | null;
  receivedResponse: boolean | null;
}

export interface GhostScoreResult {
  score: number;
  rating: 'low' | 'medium' | 'high' | 'critical';
  signals: {
    name: string;
    weight: number;
    triggered: boolean;
    description: string;
  }[];
  summary: string;
}

export function calculateGhostScore(signals: JobSignals): GhostScoreResult {
  let score = 0;
  const triggeredSignals: GhostScoreResult['signals'] = [];

  // Signal 1: Posting age (30+ days is major red flag)
  if (signals.postedDays !== null && signals.postedDays >= 30) {
    const weight = signals.postedDays >= 60 ? 35 : 25;
    score += weight;
    triggeredSignals.push({
      name: 'Old Posting',
      weight,
      triggered: true,
      description: `Posted ${signals.postedDays} days ago. Jobs filled in ~44 days on average.`,
    });
  } else if (signals.postedDays !== null && signals.postedDays >= 14) {
    score += 10;
    triggeredSignals.push({
      name: 'Aging Posting',
      weight: 10,
      triggered: true,
      description: `Posted ${signals.postedDays} days ago. May still be active.`,
    });
  }

  // Signal 2: No salary listed
  if (!signals.hasSalary) {
    score += 20;
    triggeredSignals.push({
      name: 'No Salary Listed',
      weight: 20,
      triggered: true,
      description: 'Salary transparency is a sign of serious hiring intent.',
    });
  }

  // Signal 3: Vague description
  if (signals.descriptionLength < 50) {
    score += 15;
    triggeredSignals.push({
      name: 'Vague Description',
      weight: 15,
      triggered: true,
      description: `Only ${signals.descriptionLength} words. Real postings are specific.`,
    });
  } else if (signals.descriptionLength < 100) {
    score += 5;
    triggeredSignals.push({
      name: 'Brief Description',
      weight: 5,
      triggered: true,
      description: `${signals.descriptionLength} words. Could be more detailed.`,
    });
  }

  // Signal 4: Repost indicator
  if (signals.hasRepostIndicator) {
    score += 25;
    triggeredSignals.push({
      name: 'Reposted Job',
      weight: 25,
      triggered: true,
      description: 'This job has been reposted multiple times. Strong ghost signal.',
    });
  }

  // Signal 5: Recent layoffs (requires external data)
  if (signals.hasRecentLayoffs === true) {
    score += 20;
    triggeredSignals.push({
      name: 'Company Layoffs',
      weight: 20,
      triggered: true,
      description: `${signals.companyName} had recent layoffs. Hiring freeze likely.`,
    });
  }

  // Signal 6: Role not on careers page
  if (signals.roleOnCareersPage === false) {
    score += 20;
    triggeredSignals.push({
      name: 'Not on Company Site',
      weight: 20,
      triggered: true,
      description: 'This role is not listed on the company\'s careers page.',
    });
  }

  // Signal 7: No response after applying
  if (signals.daysSinceApplied !== null && signals.daysSinceApplied >= 14 && signals.receivedResponse === false) {
    score += 15;
    triggeredSignals.push({
      name: 'No Response',
      weight: 15,
      triggered: true,
      description: `No response after ${signals.daysSinceApplied} days. Likely not actively hiring.`,
    });
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine rating
  let rating: GhostScoreResult['rating'];
  if (score <= 30) rating = 'low';
  else if (score <= 60) rating = 'medium';
  else if (score <= 80) rating = 'high';
  else rating = 'critical';

  // Generate summary
  const summary = generateSummary(score, rating, triggeredSignals.length);

  return {
    score,
    rating,
    signals: triggeredSignals,
    summary,
  };
}

function generateSummary(score: number, rating: string, signalCount: number): string {
  const summaries: Record<string, string> = {
    low: `Ghost Score: ${score}/100. This appears to be a legitimate job posting with ${signalCount} minor concern(s). Proceed with confidence.`,
    medium: `Ghost Score: ${score}/100. This posting shows some warning signs (${signalCount} detected). Worth applying but don't invest too much time.`,
    high: `Ghost Score: ${score}/100. This is likely a ghost job (${signalCount} red flags). Consider skipping or sending a minimal application.`,
    critical: `Ghost Score: ${score}/100. Almost certainly a fake or stale posting (${signalCount} red flags). Save your time and skip this one.`,
  };

  return summaries[rating] || summaries.medium;
}

// Helper to extract posting age from LinkedIn text
export function parsePostedTime(postedText: string | null): number | null {
  if (!postedText) return null;

  const text = postedText.toLowerCase();

  // Match patterns like "2 days ago", "1 week ago", "3 months ago"
  const patterns = [
    { regex: /(\d+)\s+hour(s)?\s+ago/, multiplier: 1/24 },
    { regex: /(\d+)\s+day(s)?\s+ago/, multiplier: 1 },
    { regex: /(\d+)\s+week(s)?\s+ago/, multiplier: 7 },
    { regex: /(\d+)\s+month(s)?\s+ago/, multiplier: 30 },
    { regex: /(\d+)\s+year(s)?\s+ago/, multiplier: 365 },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.floor(num * pattern.multiplier);
    }
  }

  // Handle "Just now" or "Today"
  if (text.includes('just now') || text.includes('today')) {
    return 0;
  }

  return null;
}

// Helper to check if text indicates a repost
export function isRepostIndicator(text: string | null): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('reposted') || t.includes('re-posted') || t.includes('re listed');
}
