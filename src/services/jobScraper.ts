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
    signals: { name: string; weight: number; triggered: boolean; description: string; }[];
    summary: string;
  };
}

// Scrape job from LinkedIn URL
export async function scrapeJob(url: string): Promise<ScrapedJob> {
  // In production, this would call the Vercel serverless function
  // For now, we'll simulate or call a local endpoint
  
  const response = await fetch('/api/scrape-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to scrape job');
  }

  const result = await response.json();
  return result.data;
}

// Analyze job and calculate ghost score
export async function analyzeJob(url: string): Promise<AnalysisResult> {
  // Scrape the job
  const job = await scrapeJob(url);

  // Convert scraped data to signals
  const signals: JobSignals = {
    postedDays: parsePostedDays(job.postedAt),
    hasSalary: !!job.salary,
    descriptionLength: job.description.split(/\s+/).length,
    hasRepostIndicator: false, // Would need to check page for "reposted" badge
    companyName: job.company,
    hasRecentLayoffs: null, // Requires external API check
    roleOnCareersPage: null, // Requires external scrape
    daysSinceApplied: null,
    receivedResponse: null,
  };

  // Calculate ghost score
  const ghostScore = calculateGhostScore(signals);

  return {
    job,
    signals,
    ghostScore,
  };
}

// Save job to user's history
export async function saveJob(userId: string, url: string, analysis: AnalysisResult) {
  const { data, error } = await supabase
    .from('saved_jobs')
    .insert({
      user_id: userId,
      url,
      title: analysis.job.title,
      company: analysis.job.company,
      location: analysis.job.location,
      ghost_score: analysis.ghostScore.score,
      rating: analysis.ghostScore.rating,
      signals: analysis.ghostScore.signals,
      status: 'saved',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get user's saved jobs
export async function getSavedJobs(userId: string) {
  const { data, error } = await supabase
    .from('saved_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Update job status (applied, interviewing, etc.)
export async function updateJobStatus(jobId: string, status: string, notes?: string) {
  const { data, error } = await supabase
    .from('saved_jobs')
    .update({ status, notes, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper to parse "2 days ago" to number
function parsePostedDays(postedAt: string | null): number | null {
  if (!postedAt) return null;
  
  const text = postedAt.toLowerCase();
  
  // Match patterns
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

// Mock scraper for development (when API isn't ready)
export async function mockScrapeJob(url: string): Promise<ScrapedJob> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Extract job ID from URL for deterministic mock data
  const jobId = url.split('view/')[1]?.split('?')[0] || 'mock123';
  const hash = jobId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  const companies = ['TechCorp', 'DataSystems Inc', 'InnovateLabs', 'CloudFirst', 'AI Startup'];
  const titles = ['Senior Software Engineer', 'Product Manager', 'Data Analyst', 'Frontend Developer', 'DevOps Engineer'];
  
  const company = companies[hash % companies.length];
  const title = titles[hash % titles.length];
  
  return {
    title,
    company,
    location: hash % 3 === 0 ? 'San Francisco, CA' : hash % 3 === 1 ? 'New York, NY' : 'Remote',
    description: `We are looking for a ${title} to join our growing team. You will be responsible for building scalable solutions and working with cutting-edge technology.\n\nRequirements:\n- 3+ years experience\n- Strong communication skills\n- Bachelor's degree or equivalent\n\nBenefits:\n- Competitive salary\n- Health insurance\n- Unlimited PTO\n- Remote work options`,
    postedAt: hash % 5 === 0 ? '2 days ago' : hash % 5 === 1 ? '1 week ago' : hash % 5 === 2 ? '3 weeks ago' : '1 month ago',
    salary: hash % 2 === 0 ? '$120,000 - $160,000' : null,
    applicants: `${(hash % 50) + 10} applicants`,
    employmentType: 'Full-time',
    experienceLevel: hash % 3 === 0 ? 'Senior' : hash % 3 === 1 ? 'Mid-level' : 'Entry-level',
  };
}
