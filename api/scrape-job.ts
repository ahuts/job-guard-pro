// Vercel Serverless Function: Scrape LinkedIn job posting
// Endpoint: POST /api/scrape-job
// LinkedIn returns HTML - we parse it with regex

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
    console.log(`Fetching job ID: ${jobId}`);
    
    const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.linkedin.com/',
      },
    });
    
    console.log(`LinkedIn response status: ${apiResponse.status}`);

    if (!apiResponse.ok) {
      return res.status(422).json({
        success: false,
        error: `LinkedIn returned status ${apiResponse.status}`,
      });
    }

    const html = await apiResponse.text();
    console.log(`Response length: ${html.length} chars`);
    
    // Parse HTML using regex patterns (LinkedIn job posting HTML structure)
    
    // Title - try multiple patterns
    let title = 'Unknown Title';
    const titlePatterns = [
      /<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
      /<title>([^<]+)<\/title>/i,
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /"jobTitle":"([^"]+)"/i,
    ];
    
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1].trim()) {
        title = match[1].trim();
        // Clean up title (remove "LinkedIn" or "Jobs" suffix if present)
        title = title.replace(/\s*\|\s*LinkedIn$/i, '');
        title = title.replace(/\s*\|\s*Jobs$/i, '');
        title = title.replace(/\s*\|\s*Paylocity$/i, ''); // Remove company from title
        break;
      }
    }
    
    // Company - look for company name patterns
    const companyMatch = html.match(/<a[^>]*href="[^"]*\/company\/[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                        html.match(/"companyName":"([^"]+)"/i) ||
                        html.match(/<span[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/span>/i);
    const company = companyMatch ? companyMatch[1].trim() : 'Unknown Company';
    
    // Location
    const locationMatch = html.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                         html.match(/"location":"([^"]+)"/i) ||
                         html.match(/>([^<]+)\s*,\s*([^<]+)<\/span>/i);
    const location = locationMatch ? locationMatch[1].trim() : 'Unknown Location';
    
    // Description - look for description div
    const descMatch = html.match(/<div[^>]*class="[^"]*show-more-less-html[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    let description = '';
    if (descMatch) {
      // Strip HTML tags
      description = descMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Posted date
    const postedMatch = html.match(/(\d+)\s*(day|week|month|hour)s?\s*ago/i) ||
                       html.match(/(Yesterday|Just now|Today)/i);
    const postedAt = postedMatch ? postedMatch[0] : null;
    
    // Employment type / Seniority
    const empTypeMatch = html.match(/(Full-time|Part-time|Contract|Internship)/i);
    const employmentType = empTypeMatch ? empTypeMatch[1] : null;
    
    const expLevelMatch = html.match(/(Entry level|Associate|Mid-Senior level|Director|Executive)/i);
    const experienceLevel = expLevelMatch ? expLevelMatch[1] : null;
    
    // Applicants
    const applicantsMatch = html.match(/(\d+)\s*applicants/i);
    const applicants = applicantsMatch ? applicantsMatch[1] : null;

    console.log(`Parsed - Title: ${title}, Company: ${company}`);

    // Check if we got meaningful data
    if (title === 'Unknown Title' && company === 'Unknown Company') {
      return res.status(422).json({
        success: false,
        error: 'Could not extract job details from LinkedIn HTML. The page structure may have changed.',
        debug: html.substring(0, 500), // First 500 chars for debugging
      });
    }

    const jobData: JobData = {
      title,
      company,
      location,
      description,
      postedAt,
      salary: null,
      applicants,
      employmentType,
      experienceLevel,
      url,
    };

    return res.status(200).json({
      success: true,
      data: jobData,
      source: 'linkedin_html_parsed',
    });

  } catch (error) {
    console.error('Scraping error:', error);
    console.error('Error details:', error instanceof Error ? error.stack : 'No stack');
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
