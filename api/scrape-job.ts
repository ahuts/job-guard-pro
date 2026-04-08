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
    
    // DEBUG: Check for title in various ways
    console.log('Looking for title tag...');
    console.log('Has <title>:', html.includes('<title>'));
    console.log('Has <TITLE>:', html.includes('<TITLE>'));
    console.log('Has Title:', html.includes('Title'));
    
    // Try multiple regex approaches
    const titleRegex1 = html.match(/\u003ctitle\u003e([\s\S]*?)\u003c\/title\u003e/i);
    const titleRegex2 = html.match(/\u003cTITLE\u003e([\s\S]*?)\u003c\/TITLE\u003e/i);
    const titleRegex3 = html.match(/title\u003e([^\u003c]+)/i);
    
    console.log('Regex1 result:', titleRegex1 ? titleRegex1[1].substring(0, 100) : 'null');
    console.log('Regex2 result:', titleRegex2 ? titleRegex2[1].substring(0, 100) : 'null');
    console.log('Regex3 result:', titleRegex3 ? titleRegex3[1].substring(0, 100) : 'null');
    
    // Sample of HTML around where title should be
    const titleIndex = html.toLowerCase().indexOf('<title>');
    if (titleIndex > -1) {
      console.log('HTML around title:', html.substring(titleIndex, titleIndex + 200));
    } else {
      console.log('No <title> found in HTML at all');
      console.log('HTML start:', html.substring(0, 500));
    }
    
    // Parse HTML using regex patterns
    
    // Title - Extract from visible content in the card
    let title = 'Unknown Title';
    
    // Try the specific class pattern from browser inspection
    const cardTitleMatch = html.match(/class="[^"]*_9a287b82[^"]*"[^\u003e]*\u003e([^\u003c]+)/i);
    if (cardTitleMatch) {
      title = cardTitleMatch[1].trim();
      console.log(`Title from card class: ${title}`);
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
          console.log(`Title from pattern: ${title}`);
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
          console.log(`Title from heading: ${title}`);
        }
      }
    }
    
    // Try data attributes
    if (title === 'Unknown Title') {
      const dataTitleMatch = html.match(/data-job-title="([^"]+)"/i) || 
                            html.match(/aria-label="([^"]+Job[^"]*)"/i);
      if (dataTitleMatch) {
        title = dataTitleMatch[1].trim();
        console.log(`Title from data attribute: ${title}`);
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
          console.log(`Title from link text: ${title}`);
        }
      }
    }
    
    // If still unknown, try visible content patterns
    if (title === 'Unknown Title') {
      // Try the specific class pattern you found
      const visibleTitleMatch = html.match(/class="[^"]*_9a287b82[^"]*"[^\u003e]*\u003e([^\u003c]+)/i);
      if (visibleTitleMatch) {
        title = visibleTitleMatch[1].trim();
        console.log(`Title from visible content: ${title}`);
      } else {
        // Try h1
        const h1Match = html.match(/\u003ch1[^\u003e]*\u003e([^\u003c]+)\u003c\/h1\u003e/i);
        if (h1Match) {
          title = h1Match[1].trim();
          console.log(`Title from h1: ${title}`);
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
    
    console.log(`Final title: ${title}`);
    
    // Company - look for company name patterns
    const companyMatch = html.match(/\u003ca[^\u003e]*href="[^"]*\/company\/[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/a\u003e/i) ||
                        html.match(/"companyName":"([^"]+)"/i) ||
                        html.match(/\u003cspan[^\u003e]*class="[^"]*company[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/span\u003e/i);
    const company = companyMatch ? companyMatch[1].trim() : 'Unknown Company';
    
    // Location - try multiple patterns
    let location = 'Unknown Location';
    
    // Try location in various HTML patterns
    const locPatterns = [
      /\u003cspan[^\u003e]*class="[^"]*location[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/span\u003e/i,
      /"location":"([^"]+)"/i,
      /"jobLocation":\s*{[^}]*"name":\s*"([^"]+)"/i,
      /\u003cspan[^\u003e]*class="[^"]*top-card-layout__metadata-item[^"]*"[^\u003e]*\u003e([^\u003c]+)\u003c\/span\u003e/g,
    ];
    
    for (const pattern of locPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim()) {
        location = match[1].trim();
        console.log(`Location from pattern: ${location}`);
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
        console.log(`Location from heading: ${location}`);
      }
    }
    
    // Look for "Remote" or city names in text
    if (location === 'Unknown Location') {
      const remoteMatch = html.match(/\u003e(Remote|Hybrid|On-site)\u003c/i);
      if (remoteMatch) {
        location = remoteMatch[1].trim();
        console.log(`Location from text: ${location}`);
      }
    }
    
    // Try broader search for location indicators in the HTML
    if (location === 'Unknown Location') {
      // Look for "Location" or "location" in class names followed by content
      const locClassMatch = html.match(/class="[^"]*(?:location|Location)[^"]*"[^\u003e]*\u003e([^\u003c]+)/i);
      if (locClassMatch) {
        location = locClassMatch[1].trim();
        console.log(`Location from class: ${location}`);
      }
    }
    
    // Look for LinkedIn's specific location class pattern
    if (location === 'Unknown Location') {
      const linkedInLocMatch = html.match(/class="[^"]*tvm__text[^"]*"[^\u003e]*\u003e[^\u003c]*([^\u003c]{3,50}[^\u003c]*)\u003c\/span\u003e/i);
      if (linkedInLocMatch) {
        const possibleLoc = linkedInLocMatch[1].trim();
        // Validate it looks like a location (contains comma or common location words)
        if (possibleLoc.includes(',') || /remote|hybrid|united states|canada/i.test(possibleLoc)) {
          location = possibleLoc;
          console.log(`Location from LinkedIn pattern: ${location}`);
        }
      }
    }
    
    // Look for any span or div containing location-like text
    if (location === 'Unknown Location') {
      const locElementMatch = html.match(/\u003c(?:span|div|p)[^\u003e]*\u003e([^\u003c]{5,50}(?:United States|USA?|Canada|UK|Remote|Hybrid|\d{5}|[A-Z]{2})[^\u003c]*)\u003c\/\u003c(?:span|div|p)\u003e/i);
      if (locElementMatch) {
        location = locElementMatch[1].trim();
        console.log(`Location from element: ${location}`);
      }
    }
    
    // Look for City, State pattern (e.g., "Chicago, IL" or "New York, NY")
    if (location === 'Unknown Location') {
      const cityStateMatch = html.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),?\s*[A-Z]{2}\s+\d{5}/);
      if (cityStateMatch) {
        location = cityStateMatch[0].trim();
        console.log(`Location from city/state: ${location}`);
      }
    }
    
    // Look for common US cities
    if (location === 'Unknown Location') {
      const cityMatch = html.match(/\u003e(Chicago|New York|San Francisco|Los Angeles|Austin|Seattle|Boston|Denver|Miami|Atlanta|Dallas|Houston|Phoenix|Philadelphia|Portland|San Diego|San Jose|Nashville|Detroit|Minneapolis|Raleigh|Charlotte|Indianapolis|Columbus|Kansas City|St\. Louis|Cleveland|Cincinnati|Pittsburgh|Baltimore|Washington|Virginia Beach|Richmond|Milwaukee|Madison|Salt Lake City|Boise|Spokane|Albuquerque|Oklahoma City|New Orleans|Memphis|Louisville|Birmingham|Jacksonville|Tampa|Orlando)\u003c/i);
      if (cityMatch) {
        location = cityMatch[1].trim();
        console.log(`Location from city name: ${location}`);
      }
    }
    
    console.log(`Final location: ${location}`);
    
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
