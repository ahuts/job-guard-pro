import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useScannedJobs } from './useScannedJobs';
import JobCard from '@/components/dashboard/JobCard';
import { emptyInvestigation } from '@/lib/investigation';

const database = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'pilot' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({
  order: async () => ({ data: database.rows, error: null }),
}) }) }) } }));

describe('saved investigation display', () => {
  it('loads persisted JSON into the expanded tracker card and preserves legacy rows', async () => {
    const investigation = emptyInvestigation('completed', 'Checked');
    investigation.checkedAt = '2026-09-26T12:00:00Z';
    database.rows = [
      { id: 'current', user_id: 'pilot', job_title: 'Engineer', company_name: 'Employer', scoring_version: 3,
        trust_score: 50, investigation, created_at: investigation.checkedAt, signals: [] },
      { id: 'legacy', user_id: 'pilot', job_title: 'Older listing', company_name: 'Employer', ghost_score: 40, created_at: investigation.checkedAt },
    ];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useScannedJobs(), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].investigation).toEqual(investigation);
    expect(result.current.data?.[1].investigation).toBeNull();
    render(<JobCard job={result.current.data![0]} onDelete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Engineer Employer/ }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Posting investigation' })).toBeInTheDocument());
    expect(screen.getByText('Not enough evidence to compare the role')).toBeInTheDocument();
    client.clear();
  });
});
