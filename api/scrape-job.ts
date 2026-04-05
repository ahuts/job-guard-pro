// Vercel Serverless Function: Scrape LinkedIn job posting
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
  rawHtml: string;
}

interface ScrapeResult {
  success: boolean;
  data?: JobData;
  error?: string;
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

  // Validate LinkedIn URL
  if (!url.includes('linkedin.com/jobs') && !url.includes('linkedin.com/job')) {
    return res.status(400).json({ error: 'Only LinkedIn job URLs are supported' });
  }

  let browser;

  try {
    // Launch browser
    browser = await chromium.launch({
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

    // Extract job data
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

      // Job description
      const descriptionEl = document.querySelector('.jobs-description__content');
      data.description = descriptionEl?.textContent?.trim() || '';

      // Posted time (look for text like "1 week ago", "2 days ago")
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

      // Employment type & experience level (from job details)
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

      // Get raw HTML for debugging/analysis
      data.rawHtml = document.body.innerHTML.substring(0, 10000); // Limit size

      return data;
    });

    await browser.close();

    // Validate we got minimum data
    if (!jobData.title || !jobData.company) {
      return res.status(422).json({
        success: false,
        error: 'Could not extract job details. LinkedIn may have changed their layout or requires login.',
      });
    }

    return res.status(200).json({
      success: true,
      data: jobData as JobData,
    });

  } catch (error) {
    console.error('Scraping error:', error);
    
    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
