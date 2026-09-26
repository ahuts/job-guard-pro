import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvestigationDetails } from './InvestigationDetails';
import { emptyInvestigation } from '@/lib/investigation';
import { saveAnalysis, type AnalysisResult } from '@/services/jobScraper';

const database = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], existing: [] as { id: string }[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: database.existing, error: null }) }) }) }),
  insert: async (row: Record<string, unknown>) => { database.rows.push(row); return { error: null }; },
}) } }));
afterEach(() => { cleanup(); database.rows = []; database.existing = []; });
describe('saved investigation display', () => {
  it('round-trips only public investigation evidence into a saved job and safe display', async () => {
    const investigation = { ...emptyInvestigation('completed', 'Compared'), finding: 'probable_match' as const,
      sourceUrl: 'https://employer.example/jobs/123', dimensions: [{ dimension: 'responsibilities' as const, finding: 'aligned' as const,
        excerpts: [{ sourceId: 'linkedin', sourceUrl: 'https://www.linkedin.com/jobs/view/123/', quote: 'Build and maintain payment APIs.' }] }] };
    const analysis = { job: { title: 'Engineer', company: 'Employer', location: 'US', url: 'https://www.linkedin.com/jobs/view/123/', description: 'Build and maintain payment APIs.' },
      trustScore: { trustScore: 60, scoringVersion: 3, ghostRisk: 'low_moderate', careersVerification: 'verified_match', evidence: [], investigation }, firstObservedAt: new Date().toISOString() } as AnalysisResult;
    await saveAnalysis('pilot', analysis);
    expect(database.rows[0].investigation).toEqual(investigation);
    expect(database.rows[0]).not.toHaveProperty('evaluation');
    render(<InvestigationDetails value={JSON.parse(JSON.stringify(database.rows[0].investigation))} />);
    expect(screen.getByRole('status').textContent).toContain('Possible employer posting match');
    expect(screen.getByRole('link', { name: /View compared employer posting/ }).getAttribute('href')).toBe(investigation.sourceUrl);
    expect(screen.getByText(/Build and maintain payment APIs/)).toBeDefined();
  });
  it('preserves existing saved jobs and rejects unsafe URLs in saved evidence', async () => {
    database.existing = [{ id: 'existing' }];
    await expect(saveAnalysis('pilot', { job: { url: 'https://www.linkedin.com/jobs/view/123/' } } as AnalysisResult)).rejects.toThrow('already saved');
    expect(database.rows).toHaveLength(0);
    render(<InvestigationDetails value={{ ...emptyInvestigation('completed', 'Compared'), sourceUrl: 'javascript:alert(1)' }} />);
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
