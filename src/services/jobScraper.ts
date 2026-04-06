import { supabase } from '@/integrations/supabase/client';
import { JobSignals, calculateGhostScore } from '@/lib/ghostScorer';

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  postedAt: string | null;
  salary: string | null;
  applicants: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
}

export interface AnalysisResult {
  job: ScrapedJob;
  signals: JobSignals;
  ghostScore: {
    score: number;
    rating: 'low' | 'medium' | 'high' | 'critical';
    signals: { name: string; weight: number; triggered: boolean; description: string }[];
    summary: string;
  };
}

// Scrape job from LinkedIn URL via edge function
export async function scrapeJob(url: string): Promise<ScrapedJob> {
  const { data, error } = await supabase.functions.invoke('scrape-job', {
    body: { url },
  });

  if (error) {
    throw new Error(error.message || 'Failed to scrape job');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to extract job details');
  }

  return data.data;
}

// Analyze job from URL
export async function analyzeJob(url: string): Promise<AnalysisResult> {
  const job = await scrapeJob(url);
  return buildAnalysis(job);
}

// Analyze from manually pasted text
export function analyzeFromText(input: {
  title: string;
  company: string;
  description: string;
  salary?: string;
  postedAt?: string;
}): AnalysisResult {
  const job: ScrapedJob = {
    title: input.title,
    company: input.company,
    location: '',
    description: input.description,
    postedAt: input.postedAt || null,
    salary: input.salary || null,
    applicants: null,
    employmentType: null,
    experienceLevel: null,
  };
  return buildAnalysis(job);
}

function buildAnalysis(job: ScrapedJob): AnalysisResult {
  const signals: JobSignals = {
    postedDays: parsePostedDays(job.postedAt),
    hasSalary: !!job.salary,
    descriptionLength: job.description.split(/\s+/).length,
    hasRepostIndicator: false,
    companyName: job.company,
    hasRecentLayoffs: null,
    roleOnCareersPage: null,
    daysSinceApplied: null,
    receivedResponse: null,
  };

  const ghostScore = calculateGhostScore(signals);
  return { job, signals, ghostScore };
}

function parsePostedDays(postedAt: string | null): number | null {
  if (!postedAt) return null;

  const date = new Date(postedAt);
  if (!isNaN(date.getTime())) {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : null;
  }

  const text = postedAt.toLowerCase();
  const dayMatch = text.match(/(\d+)\s+day/);
  if (dayMatch) return parseInt(dayMatch[1], 10);
  const weekMatch = text.match(/(\d+)\s+week/);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7;
  const monthMatch = text.match(/(\d+)\s+month/);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 30;
  if (text.includes('just now') || text.includes('today')) return 0;
  if (text.includes('yesterday')) return 1;

  return null;
}
