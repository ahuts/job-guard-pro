import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const script = readFileSync(process.cwd() + '/ghostjob-extension-v4/ghostjob-extension/job-context.js', 'utf8');
const context = () => (globalThis as any).GhostJobContext;
const about = (control = '', body = 'Responsibilities\n' + 'Build reliable customer systems. '.repeat(20)) => `<main><a href="https://www.linkedin.com/company/acme">Acme</a><h1>Engineer</h1><button id="apply">Easy Apply</button><section><h2>About the job</h2><div id="description"><p>${body}</p></div>${control}</section><section><h2>About the company</h2><button id="company-more">More</button></section></main>`;
beforeEach(() => { document.body.innerHTML = ''; window.history.replaceState({}, '', '/jobs/view/123'); window.eval(script); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());
describe('LinkedIn full-context extraction', () => {
  it('expands duplicate accessibility labels and waits for delayed replaced content', async () => {
    document.body.innerHTML = about('<button id="more" aria-label="More" aria-expanded="false">More</button>');
    const apply = vi.fn(); document.querySelector('#apply')!.addEventListener('click', apply);
    const company = vi.fn(); document.querySelector('#company-more')!.addEventListener('click', company);
    document.querySelector('#more')!.addEventListener('click', () => setTimeout(() => { document.querySelector('section')!.outerHTML = '<section><h2>About the job</h2><p>' + 'Expanded details. '.repeat(1000) + '</p></section>'; }, 1400));
    const pending = context().readDescription('123'); await vi.advanceTimersByTimeAsync(5200); const result = await pending;
    expect(result.descriptionCoverage).toBe('expanded'); expect(result.description.length).toBe(12000); expect(result.coverageDetails.truncated).toBe(true);
    expect(apply).not.toHaveBeenCalled(); expect(company).not.toHaveBeenCalled();
  });
  it('recognizes already-expanded descriptions and preserves paragraph boundaries', async () => {
    document.body.innerHTML = about('', 'Responsibilities</p><p>Build things.</p><p>' + 'Qualifications. '.repeat(25));
    const pending = context().readDescription('123'); await vi.advanceTimersByTimeAsync(1500); const result = await pending;
    expect(result.descriptionCoverage).toBe('complete'); expect(result.description).toContain('\n');
  });
  it('keeps a failed expansion partial', async () => {
    document.body.innerHTML = about('<button aria-expanded="false">More</button>');
    const pending = context().readDescription('123'); await vi.advanceTimersByTimeAsync(5200);
    expect((await pending).descriptionCoverage).toBe('partial');
  });
  it('does not click navigation disguised as More', async () => {
    document.body.innerHTML = about('<a href="https://example.com">More</a>');
    expect(context().control(context().section())).toBeNull();
  });
  it('rejects a changed split-pane job during extraction', async () => {
    document.body.innerHTML = about('<button>More</button>');
    window.history.replaceState({}, '', '/jobs/search/?currentJobId=123');
    const pending = context().readDescription('123');
    const assertion = expect(pending).rejects.toThrow('selected job changed');
    window.history.replaceState({}, '', '/jobs/search/?currentJobId=456');
    await vi.advanceTimersByTimeAsync(1000); await assertion;
  });
  it('waits for delayed description rendering', async () => {
    setTimeout(() => { document.body.innerHTML = about(); }, 1000);
    const pending = context().readDescription('123'); await vi.advanceTimersByTimeAsync(2400);
    expect((await pending).descriptionCoverage).toBe('complete');
  });
});
