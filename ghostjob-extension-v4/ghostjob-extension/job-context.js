/* Shared by the LinkedIn content script and DOM fixture tests. No navigation. */
(function () {
  'use strict';
  const normalize = value => (value || '').replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).filter(Boolean).join('\n').trim();
  const visible = el => !el.closest('[hidden], [aria-hidden="true"], #gj-modal') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  function key() {
    const url = new URL(location.href);
    const fromUrl = url.searchParams.get('currentJobId') || url.pathname.match(/\/view\/(\d+)/)?.[1];
    if (fromUrl) return fromUrl;
    const area = root();
    return area?.getAttribute('data-job-id') || area?.querySelector('[data-job-id]')?.getAttribute('data-job-id') || area?.querySelector('h1 a[href*="/jobs/view/"], [data-test-job-title] a[href*="/jobs/view/"]')?.href.match(/\/view\/(\d+)/)?.[1] || '';
  }
  function heading() {
    return Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,[role="heading"],span,div')).find(el => visible(el) && el.textContent.trim().toLowerCase() === 'about the job') || null;
  }
  function root() {
    const h = heading();
    if (h) {
      for (let el = h.parentElement; el && el !== document.body; el = el.parentElement) {
        if (el.querySelector('a[href*="/company/"]') && !el.querySelector('.jobs-search-results-list, [data-testid="job-search-results"]')) return el;
      }
    }
    const details = Array.from(document.querySelectorAll('[data-testid="job-details"], .jobs-search__job-details--container, .jobs-search__job-details, .job-view-layout, main')).find(el => visible(el) && !el.querySelector('.jobs-search-results-list'));
    return details || null;
  }
  function section() {
    const h = heading();
    if (!h) return null;
    // Prefer the semantic section. Otherwise choose the smallest substantial
    // ancestor and include a sibling expansion button within that description.
    const semantic = h.closest('section, article, [data-testid="job-description"]');
    if (semantic && !semantic.querySelector('a[href*="/company/"]')) return semantic;
    for (let el = h.parentElement, depth = 0; el && depth < 6; el = el.parentElement, depth++) {
      if (el.querySelector('a[href*="/company/"], a[href*="/jobs/view/"]')) break;
      if (normalize(el.innerText || el.textContent).length > 160) {
        const parent = el.parentElement;
        if (!control(el) && parent && !parent.querySelector('a[href*="/company/"], a[href*="/jobs/view/"]') && control(parent)) return parent;
        return el;
      }
    }
    return null;
  }
  function control(area) {
    if (!area) return null;
    const acceptable = value => /^(?:show|see)?\s*more(?:\s+(?:of\s+)?(?:the\s+)?(?:job\s+)?description)?$/i.test(value.trim());
    return Array.from(area.querySelectorAll('button,[role="button"],a')).find(el => {
      if (!visible(el) || el.disabled) return false;
      if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href') !== '#') return false;
      const label = el.getAttribute('aria-label') || '';
      const words = el.textContent || '';
      if (/apply|company|similar|recommended|navigate/i.test(label + ' ' + words)) return false;
      const target = el.getAttribute('aria-controls');
      if (target && !area.contains(document.getElementById(target))) return false;
      return acceptable(words) || acceptable(label);
    }) || null;
  }
  function clipped(area) {
    return [area, ...area.querySelectorAll('div,p')].some(el => {
      const css = getComputedStyle(el);
      return el.getAttribute('aria-expanded') === 'false' || (el.scrollHeight > el.clientHeight + 2 && /hidden|clip/.test(css.overflowY)) || (css.webkitLineClamp && css.webkitLineClamp !== 'none' && css.webkitLineClamp !== '0');
    });
  }
  function content(area) {
    if (!area) return '';
    const copy = area.cloneNode(true);
    copy.querySelectorAll('button,[role="button"],h1,h2,h3,h4,h5,script,style').forEach(el => el.remove());
    copy.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    copy.querySelectorAll('p,li,div').forEach(el => { if (el.tagName === 'LI') el.prepend('• '); el.append('\n'); });
    return normalize(copy.textContent);
  }
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function readDescription(expectedKey) {
    const deadline = Date.now() + 5000;
    let clicked = false, stable = 0, last = '', clickedAt = 0;
    while (Date.now() < deadline) {
      if (key() !== expectedKey) throw new Error('The selected job changed. Scan the new job again.');
      const area = section();
      if (!area) { await pause(200); continue; }
      const expand = control(area);
      if (expand && !clicked) { expand.click(); clicked = true; clickedAt = Date.now(); stable = 0; }
      const current = content(section() || area);
      stable = current === last ? stable + 1 : 0; last = current;
      const currentArea = section() || area;
      const complete = !control(currentArea) && !clipped(currentArea);
      if (current && complete && stable >= 3 && (!clicked || Date.now() - clickedAt >= 1000)) {
        return { description: current.slice(0, 12000), descriptionCoverage: clicked ? 'expanded' : 'complete', coverageDetails: { status: clicked ? 'expanded' : 'complete', truncated: current.length > 12000, analyzedCharacters: Math.min(current.length, 12000) } };
      }
      await pause(200);
    }
    const status = last ? 'partial' : 'unavailable';
    return { description: last.slice(0, 12000), descriptionCoverage: status, coverageDetails: { status, truncated: last.length > 12000, analyzedCharacters: Math.min(last.length, 12000), reason: 'Could not confirm the complete description within the extraction window.' } };
  }
  function application(area) {
    const data = { applicationUrl: '', employerUrl: '', requisitionId: '' };
    if (!area) return data;
    for (const a of area.querySelectorAll('a[href]')) {
      try {
        let url = new URL(a.href);
        if (/(^|\.)linkedin\.com$/.test(url.hostname) && /redir|redirect/i.test(url.pathname)) {
          const target = url.searchParams.get('url'); if (target) url = new URL(target);
        }
        if (url.protocol !== 'https:' || /(^|\.)linkedin\.com$/.test(url.hostname)) continue;
        const label = (a.textContent || '') + ' ' + (a.getAttribute('aria-label') || '');
        if (/apply/i.test(label) && !data.applicationUrl) data.applicationUrl = url.href;
        if (/company website|visit website|careers/i.test(label) && !data.employerUrl) data.employerUrl = url.href;
      } catch (_) { /* Ignore malformed page links. */ }
    }
    data.requisitionId = content(section()).match(/(?:requisition|job)\s*(?:id|number|#)\s*[:#]?\s*([a-z0-9][a-z0-9_-]{2,80})/i)?.[1] || '';
    return data;
  }
  globalThis.GhostJobContext = { key, root, section, control, content, readDescription, application, normalize };
})();
