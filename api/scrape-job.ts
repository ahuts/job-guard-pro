// Vercel Serverless Function: Scrape LinkedIn job posting
// Endpoint: POST /api/scrape-job
// LinkedIn returns HTML - we parse it with regex

import type { VercelRequest, VercelResponse } from './scan';

interface JobData {
  employerUrl?: string;
  requisitionId?: string;
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
  applicationUrl: string | null;
  companyLinkedInUrl: string | null;
  reposted: boolean;
  promoted: boolean;
  activelyReviewing: boolean;
  applicationMethod: "linkedin_easy_apply" | "linkedin_apply" | "external_apply" | "unknown";
  descriptionCoverage: "partial" | "unavailable";
}

export function linkedInJobId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(parsed.hostname)) return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length !== 3 || segments[0] !== 'jobs' || segments[1] !== 'view') return null;
    return segments[2].match(/(?:^|-)(\d+)$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = (req.body ?? {}) as { url?: string };

  if (typeof url !== 'string' || !url || url.length > 2048) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const jobId = linkedInJobId(url);
  if (!jobId) {
    return res.status(400).json({ 
      error: 'Invalid LinkedIn job URL. Use a linkedin.com/jobs/view/ posting link.'
    });
  }

  try {
    
    const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
    
    const apiResponse = await fetch(apiUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.linkedin.com/',
      },
    });
    

    if (!apiResponse.ok) {
      return res.status(422).json({
        success: false,
        error: `LinkedIn returned status ${apiResponse.status}`,
      });
    }

    const html = await apiResponse.text();
    
    // Parse HTML using regex patterns
    
    // Title - Extract from visible content in the card
    let title = 'Unknown Title';
    
    // Try the specific class pattern from browser inspection
    const cardTitleMatch = html.match(/class="[^"]*_9a287b82[^"]*"[^\u003e]*\u003e([^\u003c]+)/i);
    if (cardTitleMatch) {
      title = cardTitleMatch[1].trim();
    }
    
    // Try any element with job title keywords
    if (title === 'Unknown Title') {
      const jobTitlePatterns = [
        /\u003cp[^\u003e]*class="[^"]*_9a287b82[^"]*"[^\u003e]*\u003e([^\u003c]+)/i,
        /\u003ch1[^\u003e]*class="[^"]*top-card-layout[^"]*"[^\u003e]*\u003e([^\u003c]+)/i,
        /\u003cspan[^\u003e]*class="[^"]*job-title[^"]*"[^\u003e]*\u003e([^\u003c]+)/i,
        /"title":"([^"]*(?:Director|Manager|Engineer|Analyst|Specialist|Coordinator|Assistant|Associate|Representative|Technician|Developer|Designer|Consultant|Supervisor|Lead)[^"]*)"/i,
      ];
      
      for (const pattern of jobTitlePatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 5) {
          title = match[1].trim();
          break;
        }
      }
    }
    
    // Last resort: Try to find title in card structure or data attributes
    if (title === 'Unknown Title') {
      // Look for h1, h2, h3 in the card with ANY reasonable text
      const headingMatch = html.match(/\u003ch[123][^\u003e]*\u003e([^\u003c]{10,100}?)\u003c\/h[123]\u003e/i);
      if (headingMatch) {
        const possibleTitle = headingMatch[1].trim();
        // Accept if it looks like a job title (reasonable length, not URL junk)
        if (possibleTitle.length > 10 && possibleTitle.length < 100 && 
            !possibleTitle.includes('?trk=') && 
            !possibleTitle.includes('http')) {
          title = possibleTitle;
        }
      }
    }
    
    // Try data attributes
    if (title === 'Unknown Title') {
      const dataTitleMatch = html.match(/data-job-title="([^"]+)"/i) || 
                            html.match(/aria-label="([^"]+Job[^"]*)"/i);
      if (dataTitleMatch) {
        title = dataTitleMatch[1].trim();
      }
    }
    
    // SUPER last resort: Extract from URL or link text containing job keywords
    if (title === 'Unknown Title') {
      // Look for link text with job title pattern
      const linkTextMatch = html.match(/\u003ca[^\u003e]*href="[^"]*jobs[^"]*"[^\u003e]*\u003e([^\u003c]{10,80}?)\u003c\/a\u003e/i);
      if (linkTextMatch) {
        const linkText = linkTextMatch[1].trim();
        if (/director|manager|engineer|analyst/i.test(linkText) && !linkText.includes('?') && !linkText.includes('http')) {
          title = linkText;
        }
      }
    }
    
    // If still unknown, try visible content patterns
    if (title === 'Unknown Title') {
      // Try the specific class pattern you found
      const visibleTitleMatch = html.match(/class="[^"]*_9a287b82[^"]*"[^\u003e]*\u003e([^\u003c]+)/i);
      if (visibleTitleMatch) {
        title = visibleTitleMatch[1].trim();
      } else {
        // Try h1
        const h1Match = html.match(/\u003ch1[^\u003e]*\u003e([^\u003c]+)\u003c\/h1\u003e/i);
        if (h1Match) {
          title = h1Match[1].trim();
        }
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
    
    // Company - look for company name patterns
    const companyMatch = html.match(/\u003ca[^\u003e]*href="[^"]*\/company\/[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/a\u003e/i) ||
                        html.match(/"companyName":"([^"]+)"/i) ||
                        html.match(/\u003cspan[^\u003e]*class="[^"]*company[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/span\u003e/i);
    const company = companyMatch ? companyMatch[1].trim() : 'Unknown Company';
    const companyHrefMatch = html.match(/href="([^"]*\/company\/[^"]+)"/i);
    const companyLinkedInUrl = companyHrefMatch
      ? new URL(companyHrefMatch[1].replace(/&amp;/g, '&'), 'https://www.linkedin.com').toString()
      : null;

    // Prefer the public external application destination. This is the source the
    // Trust Meter uses for exact employer/ATS verification, not a guessed domain.
    const applicationMatch = html.match(/"(?:companyApplyUrl|applyUrl|jobApplyUrl)":"([^"]+)"/i) ||
      html.match(/href="(https?:\/\/[^"]*(?:greenhouse\.io|lever\.co|ashbyhq\.com)[^"]*)"/i);
    const { links: sourceLinks } = await import('../src/server/employerResolver.js');
    const candidates = sourceLinks(html, 'https://www.linkedin.com');
    const externalApply = candidates.find(l => /apply/i.test(l.label) && !/(^|\.)linkedin\.com$/.test(new URL(l.url).hostname));
    const employerUrl = candidates.find(l => /company website|visit website|careers/i.test(l.label) && !/(^|\.)linkedin\.com$/.test(new URL(l.url).hostname))?.url;
    const applicationUrl = applicationMatch ? applicationMatch[1].replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : externalApply?.url ?? null;
    const reposted = /\breposted\b/i.test(html);
    const promoted = /promoted by hirer/i.test(html);
    const activelyReviewing = /actively reviewing applicants/i.test(html);
    
    // Location - try multiple patterns
    let location = 'Unknown Location';
    
    // Try location in various HTML patterns
    const locPatterns = [
      /\u003cspan[^\u003e]*class="[^"]*location[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/span\u003e/i,
      /"location":"([^"]+)"/i,
      /"jobLocation":\s*{[^}]*"name":\s*"([^"]+)"/i,
      /\u003cspan[^\u003e]*class="[^"]*top-card-layout__metadata-item[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/span\u003e/g,
    ];
    
    for (let i = 0; i < locPatterns.length; i++) {
      const match = html.match(locPatterns[i]);
      if (match && match[1] && match[1].trim()) {
        location = match[1].trim();
        break;
      }
    }
    
    // Try JSON-LD for location
    if (location === 'Unknown Location') {
      const jsonLdMatch = html.match(/\u003cscript type="application\/ld\+json"\u003e([\s\S]*?)\u003c\/script\u003e/);
      if (jsonLdMatch) {
        try {
          const jsonData = JSON.parse(jsonLdMatch[1]);
          if (jsonData.jobLocation?.address?.addressLocality) {
            location = jsonData.jobLocation.address.addressLocality;
            if (jsonData.jobLocation.address.addressRegion) {
              location += `, ${jsonData.jobLocation.address.addressRegion}`;
            }
          } else if (jsonData.jobLocation?.name) {
            location = jsonData.jobLocation.name;
          }
        } catch (e) {
          // JSON parse failed
        }
      }
    }
    
    // Try headings or other elements for location
    if (location === 'Unknown Location') {
      const locHeadingMatch = html.match(/\u003c[hH][34][^\u003e]*\u003e([^\u003c]*Remote[^\u003c]*)\u003c\/h[34]\u003e/i) ||
                             html.match(/\u003c[hH][34][^\u003e]*\u003e([^\u003c]*Hybrid[^\u003c]*)\u003c\/h[34]\u003e/i) ||
                             html.match(/\u003c[hH][34][^\u003e]*\u003e([^\u003c]*On-site[^\u003c]*)\u003c\/h[34]\u003e/i);
      if (locHeadingMatch) {
        location = locHeadingMatch[1].trim();
      }
    }
    
    // Look for "Remote" or city names in text
    if (location === 'Unknown Location') {
      const remoteMatch = html.match(/\u003e(Remote|Hybrid|On-site)\u003c/i);
      if (remoteMatch) {
        location = remoteMatch[1].trim();
      }
    }
    
    // Try broader search for location indicators in the HTML
    if (location === 'Unknown Location') {
      // Look for "Location" or "location" in class names followed by content
      const locClassMatch = html.match(/class="[^"]*(?:location|Location)[^"]*"[^\u003e]*\u003e([^\u003c]+)/i);
      if (locClassMatch) {
        location = locClassMatch[1].trim();
      }
    }
    
    // Look for LinkedIn's specific location class pattern
    if (location === 'Unknown Location') {
      // Pattern for: <span class="tvm__text..."><!---->Lenexa, KS<!----></span>
      const linkedInLocMatch = html.match(/class="[^"]*tvm__text[^"]*"[^\u003e]*\u003e(?:\u003c!--.*?--\u003e)?([^\u003c,]+,\s*[A-Z]{2})(?:\u003c!--.*?--\u003e)?\u003c\/span\u003e/i);
      if (linkedInLocMatch) {
        location = linkedInLocMatch[1].trim();
      }
    }
    
    // Try another pattern - any span with city, state format
    if (location === 'Unknown Location') {
      const cityStateSpanMatch = html.match(/\u003cspan[^\u003e]*\u003e(?:\u003c!--.*?--\u003e)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})\u003c/i);
      if (cityStateSpanMatch) {
        location = cityStateSpanMatch[1].trim();
      }
    }
    
    // Look for any span or div containing location-like text
    if (location === 'Unknown Location') {
      const locElementMatch = html.match(/\u003c(?:span|div|p)[^\u003e]*\u003e([^\u003c]{5,50}(?:United States|USA?|Canada|UK|Remote|Hybrid|\d{5}|[A-Z]{2})[^\u003c]*)\u003c\/\u003c(?:span|div|p)\u003e/i);
      if (locElementMatch) {
        location = locElementMatch[1].trim();
      }
    }
    
    // Look for City, State pattern (e.g., "Chicago, IL" or "New York, NY")
    if (location === 'Unknown Location') {
      const cityStateMatch = html.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),?\s*[A-Z]{2}\s+\d{5}/);
      if (cityStateMatch) {
        location = cityStateMatch[0].trim();
      }
    }
    
    // Look for common US cities
    if (location === 'Unknown Location') {
      const cityMatch = html.match(/\u003e(Chicago|New York|San Francisco|Los Angeles|Austin|Seattle|Boston|Denver|Miami|Atlanta|Dallas|Houston|Phoenix|Philadelphia|Portland|San Diego|San Jose|Nashville|Detroit|Minneapolis|Raleigh|Charlotte|Indianapolis|Columbus|Kansas City|St\. Louis|Cleveland|Cincinnati|Pittsburgh|Baltimore|Washington|Virginia Beach|Richmond|Milwaukee|Madison|Salt Lake City|Boise|Spokane|Albuquerque|Oklahoma City|New Orleans|Memphis|Louisville|Birmingham|Jacksonville|Tampa|Orlando)\u003c/i);
      if (cityMatch) {
        location = cityMatch[1].trim();
      }
    }
    
    // Description - look for description div
    const descMatch = html.match(/\u003cdiv[^\u003e]*class="[^"]*show-more-less-html[^"]*"[^\u003e]*\u003e([\s\S]*?)\u003c\/div\u003e/i) ||
                     html.match(/\u003cdiv[^\u003e]*class="[^"]*description[^"]*"[^\u003e]*\u003e([\s\S]*?)\u003c\/div\u003e/i);
    let description = '';
    if (descMatch) {
      // Strip HTML tags
      description = descMatch[1]
        .replace(/<\/(?:p|li|div)>|<br\s*\/?>/gi, '\n')
        .replace(/\u003c[^\u003e]+\u003e/g, ' ')
        .replace(/[\t ]+/g, ' ')
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
    const applicationMethod = /easy apply/i.test(html)
      ? "linkedin_easy_apply"
      : applicationUrl
        ? "external_apply"
        : /\bapply\b/i.test(html)
          ? "linkedin_apply"
          : "unknown";


    const jobData: JobData = {
      employerUrl,
      requisitionId: description.match(/(?:requisition|job)\s*(?:id|number|#)\s*[:#]?\s*([a-z0-9][a-z0-9_-]{2,80})/i)?.[1],
      title,
      company,
      location,
      description,
      postedAt,
      salary: null,
      applicants,
      employmentType,
      experienceLevel,
      url: `https://www.linkedin.com/jobs/view/${jobId}/`,
      applicationUrl,
      companyLinkedInUrl,
      reposted,
      promoted,
      activelyReviewing,
      applicationMethod,
      descriptionCoverage: description ? "partial" : "unavailable",
    };

    console.info('ghostjob_extraction', { status: 'completed', descriptionCharacters: description.length });
    return res.status(200).json({
      success: true,
      data: jobData,
      source: 'linkedin_html_parsed',
    });

  } catch (error) {
    console.info('ghostjob_extraction', { status: 'unavailable' });
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
