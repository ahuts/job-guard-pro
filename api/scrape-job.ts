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
    
    // Parse HTML using regex patterns
    
    // Title - Extract from <title> tag (most reliable)
    // LinkedIn <title> format: "Job Title | Company | LinkedIn" or "Job Title | LinkedIn"
    let title = 'Unknown Title';
    const titleTagMatch = html.match(/\u003ctitle\u003e([\s\S]*?)\u003c\/title\u003e/i);
    if (titleTagMatch) {
      const fullTitle = titleTagMatch[1].trim();
      console.log(`Raw title tag: ${fullTitle}`);
      
      // Split by " | " and take the first part
      const parts = fullTitle.split(/\s*\|\s*/);
      if (parts.length >= 2 && parts[parts.length - 1].toLowerCase().includes('linkedin')) {
        // "Job Title | Company | LinkedIn" - take first part
        title = parts[0].trim();
      } else if (parts.length >= 1) {
        title = parts[0].trim();
      }
    }
    
    // If title tag didn't work, try other patterns
    if (title === 'Unknown Title') {
      const altPatterns = [
        /\u003ch1[^\u003e]*class="[^"]*top-card-layout__title[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/h1\u003e/i,
        /\u003ch1[^\u003e]*class="[^"]*title[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/h1\u003e/i,
        /\u003cmeta[^\u003e]*property="og:title"[^\u003e]*content="([^"]+)"/i,
        /"jobTitle":"([^"]+)"/i,
      ];
      
      for (const pattern of altPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim()) {
          title = match[1].trim();
          break;
        }
      }
    }
    
    console.log(`Final title: ${title}`);
    
    // Company - look for company name patterns
    const companyMatch = html.match(/\u003ca[^\u003e]*href="[^"]*\/company\/[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/a\u003e/i) ||
                        html.match(/"companyName":"([^"]+)"/i) ||
                        html.match(/\u003cspan[^\u003e]*class="[^"]*company[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/span\u003e/i);
    const company = companyMatch ? companyMatch[1].trim() : 'Unknown Company';
    
    // Location - try multiple patterns
    let location = 'Unknown Location';
    const locationPatterns = [
      /\u003cspan[^\u003e]*class="[^"]*location[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/span\u003e/i,
      /"location":"([^"]+)"/i,
      /\u003cspan[^\u003e]*class="[^"]*top-card-layout__metadata-item[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/span\u003e/i,
    ];
    
    for (const pattern of locationPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim()) {
        location = match[1].trim();
        break;
      }
    }
    
    // Description - look for description div
    const descMatch = html.match(/\u003cdiv[^\u003e]*class="[^"]*show-more-less-html[^"]*"[^\u003e]*\u003e([\s\S]*?)\u003c\/div\u003e/i) ||
                     html.match(/\u003cdiv[^\u003e]*class="[^"]*description[^"]*"[^\u003e]*\u003e([\s\S]*?)\u003c\/div\u003e/i);
    let description = '';
    if (descMatch) {
      // Strip HTML tags
      description = descMatch[1]
        .replace(/\u003c[^\u003e]+\u003e/g, ' ')
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

    console.log(`Parsed - Title: ${title}, Company: ${company}, Location: ${location}`);

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
