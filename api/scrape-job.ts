// Vercel Serverless Function: Scrape LinkedIn job posting using Guest API
// Endpoint: POST /api/scrape-job
// Body: { url: string }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chromium } from 'playwright';

interface JobData {
  title: string;
  company: string;
  location: string;
  description: string;
  postedAt: string | null;
  salary: string | null;
  applicants: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  url: string;
}

interface LinkedInGuestApiResponse {
  jobPosting?: {
    title?: string;
    description?: {
      text?: string;
    };
    employmentType?: string;
    experienceLevel?: string;
    location?: string;
    originalListedAt?: string;
    listedAt?: string;
    workRemoteAllowed?: boolean;
    salaryInsights?: string;
    applyUrl?: string;
    companyName?: string;
    companyId?: string;
  };
  company?: {
    name?: string;
    description?: string;
    staffCountRange?: string;
    followerCount?: number;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate LinkedIn URL and extract job ID
  const linkedInMatch = url.match(/linkedin\.com\/jobs\/view\/(\d+)/);
  if (!linkedInMatch) {
    return res.status(400).json({ 
      error: 'Invalid LinkedIn URL. Must be in format: linkedin.com/jobs/view/{job_id}' 
    });
  }

  const jobId = linkedInMatch[1];

  try {
    // METHOD 1: Try LinkedIn Guest API first (fast, no browser needed)
    const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      timeout: 15000,
    });

    if (apiResponse.ok) {
      const apiData: LinkedInGuestApiResponse = await apiResponse.json();
      
      if (apiData.jobPosting) {
        const jobData: JobData = {
          title: apiData.jobPosting.title || 'Unknown Title',
          company: apiData.company?.name || apiData.jobPosting.companyName || 'Unknown Company',
          location: apiData.jobPosting.location || 'Unknown Location',
          description: apiData.jobPosting.description?.text || '',
          postedAt: apiData.jobPosting.originalListedAt || apiData.jobPosting.listedAt || null,
          salary: apiData.jobPosting.salaryInsights || null,
          applicants: null, // Guest API doesn't provide this
          employmentType: apiData.jobPosting.employmentType || null,
          experienceLevel: apiData.jobPosting.experienceLevel || null,
          url: url,
        };

        // Calculate days since posted
        if (jobData.postedAt) {
          const postedDate = new Date(jobData.postedAt);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - postedDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            jobData.postedAt = 'Today';
          } else if (diffDays === 1) {
            jobData.postedAt = 'Yesterday';
          } else if (diffDays < 7) {
            jobData.postedAt = `${diffDays} days ago`;
          } else if (diffDays < 30) {
            jobData.postedAt = `${Math.floor(diffDays / 7)} weeks ago`;
          } else {
            jobData.postedAt = `${Math.floor(diffDays / 30)} months ago`;
          }
        }

        return res.status(200).json({
          success: true,
          data: jobData,
          source: 'linkedin_guest_api',
        });
      }
    }

    // METHOD 2: Fallback to Playwright if Guest API fails
    console.log('Guest API failed or returned no data, falling back to Playwright...');
    
    const browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // Navigate to job page
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for job content to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Extract job data using Playwright
    const jobData = await page.evaluate(() => {
      const data: Partial<JobData> = {};

      // Job title
      const titleEl = document.querySelector('h1');
      data.title = titleEl?.textContent?.trim() || '';

      // Company name
      const companyEl = document.querySelector('a[href*="/company/"]');
      data.company = companyEl?.textContent?.trim() || '';

      // Location
      const locationEl = document.querySelector('.jobs-unified-top-card__bullet');
      data.location = locationEl?.textContent?.trim() || '';

      // Job description - try multiple selectors
      const descriptionSelectors = [
        '.jobs-description__content',
        '.description__text',
        '[data-test-id="job-description"]',
        '.show-more-less-text'
      ];
      
      for (const selector of descriptionSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent) {
          data.description = el.textContent.trim();
          break;
        }
      }

      // Posted time
      const postedEl = document.querySelector('.jobs-unified-top-card__subtitle-secondary-grouping');
      const postedText = postedEl?.textContent || '';
      const postedMatch = postedText.match(/(\d+\s+(day|week|month|hour)s?\s+ago)/i);
      data.postedAt = postedMatch ? postedMatch[1] : null;

      // Salary
      const salaryEl = document.querySelector('.jobs-unified-top-card__job-insight-text');
      const salaryText = salaryEl?.textContent || '';
      data.salary = salaryText.includes('$') || salaryText.toLowerCase().includes('salary') 
        ? salaryText.trim() 
        : null;

      // Applicant count
      const applicantEl = document.querySelector('.jobs-unified-top-card__applicant-count');
      data.applicants = applicantEl?.textContent?.trim() || null;

      // Employment type & experience level
      const details = document.querySelectorAll('.jobs-unified-top-card__job-insight');
      details.forEach((detail) => {
        const text = detail.textContent?.toLowerCase() || '';
        if (text.includes('full-time') || text.includes('part-time') || text.includes('contract')) {
          data.employmentType = detail.textContent?.trim() || null;
        }
        if (text.includes('entry') || text.includes('mid') || text.includes('senior') || text.includes('executive')) {
          data.experienceLevel = detail.textContent?.trim() || null;
        }
      });

      return data;
    });

    await browser.close();

    // Validate we got minimum data
    if (!jobData.title || !jobData.company) {
      return res.status(422).json({
        success: false,
        error: 'Could not extract job details from page. LinkedIn may require login or have anti-bot protection active.',
      });
    }

    // Complete the job data object
    const completeJobData: JobData = {
      title: jobData.title,
      company: jobData.company,
      location: jobData.location || 'Unknown Location',
      description: jobData.description || '',
      postedAt: jobData.postedAt,
      salary: jobData.salary,
      applicants: jobData.applicants,
      employmentType: jobData.employmentType,
      experienceLevel: jobData.experienceLevel,
      url: url,
    };

    return res.status(200).json({
      success: true,
      data: completeJobData,
      source: 'playwright_fallback',
    });

  } catch (error) {
    console.error('Scraping error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
