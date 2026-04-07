// Vercel Serverless Function: Scrape LinkedIn job posting
// Endpoint: POST /api/scrape-job

import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const linkedInMatch = url.match(/linkedin\.com\/jobs\/view\/(\d+)/);
  if (!linkedInMatch) {
    return res.status(400).json({ 
      error: 'Invalid LinkedIn URL. Must be in format: linkedin.com/jobs/view/{job_id}' 
    });
  }

  const jobId = linkedInMatch[1];

  try {
    const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.linkedin.com/',
      },
    });

    if (apiResponse.ok) {
      const contentType = apiResponse.headers.get('content-type');
      const responseText = await apiResponse.text();
      
      // Try to parse as JSON first
      if (contentType && contentType.includes('application/json')) {
        try {
          const apiData: LinkedInGuestApiResponse = JSON.parse(responseText);
          
          if (apiData.jobPosting) {
            // ... existing job data extraction code ...
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

            // Format posted date
            if (jobData.postedAt) {
              const postedDate = new Date(jobData.postedAt);
              const now = new Date();
              const diffTime = Math.abs(now.getTime() - postedDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays === 0) jobData.postedAt = 'Today';
              else if (diffDays === 1) jobData.postedAt = 'Yesterday';
              else if (diffDays < 7) jobData.postedAt = `${diffDays} days ago`;
              else if (diffDays < 30) jobData.postedAt = `${Math.floor(diffDays / 7)} weeks ago`;
              else jobData.postedAt = `${Math.floor(diffDays / 30)} months ago`;
            }

            return res.status(200).json({
              success: true,
              data: jobData,
              source: 'linkedin_guest_api',
            });
          }
        } catch (e) {
          // JSON parse failed, continue to HTML extraction
        }
      }
      
      // If JSON failed, try extracting from HTML (LinkedIn sometimes returns HTML)
      const titleMatch = responseText.match(/<h1[^>]*>([^<]+)<\/h1>/);
      const companyMatch = responseText.match(/"companyName":"([^"]+)"/);
      const locationMatch = responseText.match(/"location":"([^"]+)"/);
      const descMatch = responseText.match(/"description":\{"text":"([^"]+)"/);
      
      if (titleMatch || companyMatch) {
        const jobData: JobData = {
          title: titleMatch?.[1]?.trim() || companyMatch?.[1] || 'Unknown Title',
          company: companyMatch?.[1] || 'Unknown Company',
          location: locationMatch?.[1] || 'Unknown Location',
          description: descMatch?.[1]?.replace(/\\n/g, '\n') || '',
          postedAt: null,
          salary: null,
          applicants: null,
          employmentType: null,
          experienceLevel: null,
          url: url,
        };
        
        return res.status(200).json({
          success: true,
          data: jobData,
          source: 'linkedin_html_extraction',
        });
      }
    }

    return res.status(422).json({
      success: false,
      error: 'Could not fetch job details from LinkedIn.',
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
