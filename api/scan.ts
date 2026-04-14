// Vercel Serverless Function: Enhanced Trust Score scan
// Endpoint: POST /api/scan
// Takes job data from extension, returns enhanced signals + company-level data

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ScanRequest {
  url: string;
  title: string;
  company: string;
  location: string;
  description: string;
  postedAt?: string;
  salary?: string;
  localScore?: number;
  localSignals?: Signal[];
}

interface Signal {
  type: 'red' | 'yellow' | 'green';
  name: string;
  quote?: string;
  weight: number;
  source: 'local' | 'api';
}

interface ScanResponse {
  trustScore: number;
  signals: Signal[];
  companyData?: {
    hasCareersPage: boolean | null;
    recentLayoffs: boolean | null;
    companySize?: string;
    companyAge?: string;
  };
  source: 'api' | 'local_fallback';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, title, company, location, description, postedAt, salary, localScore, localSignals } = req.body as ScanRequest;

  if (!url && !description) {
    return res.status(400).json({ error: 'URL or description required' });
  }

  try {
    const apiSignals: Signal[] = [];
    let companyData: ScanResponse['companyData'] = null;

    // === Company-level signals ===
    // These require server-side data we can't get from the extension

    // 1. Check for company careers page
    if (company && company !== 'Unknown Company') {
      try {
        const careersUrl = `https://www.${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/careers`;
        const careersRes = await fetch(careersUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
        });
        const hasCareersPage = careersRes.ok;
        if (!companyData) companyData = { hasCareersPage: null, recentLayoffs: null };
        companyData.hasCareersPage = hasCareersPage;
        if (hasCareersPage) {
          apiSignals.push({
            type: 'green',
            name: 'Active careers page',
            weight: 4,
            source: 'api',
          });
        }
      } catch {
        // Can't verify — skip, don't penalize
      }
    }

    // 2. Check for recent layoffs (using public data)
    if (company && company !== 'Unknown Company') {
      // Future: integrate with layoffs.fyi API or similar
      // For now, we'll check a simple heuristic
      const descriptionLower = (description || '').toLowerCase();
      const layoffKeywords = ['restructuring', 'downsizing', 'reducing workforce', 'eliminated positions'];
      const hasLayoffHint = layoffKeywords.some(kw => descriptionLower.includes(kw));
      
      if (!companyData) companyData = { hasCareersPage: null, recentLayoffs: null };
      companyData.recentLayoffs = hasLayoffHint ? true : null; // null = unknown
      
      if (hasLayoffHint) {
        apiSignals.push({
          type: 'red',
          name: 'Layoff language detected',
          weight: 8,
          source: 'api',
        });
      }
    }

    // 3. Repost frequency check (future: track in database)
    // For now, if the URL contains repost indicators, add signal
    if (url && url.toLowerCase().includes('reposted')) {
      apiSignals.push({
        type: 'red',
        name: 'Reposted job listing',
        weight: 10,
        source: 'api',
      });
    }

    // === Merge local + API signals ===
    const allSignals: Signal[] = [
      ...(localSignals || []),
      ...apiSignals,
    ];

    // === Calculate Trust Score ===
    // Start from local score, adjust with API signals
    let trustScore = localScore ?? 50; // Default to middle if no local score

    // Add API signal weights (positive = trust, negative = distrust)
    for (const signal of apiSignals) {
      if (signal.type === 'red') {
        trustScore -= signal.weight;
      } else if (signal.type === 'green') {
        trustScore += signal.weight;
      }
    }

    // Clamp to 0-100
    trustScore = Math.max(0, Math.min(100, trustScore));

    const response: ScanResponse = {
      trustScore,
      signals: allSignals,
      companyData,
      source: 'api',
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Scan API error:', error);

    // Fallback: return local score if we have it
    if (localScore !== undefined) {
      return res.status(200).json({
        trustScore: localScore,
        signals: localSignals || [],
        source: 'local_fallback',
      } as ScanResponse);
    }

    return res.status(500).json({
      error: 'Scan failed and no local data provided',
    });
  }
}