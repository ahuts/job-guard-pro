import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobScanner } from './JobScanner';

const analyzeJob = vi.fn();
const plan = vi.hoisted(() => ({ isPro: true }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'pro-account' } }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ isPro: plan.isPro, loading: false }) }));
vi.mock('@/services/jobScraper', () => ({ analyzeJob: (...args: unknown[]) => analyzeJob(...args), refineAnalysis: vi.fn(), recordScanObservation: vi.fn().mockResolvedValue(undefined), saveAnalysis: vi.fn() }));
vi.mock('@/services/scanCapabilities', () => ({ getScanCapabilities: vi.fn().mockResolvedValue({ scoringVersion: 3, investigationEnabled: false, freeUsage: { limit: 3, used: 0, remaining: 3, resetsAt: '2026-10-01T00:00:00.000Z' } }) }));
vi.mock('./GhostScoreDisplay', () => ({ GhostScoreDisplay: ({ proAccess }: { proAccess: boolean }) => <div>Scan result, Pro access: {String(proAccess)}</div> }));
vi.mock('./AuthDialog', () => ({ default: () => null }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn(), scoreBand: () => 'medium' }));

describe('Pro website scanning', () => {
  beforeEach(() => {
    plan.isPro = true;
    analyzeJob.mockReset().mockResolvedValue({
      job: { url: 'https://www.linkedin.com/jobs/view/4427397634/', title: 'Engineer', company: 'Cloudflare' },
      trustScore: { trustScore: 60, evidence: [], scoringVersion: 3 },
      firstObservedAt: new Date().toISOString(),
    });
  });

  it('shows a useful Free result and a clearly labeled static Pro preview', async () => {
    plan.isPro = false;
    analyzeJob.mockResolvedValueOnce({
      job: { url: 'https://www.linkedin.com/jobs/view/4427397634/', title: 'Engineer', company: 'Cloudflare' },
      trustScore: { trustScore: 60, evidence: [], scoringVersion: 3, freeUsage: { limit: 3, used: 1, remaining: 2, resetsAt: '2026-10-01T00:00:00.000Z' } },
      firstObservedAt: new Date().toISOString(),
    });
    render(<JobScanner />);
    fireEvent.change(screen.getByPlaceholderText('https://www.linkedin.com/jobs/view/...'), {
      target: { value: 'https://www.linkedin.com/jobs/view/4427397634/' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Job' }));
    expect(await screen.findByText('Scan result, Pro access: false')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pro posting comparison preview' })).toBeInTheDocument();
    expect(screen.getByText('This is a preview, not a finding for this job. Public evidence may be incomplete.')).toBeInTheDocument();
    expect(await screen.findByText((_, element) => element?.tagName === 'DIV' && element.textContent?.startsWith('2 of 3 new job checks left this month') === true)).toBeInTheDocument();
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
