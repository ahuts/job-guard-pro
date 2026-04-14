// Vercel Serverless Function: Health check
// Endpoint: GET /api/health

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return res.status(200).json({
    status: 'ok',
    service: 'ghostjob-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}