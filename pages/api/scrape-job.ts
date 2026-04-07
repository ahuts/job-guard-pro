// Next.js API Route: Scrape LinkedIn job posting using Guest API
// Endpoint: POST /api/scrape-job

import type { NextApiRequest, NextApiResponse } from 'next';

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
    companyName?: string;
  };
  company?: {
    name?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
      },
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
          salary: null,
          applicants: null,
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

    // If we get here, the guest API failed
    return res.status(422).json({
      success: false,
      error: 'Could not fetch job details from LinkedIn. The job may no longer be available or LinkedIn may be blocking the request.',
    });

  } catch (error) {
    console.error('Scraping error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
