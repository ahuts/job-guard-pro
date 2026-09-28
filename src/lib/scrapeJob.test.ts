import { describe, expect, it } from 'vitest';
import { linkedInJobId } from '../../api/scrape-job';

describe('LinkedIn job URL parsing', () => {
  it('accepts numeric and title-slug job links', () => {
    expect(linkedInJobId('https://www.linkedin.com/jobs/view/4427397634/')).toBe('4427397634');
    expect(linkedInJobId('https://www.linkedin.com/jobs/view/software-engineer-at-cloudflare-4427397634/?trackingId=123')).toBe('4427397634');
  });

  it('rejects lookalike hosts and unrelated paths', () => {
    expect(linkedInJobId('https://evil.example/jobs/view/4427397634/?next=linkedin.com')).toBeNull();
    expect(linkedInJobId('https://linkedin.com.evil.example/jobs/view/4427397634/')).toBeNull();
    expect(linkedInJobId('https://www.linkedin.com/jobs/search/4427397634/')).toBeNull();
  });
});
