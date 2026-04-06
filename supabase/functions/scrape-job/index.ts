const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!url.includes('linkedin.com/jobs') && !url.includes('linkedin.com/job')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only LinkedIn job URLs are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping URL:', url);

    // Extract job ID from URL
    const jobIdMatch = url.match(/\/view\/(\d+)/);
    const jobId = jobIdMatch ? jobIdMatch[1] : null;

    // Try multiple LinkedIn endpoints
    const urls = jobId 
      ? [
          `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`,
          `https://www.linkedin.com/jobs/view/${jobId}/`,
          url,
        ]
      : [url];

    let html = '';
    let fetchSuccess = false;

    for (const fetchUrl of urls) {
      console.log('Trying:', fetchUrl);
      try {
        const response = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
          redirect: 'follow',
        });

        console.log('Status:', response.status, 'for', fetchUrl);

        if (response.ok) {
          html = await response.text();
          console.log('Got HTML, length:', html.length);
          fetchSuccess = true;
          break;
        } else {
          const body = await response.text();
          console.log('Failed body preview:', body.substring(0, 200));
        }
      } catch (e) {
        console.error('Fetch error for', fetchUrl, ':', e);
      }
    }

    if (!fetchSuccess) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not fetch job listing. It may have been removed or requires login.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    // Extract job data from HTML using regex patterns for LinkedIn's public job pages
    const title = extractMeta(html, 'og:title') || extractTag(html, 'h1') || '';
    const description = extractMeta(html, 'og:description') || '';
    
    // LinkedIn public job pages have structured data in JSON-LD
    const jsonLd = extractJsonLd(html);
    
    let jobData: Record<string, unknown> = {
      title: '',
      company: '',
      location: '',
      description: '',
      postedAt: null,
      salary: null,
      applicants: null,
      employmentType: null,
      experienceLevel: null,
    };

    if (jsonLd) {
      jobData.title = jsonLd.title || title;
      jobData.company = jsonLd.hiringOrganization?.name || '';
      jobData.location = jsonLd.jobLocation?.address?.addressLocality 
        ? `${jsonLd.jobLocation.address.addressLocality}, ${jsonLd.jobLocation.address.addressRegion || ''}`
        : '';
      jobData.description = jsonLd.description || description;
      jobData.employmentType = jsonLd.employmentType || null;
      jobData.postedAt = jsonLd.datePosted || null;
      
      if (jsonLd.baseSalary) {
        const sal = jsonLd.baseSalary;
        if (sal.value) {
          const min = sal.value.minValue;
          const max = sal.value.maxValue;
          const currency = sal.currency || 'USD';
          jobData.salary = min && max ? `${currency} ${min} - ${max}` : null;
        }
      }
      
      if (jsonLd.experienceRequirements) {
        jobData.experienceLevel = typeof jsonLd.experienceRequirements === 'string' 
          ? jsonLd.experienceRequirements 
          : jsonLd.experienceRequirements.monthsOfExperience 
            ? `${Math.round(jsonLd.experienceRequirements.monthsOfExperience / 12)}+ years`
            : null;
      }
    } else {
      // Fallback: parse from meta tags and HTML
      jobData.title = cleanText(title.replace(/ \| LinkedIn$/, '').replace(/ hiring /, ' - '));
      jobData.description = cleanText(description);
      jobData.company = extractCompanyFromTitle(title);
      jobData.location = extractLocationFromHtml(html);
    }

    // Clean up description (remove HTML tags if present)
    if (typeof jobData.description === 'string') {
      jobData.description = cleanText(jobData.description.replace(/<[^>]*>/g, ' '));
    }

    // Validate minimum data
    if (!jobData.title && !jobData.company) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract job details. This listing may require login or has been removed.' 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully scraped job:', jobData.title, 'at', jobData.company);

    return new Response(
      JSON.stringify({ success: true, data: jobData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraping error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractMeta(html: string, property: string): string | null {
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = html.match(regex);
  if (match) return decodeHtmlEntities(match[1]);
  
  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
  const match2 = html.match(regex2);
  return match2 ? decodeHtmlEntities(match2[1]) : null;
}

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractJsonLd(html: string): Record<string, any> | null {
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Could be array or single object
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'JobPosting') {
          return item;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

function extractCompanyFromTitle(title: string): string {
  // LinkedIn titles often: "Company hiring Title in Location"
  const match = title.match(/^(.+?)\s+hiring\s+/i);
  if (match) return match[1].trim();
  
  // Or "Title at Company"
  const match2 = title.match(/\bat\s+(.+?)(?:\s*\||\s*$)/i);
  return match2 ? match2[1].trim() : '';
}

function extractLocationFromHtml(html: string): string {
  const meta = extractMeta(html, 'geo.placename');
  if (meta) return meta;
  
  const match = html.match(/\"addressLocality\"\s*:\s*\"([^"]+)\"/);
  return match ? match[1] : '';
}

function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
