import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobScanner } from './JobScanner';

const analyzeJob = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'pro-account' } }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ isPro: true, loading: false }) }));
vi.mock('@/services/jobScraper', () => ({ analyzeJob: (...args: unknown[]) => analyzeJob(...args), refineAnalysis: vi.fn(), recordScanObservation: vi.fn().mockResolvedValue(undefined), saveAnalysis: vi.fn() }));
vi.mock('./GhostScoreDisplay', () => ({ GhostScoreDisplay: () => <div>Scan result</div> }));
vi.mock('./AuthDialog', () => ({ default: () => null }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn(), scoreBand: () => 'medium' }));

describe('Pro website scanning', () => {
  beforeEach(() => {
    analyzeJob.mockReset().mockResolvedValue({
      job: { url: 'https://www.linkedin.com/jobs/view/4427397634/', title: 'Engineer', company: 'Cloudflare' },
      trustScore: { trustScore: 60, evidence: [], scoringVersion: 3 },
      firstObservedAt: new Date().toISOString(),
    });
  });

  it('allows more than three scans without a free-scan countdown', async () => {
    render(<JobScanner />);
    fireEvent.change(screen.getByPlaceholderText('https://www.linkedin.com/jobs/view/...'), {
      target: { value: 'https://www.linkedin.com/jobs/view/4427397634/' },
    });
    for (let count = 1; count <= 4; count++) {
      fireEvent.click(screen.getByRole('button', { name: 'Scan Job' }));
      await waitFor(() => expect(analyzeJob).toHaveBeenCalledTimes(count));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Scan Job' })).toBeEnabled());
    }
    expect(screen.getByText('Pro scans available')).toBeInTheDocument();
    expect(screen.queryByText(/free scans? remaining/)).not.toBeInTheDocument();
  });
});
