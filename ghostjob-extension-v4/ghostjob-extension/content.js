// GhostJob Content Script v4.1
// Self-contained: does NOT rely on background service worker for scanning.
// The MV3 service worker dies after ~30s idle, making chrome.runtime invalid.
// Solution: fetch the API and run analysis directly here in the content script.

(function () {
  'use strict';

  if (window.__ghostJobRunning) return;
  window.__ghostJobRunning = true;

  const BTN_ID   = 'ghostjob-scan-btn';
  const FLOAT_ID = 'ghostjob-float-btn';
  const MODAL_ID = 'ghostjob-modal-overlay';
  const API_URL     = 'https://jobghost-gamma.vercel.app/api/scrape-job';
  const SCAN_API_URL = 'https://jobghost-gamma.vercel.app/api/scan';
  const SUPABASE_URL = 'https://auevehneizminspolipf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZXZlaG5laXptaW5zcG9saXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTAyMzMsImV4cCI6MjA5MDkyNjIzM30.jWbkBJkQHbVl1ui-47YZrGXT1-C3dL-6WLQrEhB6gfY';
  const FREE_SCAN_LIMIT = 3; // Free tier: 3 scans per month
  const VERSION  = '1.0.8';

  function log(...a)  { console.log('[GhostJob v' + VERSION + ']', ...a); }
  function warn(...a) { console.warn('[GhostJob v' + VERSION + ']', ...a); }

  log('loaded on', location.href);

  // ─── Poll helper ──────────────────────────────────────────────────────────
  function poll(fn, interval, timeout) {
    return new Promise(function(resolve, reject) {
      var r = fn(); if (r) { resolve(r); return; }
      var elapsed = 0;
      var t = setInterval(function() {
        elapsed += interval;
        var r = fn();
        if (r) { clearInterval(t); resolve(r); return; }
        if (elapsed >= timeout) { clearInterval(t); reject(new Error('timeout')); }
      }, interval);
    });
  }

  // ─── Find Save button (DOM-agnostic) ──────────────────────────────────────
  function findSaveButton() {
    var all = Array.from(document.querySelectorAll('button'));
    var b = all.find(function(b) {
      var l = (b.getAttribute('aria-label') || '').toLowerCase();
      return l.indexOf('save') !== -1 && l.indexOf('unsave') === -1;
    });
    if (b) return b;
    b = all.find(function(b) {
      var t = (b.textContent || '').trim().toLowerCase();
      return t === 'save' || t === 'save job';
    });
    return b || null;
  }

  // ─── Find flex container that holds the Save button ───────────────────────
  function findButtonContainer() {
    var save = findSaveButton();
    if (save) {
      var node = save.parentElement, depth = 0;
      while (node && depth < 8) {
        var style = window.getComputedStyle(node);
        var isFlex = style.display === 'flex' || style.display === 'inline-flex';
        var flexDir = style.flexDirection;
        if (isFlex && (flexDir === 'row' || flexDir === '') && node.children.length >= 2) {
          return { container: node, saveButton: save, insertAfter: save };
        }
        node = node.parentElement; depth++;
      }
      return { container: save.parentElement, saveButton: save, insertAfter: save };
    }
    var frags = ['top-buttons','apply-options','job-actions','top-card__cta','unified-top-card__content'];
    for (var i = 0; i < frags.length; i++) {
      var el = document.querySelector('[class*="' + frags[i] + '"]');
      if (el) return { container: el, insertAfter: null };
    }
    return null;
  }

  // ─── Create inline button ─────────────────────────────────────────────────
  function createGhostButton() {
    var btn = document.createElement('button');
    btn.id   = BTN_ID;
    btn.type = 'button';
    btn.style.cssText = [
      'display:inline-flex','align-items:center','justify-content:center',
      'gap:4px','padding:6px 16px','border-radius:16px',
      'border:1.5px solid #7c3aed',
      'background:linear-gradient(135deg,#667eea 0%,#7c3aed 100%)',
      'color:#fff','font-size:14px','font-weight:600','cursor:pointer',
      'white-space:nowrap','flex-shrink:0','line-height:1.4',
      'transition:opacity .15s','box-sizing:border-box',
      'margin-left:8px','min-height:32px','font-family:inherit',
    ].join(';');
    btn.textContent = '👻 Scan for Ghost Job';
    btn.addEventListener('mouseenter', function() { btn.style.opacity='0.85'; });
    btn.addEventListener('mouseleave', function() { btn.style.opacity='1'; });
    btn.addEventListener('click', handleScanClick);
    return btn;
  }

  // ─── Create floating badge ────────────────────────────────────────────────
  function ensureFloatingBadge() {
    if (document.getElementById(FLOAT_ID)) return;
    var b = document.createElement('button');
    b.id = FLOAT_ID; b.type = 'button'; b.title = 'Scan for Ghost Job';
    b.textContent = '👻';
    b.style.cssText = [
      'position:fixed','bottom:24px','right:24px','width:54px','height:54px',
      'border-radius:50%','background:linear-gradient(135deg,#667eea 0%,#7c3aed 100%)',
      'color:#fff','border:none','font-size:26px','cursor:pointer',
      'z-index:2147483647','box-shadow:0 4px 16px rgba(0,0,0,.35)',
      'display:flex','align-items:center','justify-content:center',
      'transition:transform .15s',
    ].join(';');
    b.addEventListener('mouseenter', function(){ b.style.transform='scale(1.1)'; });
    b.addEventListener('mouseleave', function(){ b.style.transform='scale(1)'; });
    b.addEventListener('click', handleScanClick);
    document.body.appendChild(b);
    log('Floating badge added');
  }

  // ─── Inject inline button ─────────────────────────────────────────────────
  function injectInlineButton() {
    if (document.getElementById(BTN_ID)) return true;
    var found = findButtonContainer();
    if (!found) { warn('No container found'); return false; }
    var btn = createGhostButton();
    if (found.insertAfter) {
      // Insert after the Save button's wrapper if it's wrapped, otherwise after Save itself
      var refEl = found.insertAfter.parentElement === found.container
        ? found.insertAfter
        : found.insertAfter.parentElement;
      refEl.insertAdjacentElement('afterend', btn);
      log('Injected next to Save button in flex row');
    } else {
      found.container.appendChild(btn);
      log('Appended to container');
    }
    // Ensure the container is a horizontal flex row
    var cs = window.getComputedStyle(found.container);
    if (cs.display !== 'flex' && cs.display !== 'inline-flex') {
      found.container.style.display = 'flex';
      found.container.style.alignItems = 'center';
      found.container.style.gap = '8px';
      log('Set container to flex row');
    } else if (cs.flexDirection === 'column' || cs.flexDirection === 'column-reverse') {
      found.container.style.flexDirection = 'row';
      found.container.style.alignItems = 'center';
      found.container.style.gap = '8px';
      log('Changed container flex-direction to row');
    }
    return true;
  }

  // ─── Run injection ────────────────────────────────────────────────────────
  function runInjection() {
    if (location.href.indexOf('/jobs/view/') === -1) return;
    var old = document.getElementById(BTN_ID);
    if (old) old.remove();

    poll(function() { return findSaveButton() || findButtonContainer(); }, 300, 15000)
      .then(function() { injectInlineButton(); })
      .catch(function() { warn('Poll timed out'); })
      .finally(function() { ensureFloatingBadge(); });
  }

  // ─── SPA nav watcher (throttled - Bug #7 fix) ─────────────────────────────
  var lastUrl = location.href, navTimer = null, lastCheckTime = 0, domChangeCount = 0;

  new MutationObserver(function(mutations) {
    var url = location.href;
    var now = Date.now();

    // Count significant DOM changes
    var significant = mutations.filter(function(m) {
      return m.type === 'childList' && m.addedNodes.length > 0;
    }).length;
    domChangeCount += significant;

    // URL changed - definitely re-inject
    if (url !== lastUrl) {
      lastUrl = url;
      domChangeCount = 0;
      clearTimeout(navTimer);
      var ob = document.getElementById(BTN_ID); if (ob) ob.remove();
      var of2 = document.getElementById(FLOAT_ID); if (of2) of2.remove();
      if (url.indexOf('/jobs/view/') !== -1) navTimer = setTimeout(runInjection, 400);
      return;
    }

    // Throttle: only check every 500ms (Bug #7 - was unthrottled before)
    if (now - lastCheckTime < 500) return;
    lastCheckTime = now;

    // If many DOM changes and button missing, re-inject
    if (url.indexOf('/jobs/view/') !== -1 && domChangeCount > 5) {
      var existingBtn = document.getElementById(BTN_ID);
      var existingFloat = document.getElementById(FLOAT_ID);
      if (!existingBtn && !existingFloat) {
        clearTimeout(navTimer);
        navTimer = setTimeout(runInjection, 500);
        domChangeCount = 0;
      }
    }
  }).observe(document, { subtree: true, childList: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInjection);
  } else {
    runInjection();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCAN - runs entirely in content script, no background needed
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Scan limit tracking ─────────────────────────────────────────────────
  function getMonthKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function checkScanLimit(callback) {
    chrome.storage.local.get(['gj_scans'], function(stored) {
      var scans = stored.gj_scans || {};
      var month = getMonthKey();
      var count = scans[month] || 0;

      // If logged in, no limit for now (will add Pro tier later)
      // If not logged in, enforce free limit
      chrome.storage.local.get(['gj_auth_token'], function(auth) {
        if (auth.gj_auth_token) {
          // Authenticated user — track but don't block
          callback(true, count, null);
        } else if (count >= FREE_SCAN_LIMIT) {
          // Free tier limit reached
          callback(false, count, FREE_SCAN_LIMIT);
        } else {
          callback(true, count, FREE_SCAN_LIMIT);
        }
      });
    });
  }

  function recordScan() {
    chrome.storage.local.get(['gj_scans'], function(stored) {
      var scans = stored.gj_scans || {};
      var month = getMonthKey();
      scans[month] = (scans[month] || 0) + 1;
      // Only keep last 3 months of data
      var keys = Object.keys(scans).sort();
      while (keys.length > 3) { delete scans[keys.shift()]; }
      chrome.storage.local.set({ gj_scans: scans });
    });
  }

  function handleScanClick() {
    log('Scan clicked');

    // Check scan limit before proceeding
    checkScanLimit(function(allowed, count, limit) {
      if (!allowed) {
        showLimitModal(count, limit);
        return;
      }

      // Record this scan
      recordScan();

      var btn = document.getElementById(BTN_ID);
      var origText = btn ? btn.textContent : '👻 Scan for Ghost Job';

    function setLoading(on) {
      if (!btn) return;
      btn.textContent = on ? '⏳ Analysing...' : origText;
      btn.disabled    = on;
      btn.style.opacity = on ? '0.65' : '1';
    }

    setLoading(true);

    var jobData = extractJobData();
    log('Job data:', jobData);

    fetchRemoteAnalysis(jobData)
      .then(function(data) {
        setLoading(false);
        showGhostScore(data);
      })
      .catch(function(err) {
        warn('API failed, using local scoring:', err.message);
        var analysis = calculateLocalScore(jobData);
        setLoading(false);
        showGhostScore({
          ghostScore:     analysis.score,
          signals:        analysis.signals,
          summary:        analysis.summary,
          recommendation: analysis.recommendation,
          source:         'local'  // Bug #10: preserve actual source
        });
      });
    }); // end checkScanLimit
  }

  // ─── Scan limit modal ─────────────────────────────────────────────────────
  function showLimitModal(count, limit) {
    // Remove any existing overlay
    var existing = document.getElementById('gj-limit-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'gj-limit-overlay';
    overlay.style.cssText = [
      'position:fixed','top:0','left:0','width:100vw','height:100vh',
      'background:rgba(0,0,0,0.6)','z-index:2147483646',
      'display:flex','align-items:center','justify-content:center'
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = [
      'background:#fff','border-radius:16px','padding:32px','max-width:380px',
      'width:90%','text-align:center','font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'box-shadow:0 20px 60px rgba(0,0,0,0.3)'
    ].join(';');

    card.innerHTML = [
      '<div style="font-size:48px;margin-bottom:16px">🔒</div>',
      '<h3 style="margin:0 0 8px;color:#1e293b;font-size:20px">Free Scan Limit Reached</h3>',
      '<p style="color:#64748b;font-size:14px;margin:0 0 8px">',
      'You\'ve used <strong>' + count + '/' + limit + '</strong> free scans this month.',
      '</p>',
      '<p style="color:#64748b;font-size:13px;margin:0 0 20px">',
      'Sign in to save jobs to your dashboard and get unlimited scans.',
      '</p>',
      '<div style="display:flex;gap:10px;justify-content:center">',
      '<button id="gj-limit-close" style="padding:10px 20px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:14px;color:#64748b">Close</button>',
      '<button id="gj-limit-signin" style="padding:10px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#667eea,#7c3aed);cursor:pointer;font-size:14px;color:#fff;font-weight:600">Sign In</button>',
      '</div>'
    ].join('');

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.getElementById('gj-limit-close').addEventListener('click', function() { overlay.remove(); });
    document.getElementById('gj-limit-signin').addEventListener('click', function() {
      overlay.remove();
      // Open the popup (user needs to click the extension icon)
      // Show a hint instead since we can't programmatically open the popup
      var hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;top:20px;right:20px;background:#667eea;color:#fff;padding:12px 20px;border-radius:8px;z-index:2147483647;font-size:14px;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
      hint.textContent = '👆 Click the GhostJob icon in your toolbar to sign in';
      document.body.appendChild(hint);
      setTimeout(function() { hint.remove(); }, 5000);
    });
  }

  // ─── Remote API call ──────────────────────────────────────────────────────
  // Extension extracts job data client-side, then calls scan API for company-level signals.
  // The old scrape-job API is no longer needed (content script handles extraction).
  function fetchRemoteAnalysis(jobData) {
    var analysis = calculateLocalScore(jobData);
    return enhanceWithScanApi(analysis, jobData);
  }
  
  // ─── Enhance with Scan API (company-level signals) ───────────────────────────
  function enhanceWithScanApi(analysis, jobData) {
    // 8-second timeout — if API doesn't respond, use local results
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 8000);
    
    return fetch(SCAN_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        url:          jobData.url,
        title:        jobData.title,
        company:     jobData.company,
        location:    jobData.location,
        description: jobData.description,
        localScore:  analysis.score,
        localSignals: analysis.signals
      }),
      signal: controller.signal
    })
    .then(function(res) {
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Scan API HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      log('Scan API enhanced score:', data.trustScore, '(was', analysis.score + ')');
      // Merge API signals with local, filtering out invalid ones and adding defaults
      var apiSignals = (data.signals || []).filter(function(s) {
        return s && s.name && s.type;
      }).map(function(s) {
        return {
          type:          s.type,
          icon:          s.icon || s.emoji || (s.type === 'red' ? '🔴' : s.type === 'yellow' ? '🟡' : '✅'),
          title:         s.title || s.name,
          description:   s.description || s.name,
          impact:       s.impact || '',
          advice:       s.advice || s.tip || '',
          quote:        s.quote || '',
          weight:       s.weight || 0,
          source:       s.source || 'api'
        };
      });
      // Keep local signals that aren't duplicated by API
      var localOnly = analysis.signals.filter(function(ls) {
        return !apiSignals.some(function(as) { return as.title === ls.title; });
      });
      var merged = localOnly.concat(apiSignals);
      return {
        ghostScore:     data.trustScore !== undefined ? data.trustScore : analysis.score,
        signals:        merged.length > 0 ? merged : analysis.signals,
        summary:        analysis.summary,
        recommendation: analysis.recommendation,
        source:         'api',
        companyData:    data.companyData || null
      };
    })
    .catch(function(err) {
      clearTimeout(timeout);
      // Scan API failed — return local scoring as-is
      warn('Scan API failed, using local results:', err.message);
      return {
        ghostScore:     analysis.score,
        signals:        analysis.signals,
        summary:        analysis.summary,
        recommendation: analysis.recommendation,
        source:         'local'
      };
    });
  }

  // ─── Extract job data (Bug #4, #5, #6: multiple selectors from original) ──
  function extractJobData() {
    var data = { url: location.href, title: '', company: '', location: '', description: '', salary: '', fullPageText: '', postedAgo: '', isReposted: false };

    // Title - try specific selectors then fallback
    var titleSelectors = [
      'h1.top-card-layout__title',
      'h1.job-details-jobs-unified-top-card__job-title',
      'h1[data-testid="job-title"]',
      'h1'
    ];
    for (var i = 0; i < titleSelectors.length; i++) {
      var el = document.querySelector(titleSelectors[i]);
      if (el && el.textContent.trim()) { data.title = el.textContent.trim(); break; }
    }

    // Company - 4 selectors (Bug #4 fix: was only 1)
    var companySelectors = [
      '.top-card-layout__card a[href*="/company/"]',
      'a[href*="/company/"]',
      '.job-details-jobs-unified-top-card__company-name',
      '.artdeco-entity-lockup__subtitle'
    ];
    for (var i = 0; i < companySelectors.length; i++) {
      var el = document.querySelector(companySelectors[i]);
      if (el && el.textContent.trim()) { data.company = el.textContent.trim(); break; }
    }

    // Location - class-agnostic extraction (LinkedIn changes classes constantly)
    // Strategy: (1) specific selectors, (2) bullet-separated metadata pattern, (3) heuristic scan
    var locationSelectors = [
      '[data-testid="job-location"]',
      '.job-details-jobs-unified-top-card__workplace-type',
      '.job-details-jobs-unified-top-card__bullet',
      '.top-card-layout__metadata-item'
    ];
    for (var i = 0; i < locationSelectors.length; i++) {
      var el = document.querySelector(locationSelectors[i]);
      if (el && el.textContent.trim()) {
        data.location = el.textContent.trim();
        break;
      }
    }
    // Fallback 1: LinkedIn's bullet-separated metadata pattern
    // Pattern: <p>...<span>Ogden, UT</span> · <span>2 months ago</span> · <span>100 applicants</span></p>
    // The first <span> in a ·-separated <p> that isn't a date/applicant count is the location
    if (!data.location) {
      var paragraphs = document.querySelectorAll('p');
      for (var pi = 0; pi < paragraphs.length; pi++) {
        var p = paragraphs[pi];
        var ptext = p.textContent;
        if (ptext.indexOf('\u00b7') === -1 && ptext.indexOf('\u2022') === -1 && ptext.indexOf('\u00b7') === -1) continue;
        var spans = p.querySelectorAll('span');
        for (var si = 0; si < spans.length; si++) {
          var st = spans[si].textContent.trim();
          if (st === '\u00b7' || st === '\u2022' || st === '') continue;
          if (/^\d+ (second|minute|hour|day|week|month|year)s? ago$/i.test(st)) continue;
          if (/^over?\s+\d+\s+applicant/i.test(st)) continue;
          if (/^\d+\s+applicant/i.test(st)) continue;
          if (st.length > 1 && st.length < 100) {
            data.location = st;
            break;
          }
        }
        if (data.location) break;
      }
    }
    // Fallback 2: walk up from company link and scan for location-like text
    if (!data.location) {
      var companyEl = document.querySelector('a[href*="/company/"]');
      if (companyEl) {
        var card = companyEl.closest('[class*="top-card"], [class*="topcard"], [class*="unified-top-card"], [class*="job-details"]');
        if (card) {
          var allSpans = card.querySelectorAll('span, p');
          for (var j = 0; j < allSpans.length; j++) {
            var t = allSpans[j].textContent.trim();
            if (t.length > 2 && t.length < 80 && t !== data.company && t !== data.title) {
              if (/,\s*[A-Z]{2}(\s\d{5})?$|,\s*[A-Z][a-z]+|Remote|Hybrid|On[- ]?site|WFH/i.test(t)) {
                data.location = t;
                break;
              }
            }
          }
        }
      }
    }

    // Listing age & repost detection — class-agnostic (scan spans in metadata area)
    // LinkedIn shows "Reposted X days ago" or "Posted X days ago" in <span> elements
    var postedSpans = document.querySelectorAll('span');
    for (var psi = 0; psi < postedSpans.length; psi++) {
      var ptxt = postedSpans[psi].textContent.trim();
      // Match "Reposted X days/weeks ago" or "Posted X days/weeks ago"
      var repostMatch = ptxt.match(/^Reposted\s+(\d+)\s+(day|week|month)s?\s+ago$/i);
      var postedMatch = ptxt.match(/^Posted\s+(\d+)\s+(day|week|month)s?\s+ago$/i);
      if (repostMatch) {
        data.isReposted = true;
        data.postedAgo = ptxt;
        break;
      } else if (postedMatch) {
        data.postedAgo = ptxt;
        // Don't break — keep looking in case a "Reposted" span appears later
      }
    }

    // Salary — class-agnostic extraction (like location)
    // Strategy: (1) specific selectors, (2) scan page for salary patterns in spans, (3) regex on full page text
    var salarySelectors = [
      '[data-testid="job-salary"]',
      '.job-details-jobs-unified-top-card__salary',
      '.salary-info',
      '.top-card-layout__salary'
    ];
    for (var i = 0; i < salarySelectors.length; i++) {
      var el = document.querySelector(salarySelectors[i]);
      if (el && el.textContent.trim()) { data.salary = el.textContent.trim(); break; }
    }
    // Fallback: scan all spans for salary patterns like $120K/yr, $85,000 - $120,000, etc.
    if (!data.salary) {
      var allSpans = document.querySelectorAll('span');
      for (var si = 0; si < allSpans.length; si++) {
        var t = allSpans[si].textContent.trim();
        // Skip LinkedIn UI chrome
        if (/premium|retry|subscribe|upgrade|trial/i.test(t)) continue;
        // Skip $0 (not a real salary)
        if (/\$0[^,.]/i.test(t)) continue;
        // Match salary patterns: $XK, $X,XXX, ranges with /yr or /year
        if (t.length > 3 && t.length < 80 && /\$\d[\d,]*\.?\d*\s*(?:[/-]\s*\$?\d[\d,]*\.?\d*)?[kK]?/i.test(t)) {
          // Only grab if it looks like a real salary (must have $ and a non-zero number)
          if (/\$\d[\d,]*/.test(t) && !/\$0[^,.\d]/.test(t)) {
            data.salary = t;
            break;
          }
        }
      }
    }
    // Fallback 3: scan <p> elements with · separators for salary-like content
    if (!data.salary) {
      var paras = document.querySelectorAll('p');
      for (var pi = 0; pi < paras.length; pi++) {
        var ptext = paras[pi].textContent;
        if (ptext.indexOf('\u00b7') === -1 && ptext.indexOf('\u2022') === -1) continue;
        var pspans = paras[pi].querySelectorAll('span');
        for (var psi = 0; psi < pspans.length; psi++) {
          var st = pspans[psi].textContent.trim();
          if (st.length > 3 && st.length < 80 && /\$\d[\d,]*\.?\d*/i.test(st) && !/premium|retry|subscribe/i.test(st)) {
            data.salary = st;
            break;
          }
        }
        if (data.salary) break;
      }
    }

    // Full page text — for signal detection beyond just the description
    // Only include description + salary (NOT raw location — it adds noise like city names matching $ patterns)
    data.fullPageText = (data.description + ' ' + data.salary).trim();

    // Description — 4 fallback selectors (Bug #6 fix: was only 1)
    var descSelectors = [
      '.description__text',
      '.jobs-description-content__text',
      '.show-more-less-html__markup',
      '[class*="description"] .markup',
      '[class*="jobs-description"]',
      '[data-testid="job-description"]'
    ];
    for (var i = 0; i < descSelectors.length; i++) {
      var el = document.querySelector(descSelectors[i]);
      if (el && el.textContent.trim()) {
        data.description = el.textContent.trim().substring(0, 4000);
        break;
      }
    }

    var m = location.href.match(/\/view\/(\d+)/);
    if (m) data.jobId = m[1];

    return data;
  }

  // ─── Extract a quote from the original text matching a regex ──────────────
  // Returns the matched text with some surrounding context (up to ~120 chars)
  function extractQuote(text, regex) {
    var m = text.match(regex);
    if (!m) return '';
    var idx = m.index;
    var matched = m[0];
    // Grab ~40 chars before and ~80 after the match for context
    var start = Math.max(0, idx - 40);
    var end = Math.min(text.length, idx + matched.length + 80);
    var snippet = text.substring(start, end).replace(/\s+/g, ' ').trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  }

  // ─── Local scoring (v4.2 - bugs fixed + 8 new signals + quotes) ────────────
  function calculateLocalScore(jobData) {
    var score = 50, signals = [];
    // Keep original-case versions for quote extraction
    var titleOrig = (jobData.title || '');
    var descOrig  = (jobData.description || '');
    var locOrig   = (jobData.location || '');
    var salaryOrig = (jobData.salary || '');
    var fullOrig  = (jobData.fullPageText || (descOrig + ' ' + salaryOrig + ' ' + locOrig));
    var title    = titleOrig.toLowerCase();
    var desc     = descOrig.toLowerCase();
    var location = locOrig.toLowerCase();
    var company  = (jobData.company || '').toLowerCase();
    var salary   = salaryOrig.toLowerCase();
    var full     = fullOrig.toLowerCase(); // includes description + salary + location
    var combined = title + ' ' + desc;

    // ═══════════════════════════════════════════════════════════════════════
    // RED FLAGS (decrease trust score - higher = safer)
    // ═══════════════════════════════════════════════════════════════════════

    // Urgency language
    var urgencyRe = /urgent|immediate|asap|start today|start immediately|hire now|hiring now/i;
    if (urgencyRe.test(combined)) {
      var q = extractQuote(descOrig, urgencyRe) || extractQuote(titleOrig, urgencyRe);
      score -= 10;
      signals.push({ type:'red', icon:'🚨', title:'Urgency Language',
        description:'Words like "urgent", "ASAP", or "hire now" often indicate high turnover or poor planning.',
        impact:'May signal desperation hiring or replacing someone who left suddenly.',
        advice:'Ask why the position is urgent. Legitimate urgent roles exist but warrant extra scrutiny.',
        quote: q });
    }

    // Buzzy job titles
    var buzzyRe = /rockstar|ninja|guru|wizard|superstar|unicorn/i;
    if (buzzyRe.test(combined)) {
      var q = extractQuote(titleOrig, buzzyRe) || extractQuote(descOrig, buzzyRe);
      score -= 10;
      signals.push({ type:'red', icon:'🎸', title:'Buzzy Job Titles',
        description:'Terms like "rockstar" or "ninja" often mask unclear role expectations.',
        impact:'May indicate the company doesn\'t know what they actually need.',
        advice:'Ask for specific responsibilities. Vague titles often lead to role confusion.',
        quote: q });
    }

    // Vague salary info
    var vagueSalaryRe = /competitive salary|commensurate with experience|pay is competitive|salary commensurate/i;
    if (vagueSalaryRe.test(desc)) {
      var q = extractQuote(descOrig, vagueSalaryRe);
      score -= 8;
      signals.push({ type:'red', icon:'💰', title:'Vague Salary Info',
        description:'"Competitive" without numbers usually means below market rate.',
        impact:'Companies confident in their pay typically share ranges upfront.',
        advice:'Research salary ranges for this role. Ask for the budget early in the process.',
        quote: q });
    }

    // Code for understaffed
    var underRe = /wear many hats|fast.?paced|dynamic environment|all.?hands on deck/i;
    if (underRe.test(desc)) {
      var q = extractQuote(descOrig, underRe);
      score -= 8;
      signals.push({ type:'red', icon:'🎩', title:'Code for Understaffed',
        description:'"Wear many hats" often means doing 2-3 jobs for 1 salary.',
        impact:'High burnout risk.',
        advice:'Ask about team size and workload.',
        quote: q });
    }

    // "Unlimited" PTO
    var ptoRe = /unlimited pto|unlimited vacation|take time as needed/i;
    if (ptoRe.test(desc)) {
      var q = extractQuote(descOrig, ptoRe);
      score -= 6;
      signals.push({ type:'red', icon:'🏖️', title:'"Unlimited" PTO',
        description:'"Unlimited" PTO often results in employees taking LESS time off.',
        impact:'No payout for unused time; social pressure not to take breaks.',
        advice:'Ask about average days taken.',
        quote: q });
    }

    // ── Experience requirements (Bug #1 fix: 4 patterns from original) ──────
    var expPatterns = [
      /(\d{1,2})\+?\s*years?\s*(?:of\s*)?experience/i,
      /(\d{1,2})\+?\s*years?\s*(?:of\s*)?[^\d]*?experience/i,
      /requires?\s*(\d{1,2})\+?\s*years?/i,
      /(?:minimum|min|at least)\s*(\d{1,2})\+?\s*years?/i
    ];
    var years = 0;
    for (var i = 0; i < expPatterns.length; i++) {
      var match = desc.match(expPatterns[i]);
      if (match) {
        var found = parseInt(match[1]);
        // Sanity check: skip years > 50 (likely a date or salary, not experience)
        if (found > years && found < 50) years = found;
      }
    }
    if (years >= 5) {
      var q = extractQuote(descOrig, /\d{1,2}\+?\s*years?\s*(?:of\s*)?experience/i) ||
              extractQuote(descOrig, /requires?\s*\d{1,2}\+?\s*years?/i) ||
              extractQuote(descOrig, /(?:minimum|min|at least)\s*\d{1,2}\+?\s*years?/i);
      score -= 6;
      signals.push({ type:'red', icon:'📅', title:'High Experience Requirements',
        description:'Requires ' + years + '+ years of experience - may be unrealistic.',
        impact:'Could indicate they want senior talent at junior/mid pay.',
        advice:'Apply anyway if you\'re close. Requirements are often flexible.',
        quote: q });
    }

    // ── NEW SIGNAL: Unrealistic experience combos (Signal #5) ───────────────
    // e.g. "5+ years React" + "3+ years Next.js" for a junior role
    if (years >= 8 || /senior|lead|principal|staff/i.test(title) && /entry.level|junior|associate/i.test(title)) {
      score -= 8;
      var q = extractQuote(descOrig, /\d{1,2}\+?\s*years?\s*(?:of\s*)?experience/i) || extractQuote(titleOrig, /senior|lead|principal|staff|entry.level|junior|associate/i);
      signals.push({ type:'red', icon:'🔥', title:'Unrealistic Experience Combo',
        description: years >= 8 ? 'Requires ' + years + '+ years - very high for most roles.' : 'Title contradicts experience level (senior + entry-level signals).',
        impact:'May be a pipeline posting to justify hiring someone cheaper or on visa.',
        advice:'Check if the role level matches the experience asked. If not, it may be ghost.',
        quote: q });
    }

    // ── NEW SIGNAL: Vague/generic description <200 chars substance (Signal #2)
    // Strip whitespace and common filler to measure actual substance
    var substance = desc.replace(/\s+/g, ' ').replace(/equal opportunity|we are an|diversity|inclusive|affirmative action|eoe|m\/f\/d\/v|is an equal/gi, '').trim();
    if (substance.length > 0 && substance.length < 200) {
      score -= 6;
      signals.push({ type:'red', icon:'📝', title:'Vague Description',
        description:'Job description has very little substance (under ~200 characters of real content).',
        impact:'Ghost jobs often have thin, generic descriptions because no one bothered writing real requirements.',
        advice:'Compare with similar roles at the same company. Legitimate jobs typically have detailed descriptions.',
        quote: descOrig.substring(0, 120).trim() + (descOrig.length > 120 ? '...' : '') });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // YELLOW FLAGS (moderate decrease - higher = safer)
    // ═══════════════════════════════════════════════════════════════════════

    // ── NEW SIGNAL: No salary range listed (Signal #1) ─────────────────────
    // Check description + salary span, AND do a full page scan for $ amounts
    var hasSalaryNumber = /\$\d[\d,]*\.?\d*\s*(?:[/-]\s*\$?\d[\d,]*\.?\d*)?[kK]?|\d{2,3}[kK]\s*[/-]\s*\d{2,3}[kK]/i.test(full);
    // If not found in description/salary, scan the entire page body for salary patterns
    if (!hasSalaryNumber) {
      var pageBody = document.body ? document.body.innerText : '';
      // Filter out LinkedIn UI chrome before testing
      var pageClean = pageBody.replace(/premium|retry for|subscribe|upgrade|trial/gi, '');
      hasSalaryNumber = /\$\d[\d,]*\.?\d*\s*(?:[/-]\s*\$?\d[\d,]*\.?\d*)?[kK]?|\d{2,3}[kK]\s*[/-]\s*\d{2,3}[kK]/i.test(pageClean);
    }
    var hasSalaryVague  = /competitive salary|commensurate with experience|pay is competitive/i.test(full);
    if (!hasSalaryNumber && !hasSalaryVague) {
      score -= 4;
      signals.push({ type:'yellow', icon:'🔍', title:'No Salary Range Listed',
        description:'No salary information mentioned at all.',
        impact:'Companies that don\'t share pay info may be below market rate or hiding low offers.',
        advice:'Research market rate for this role. Ask about compensation early.',
        quote: '' });
    }

    // ── NEW SIGNAL: No team/manager mentioned (Signal #3) ──────────────────
    if (!/team|manager|report to|lead|supervisor|mentor|reporting to|you will join/i.test(desc)) {
      score -= 4;
      signals.push({ type:'yellow', icon:'👥', title:'No Team or Manager Mentioned',
        description:'No mention of team, manager, or reporting structure.',
        impact:'Ghost jobs rarely specify who you\'d work with because there\'s no actual opening.',
        advice:'Ask who you\'d report to and what the team looks like. If they can\'t answer, that\'s a red flag.',
        quote: '' });
    }

    // ── NEW SIGNAL: "Various locations" or missing location (Signal #4) ────
    var vagueLocRe = /various locations|multiple locations|location flexible|remote friendly/i;
    if (vagueLocRe.test(location + ' ' + desc)) {
      var q = extractQuote(locOrig, vagueLocRe) || extractQuote(descOrig, vagueLocRe);
      score -= 3;
      signals.push({ type:'yellow', icon:'📍', title:'Vague Location',
        description:'Lists "various locations" or vague location info.',
        impact:'May indicate a pipeline posting not tied to a real position at a specific office.',
        advice:'Ask which office or team this role is for. Real roles have real locations.',
        quote: q });
    } else if (!location || location.length < 3) {
      score -= 3;
      signals.push({ type:'yellow', icon:'📍', title:'No Location Listed',
        description:'No location information found on the listing.',
        impact:'Missing location is common in ghost jobs - they don\'t tie it to a real office.',
        advice:'If it says remote, verify. If no location at all, ask why.',
        quote: '' });
    }

    // ── NEW SIGNAL: AI-generated language patterns (Signal #6) ─────────────
    var aiPhrases = [
      /leverage.{0,20}(synerg|platform|ecosystem)/i,
      /drive.{0,20}(impact|outcome|transformation)/i,
      /passionate about.{0,20}(innovation|excellence|craft)/i,
      /thrive in.{0,20}(fast.?paced|dynamic|ambigu)/i,
      /cross.?functional.{0,20}(collabor|partner|stakeholder)/i
    ];
    var aiMatches = aiPhrases.filter(function(p) { return p.test(desc); }).length;
    if (aiMatches >= 2) {
      score -= 3;
      // Find the first AI phrase match for the quote
      var aiQuoteMatch = aiPhrases.find(function(p) { return p.test(desc); });
      var q = aiQuoteMatch ? extractQuote(descOrig, aiQuoteMatch) : '';
      signals.push({ type:'yellow', icon:'🤖', title:'AI-Generated Language Patterns',
        description:'Description uses multiple phrases common in AI-generated job postings (' + aiMatches + ' detected).',
        impact:'May indicate the posting was auto-generated to build a candidate pipeline, not fill a real role.',
        advice:'Look for specifics: real teams, real projects, real problems. AI-generated posts tend to be generic.',
        quote: q });
    }

    // ── NEW SIGNAL: Culture buzzwords + red flags contradiction (Signal #8 / Bug #2)
    // Was in original but missing from V4
    if (/family|work.?life balance|flexible hours|culture of care|people first/i.test(desc)) {
      var hasRedFlags = signals.some(function(s) { return s.type === 'red'; });
      if (hasRedFlags) {
        score -= 4;
        var cultureRe = /family|work.?life balance|flexible hours|culture of care|people first/i;
        var q = extractQuote(descOrig, cultureRe);
        signals.push({ type:'yellow', icon:'⚠️', title:'Culture Buzzwords + Red Flags',
          description:'Claims great culture (work-life balance, family) but also shows red flags like urgency or overwork.',
          impact:'Marketing language that likely doesn\'t match reality.',
          advice:'Ask current employees about actual hours and culture anonymously.',
          quote: q });
      }
    }

    // ── Reposted / stale listing detection ──────────────────────────────────
    // Reposted jobs = strong ghost signal; stale listings (30+ days) also suspicious
    var postedAgoOrig = (jobData.postedAgo || '');
    if (jobData.isReposted) {
      score -= 10;
      signals.push({ type:'red', icon:'🔁', title:'Reposted Job',
        description:'This job has been reposted (' + postedAgoOrig + ').',
        impact:'Reposted jobs often indicate ghost listings — companies recycle postings to appear active without actually hiring. 30-40% of reposted roles never result in a hire.',
        advice:'Check if the original posting is still active. Ask the recruiter why the role was reopened.',
        quote: postedAgoOrig });
    } else if (postedAgoOrig) {
      // Parse the age to check for stale listings (30+ days)
      var ageMatch = postedAgoOrig.match(/(\d+)\s+(day|week|month)/i);
      if (ageMatch) {
        var ageNum = parseInt(ageMatch[1], 10);
        var ageUnit = ageMatch[2].toLowerCase();
        var ageDays = ageUnit === 'month' ? ageNum * 30 : ageUnit === 'week' ? ageNum * 7 : ageNum;
        if (ageDays >= 30) {
          score -= 6;
          signals.push({ type:'yellow', icon:'⏳', title:'Stale Listing (' + postedAgoOrig + ')',
            description:'This job has been listed for ' + ageDays + '+ days without being filled.',
            impact:'Most legitimate hires close within 30 days. Listings open longer may be ghost jobs or have internal candidates lined up.',
            advice:'Ask the recruiter about the hiring timeline. If they can\'t give specifics, the role may not be real.',
            quote: postedAgoOrig });
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GREEN FLAGS (increase trust score - higher = safer)
    // ═══════════════════════════════════════════════════════════════════════

    // Salary transparency — checks desc + salary span, then full page as fallback
    var salaryRe = /\$\d[\d,]*\.?\d*\s*(?:[/-]\s*\$?\d[\d,]*\.?\d*)?[kK]?|\d{2,3}[kK]\s*[/-]\s*\d{2,3}[kK]/i;
    var salaryFoundIn = salaryRe.test(salaryOrig) ? 'span' : salaryRe.test(descOrig) ? 'desc' : null;
    if (!salaryFoundIn) {
      // Last resort: scan the full page body for salary patterns
      var pageBody = document.body ? document.body.innerText : '';
      var pageClean = pageBody.replace(/premium|retry for|subscribe|upgrade|trial/gi, '');
      if (salaryRe.test(pageClean)) salaryFoundIn = 'page';
    }
    if (salaryFoundIn) {
      // Pick the best quote source
      var q;
      if (salaryFoundIn === 'span' && salaryOrig) {
        q = extractQuote(salaryOrig, salaryRe);
      } else if (salaryFoundIn === 'page') {
        // Extract from the page body, but skip UI chrome lines
        var pageLines = (document.body ? document.body.innerText : '').split('\n');
        for (var li = 0; li < pageLines.length; li++) {
          var lt = pageLines[li].trim();
          if (salaryRe.test(lt) && !/premium|retry|subscribe/i.test(lt) && lt.length > 3 && lt.length < 120) {
            q = lt; break;
          }
        }
        if (!q) q = extractQuote(descOrig, salaryRe);
      } else {
        q = extractQuote(descOrig, salaryRe);
      }
      score += 10;
      signals.push({ type:'green', icon:'✅', title:'Salary Transparency',
        description:'Specific salary numbers or ranges mentioned.',
        impact:'Shows confidence in compensation and respect for candidate time.',
        advice:'Great sign! Transparent companies tend to have fairer practices overall.',
        quote: q || '' });
    }

    // Flexible work
    var flexRe = /remote|hybrid|flexible|work from home|wfh/i;
    if (flexRe.test(desc)) {
      var q = extractQuote(descOrig, flexRe);
      score += 5;
      signals.push({ type:'green', icon:'🏠', title:'Flexible Work Options',
        description:'Remote or hybrid options mentioned.',
        impact:'Modern work culture that values autonomy.',
        advice:'Verify flexibility is real.',
        quote: q });
    }

    // Benefits mentioned
    var benRe = /health insurance|401k|dental|vision|benefits package/i;
    if (benRe.test(desc)) {
      var q = extractQuote(descOrig, benRe);
      score += 6;
      signals.push({ type:'green', icon:'🏥', title:'Benefits Mentioned',
        description:'Specific benefits listed.',
        impact:'Investment in employee wellbeing.',
        advice:'Ask for details on coverage.',
        quote: q });
    }

    // Growth opportunities
    var growRe = /professional development|learning budget|training|growth opportunities/i;
    if (growRe.test(desc)) {
      var q = extractQuote(descOrig, growRe);
      score += 5;
      signals.push({ type:'green', icon:'📚', title:'Growth Opportunities',
        description:'Mentions development or learning.',
        impact:'Company invests in employees, not just output.',
        advice:'Ask about specific programs or budgets.',
        quote: q });
    }

    // Hiring manager / team contact (bonus green flag)
    var contactRe = /hiring manager|contact.*hiring|reach out to|dm me|email me at/i;
    if (contactRe.test(desc)) {
      var q = extractQuote(descOrig, contactRe);
      score += 4;
      signals.push({ type:'green', icon:'🤝', title:'Hiring Manager Contact',
        description:'Listing mentions a specific person to contact.',
        impact:'Real jobs have real hiring managers who want to talk to you.',
        advice:'Reach out directly. A real person responding is a very strong positive signal.',
        quote: q });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Finalize - invert so higher = safer (Trust Score)
    // ═══════════════════════════════════════════════════════════════════════
    score = Math.max(0, Math.min(100, score));
    var trustScore = 100 - score;
    var summary, recommendation;
    if (trustScore <= 30) {
      summary = 'Multiple red flags detected. Proceed with extreme caution.';
      recommendation = 'This job shows several warning signs. Ask tough questions in interviews.';
    } else if (trustScore <= 60) {
      summary = 'Mixed signals. Some concerns but also positive indicators.';
      recommendation = 'Worth investigating. Ask specific questions about the red flags.';
    } else {
      summary = 'Strong positive indicators. Likely a legitimate opportunity.';
      recommendation = 'Good signs overall. Still do your due diligence!';
    }
    return { score: trustScore, signals: signals, summary: summary, recommendation: recommendation };
  }

  // ─── Show Ghost Score panel (Bug #9: visual distinction for local) ────────
  function showGhostScore(result) {
    var old = document.getElementById(MODAL_ID);
    if (old) old.remove();

    var score  = result.ghostScore != null ? result.ghostScore : 50;
    var isLow = score <= 30, isMid = score <= 60;
    var color  = isLow ? '#ef4444' : isMid ? '#f59e0b' : '#22c55e';
    var label  = isLow ? '⚠️ Likely Ghost Job' : isMid ? '⚡ Proceed with Caution' : '✅ Looks Legitimate';

    var signalsHtml = '';
    if (result.signals && result.signals.length) {
      var rows = result.signals.map(function(s) {
        var bg  = s.type==='red'?'#fef2f2':s.type==='green'?'#f0fdf4':'#fefce8';
        var bdr = s.type==='red'?'#ef4444':s.type==='green'?'#22c55e':'#eab308';
        var tbg = s.type==='red'?'#fecaca':s.type==='green'?'#bbf7d0':'#fde047';
        var tfg = s.type==='red'?'#dc2626':s.type==='green'?'#16a34a':'#a16207';
        return '<div style="margin-bottom:12px;padding:10px;border-radius:8px;background:'+bg+';border-left:3px solid '+bdr+'">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
            '<span style="font-size:16px">'+s.icon+'</span>' +
            '<span style="font-weight:600;color:#333;font-size:13px">'+s.title+'</span>' +
            '<span style="margin-left:auto;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;background:'+tbg+';color:'+tfg+'">'+s.type+'</span>' +
          '</div>' +
          '<div style="font-size:12px;color:#555;margin-bottom:4px;padding-left:24px">'+s.description+'</div>' +
          (s.quote ? '<div style="font-size:11px;color:#6b7280;padding:6px 10px;margin:4px 0 4px 24px;background:#f3f4f6;border-radius:4px;border-left:2px solid '+bdr+';font-style:italic">💬 "'+s.quote.replace(/</g,'&lt;')+'"</div>' : '') +
          '<div style="font-size:11px;color:#666;padding-left:24px;margin-bottom:4px"><strong>Impact:</strong> '+s.impact+'</div>' +
          '<div style="font-size:11px;color:#2563eb;padding-left:24px"><strong>💡 Tip:</strong> '+s.advice+'</div>' +
        '</div>';
      }).join('');
      signalsHtml = '<div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:16px">' +
        '<div style="font-size:14px;font-weight:600;color:#333;margin-bottom:12px">📊 Signals Detected ('+result.signals.length+')</div>' +
        '<div style="max-height:300px;overflow-y:auto">'+rows+'</div></div>';
    }

    // Bug #9: Visual distinction when using local analysis
    var sourceTag = '';
    if (result.source === 'local') {
      sourceTag = '<div style="font-size:11px;color:#6b7280;text-align:center;margin-top:8px;padding:6px;background:#f3f4f6;border-radius:6px">⚠️ Verify signals in the Trust Score. GhostJob can make mistakes.</div>';
    } else {
      sourceTag = '<div style="font-size:11px;color:#059669;text-align:center;margin-top:8px">🔗 Full API analysis</div>';
    }

    var overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.3);z-index:2147483646;display:flex;align-items:flex-start;justify-content:flex-end;padding:20px;padding-top:80px;box-sizing:border-box';
    overlay.addEventListener('click', function(e) { if (e.target===overlay) overlay.remove(); });

    var panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;border-radius:16px 0 0 16px;width:560px;max-width:90vw;max-height:calc(100vh - 100px);overflow-y:auto;box-shadow:-4px 0 24px rgba(0,0,0,.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border:1px solid #e5e7eb;border-right:none';

    panel.innerHTML =
      '<div style="padding:24px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
          '<div style="font-size:20px;font-weight:700;color:#111">GhostJob Trust Score</div>' +
          '<button id="gj-close-x" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666;padding:4px 8px;border-radius:4px;line-height:1">✕</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:'+color+'12;border-radius:12px">' +
          '<div style="width:76px;height:76px;border-radius:50%;background:'+color+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:700;flex-shrink:0">'+score+'</div>' +
          '<div>' +
            '<div style="font-size:17px;font-weight:700;color:'+color+'">'+label+'</div>' +
            '<div style="font-size:13px;color:#666;margin-top:4px">Trust Score: '+score+' / 100</div>' +
          '</div>' +
        '</div>' +
        (result.summary ? '<div style="font-size:14px;color:#444;margin-bottom:16px;padding:12px;background:#f9fafb;border-radius:8px;border-left:3px solid '+color+'"><strong>Summary:</strong> '+result.summary+'</div>' : '') +
        signalsHtml +
        (result.recommendation ? '<div style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:8px;border-left:3px solid '+color+'"><div style="font-size:14px;color:#444"><strong>🎯 Recommendation:</strong> '+result.recommendation+'</div></div>' : '') +
        '<div style="margin-top:24px;display:flex;gap:12px">' +
          '<button id="gj-save-btn" style="flex:1;padding:11px 20px;background:#667eea;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">💾 Save to Dashboard</button>' +
          '<button id="gj-close-btn" style="padding:11px 20px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Close</button>' +
        '</div>' +
        sourceTag +
        '<div id="gj-save-status" style="margin-top:10px;font-size:13px;text-align:center"></div>' +
      '</div>';

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    document.getElementById('gj-close-x').addEventListener('click', function(){ overlay.remove(); });
    document.getElementById('gj-close-btn').addEventListener('click', function(){ overlay.remove(); });
    document.getElementById('gj-save-btn').addEventListener('click', function(){ handleSaveJob(result); });
  }

  // ─── Save job ──────────────────────────────────────────────────────────────
  function handleSaveJob(result) {
    var saveBtn   = document.getElementById('gj-save-btn');
    var statusDiv = document.getElementById('gj-save-status');
    if (!saveBtn || !statusDiv) return;
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';

    var jobData = extractJobData();
    var payload = Object.assign({}, jobData, {
      ghostScore: result.ghostScore,
      signals:    result.signals,
      summary:    result.summary,
      scannedAt:  new Date().toISOString()
    });

    function onSaved(totalSaved) {
      saveBtn.textContent     = '✅ Saved!';
      saveBtn.style.background = '#22c55e';
      statusDiv.textContent   = 'Saved to dashboard';
      statusDiv.style.color   = '#22c55e';
      setTimeout(function(){
        saveBtn.textContent     = '💾 Save to Dashboard';
        saveBtn.style.background = '#667eea';
        saveBtn.disabled        = false;
        statusDiv.textContent   = '';
      }, 3000);
    }

    function onError(msg) {
      saveBtn.textContent     = '❌ Failed';
      saveBtn.style.background = '#ef4444';
      statusDiv.textContent   = msg || 'Save failed';
      statusDiv.style.color   = '#ef4444';
      setTimeout(function(){
        saveBtn.textContent     = '💾 Save to Dashboard';
        saveBtn.style.background = '#667eea';
        saveBtn.disabled        = false;
        statusDiv.textContent   = '';
      }, 3000);
    }

    // Try Supabase first (if logged in), then fall back to local storage
    saveToSupabase(payload, onSaved, function(errMsg) {
      warn('Supabase save failed:', errMsg, '— falling back to local');
      saveViaStorageDirect(payload, onSaved, onError);
    });
  }

  // ─── Token refresh ──────────────────────────────────────────────────────
  function refreshToken(callback) {
    chrome.storage.local.get(['gj_refresh_token', 'gj_user_email'], function(stored) {
      if (!stored.gj_refresh_token) {
        callback(null);
        return;
      }
      fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ refresh_token: stored.gj_refresh_token })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.access_token) {
          chrome.storage.local.set({
            gj_auth_token: data.access_token,
            gj_refresh_token: data.refresh_token
          }, function() {
            log('Token refreshed successfully');
            callback(data.access_token);
          });
        } else {
          warn('Token refresh failed:', data.error_description || 'unknown error');
          // Refresh failed — log out user
          chrome.storage.local.remove(['gj_auth_token', 'gj_refresh_token', 'gj_user_id', 'gj_user_email']);
          callback(null);
        }
      })
      .catch(function() {
        callback(null);
      });
    });
  }

  // ─── Save to Supabase ────────────────────────────────────────────────────
  function saveToSupabase(jobData, onSaved, onError) {
    chrome.storage.local.get(['gj_auth_token', 'gj_user_id'], function(stored) {
      if (!stored.gj_auth_token || !stored.gj_user_id) {
        onError('Sign in to save to dashboard (saved locally instead)');
        return;
      }

      var signals = (jobData.signals || []).map(function(s) {
        return {
          type: s.type,
          title: s.title || s.name,
          quote: s.quote || '',
          weight: s.weight || 0
        };
      });

      var row = {
        user_id:         stored.gj_user_id,
        job_url:         jobData.url || '',
        job_title:       jobData.title || '',
        company_name:    jobData.company || '',
        company_location: jobData.location || '',
        description:     (jobData.description || '').substring(0, 2000),
        ghost_score:     jobData.ghostScore != null ? jobData.ghostScore : 50,
        signals:         signals,
        application_status: 'not_applied'
      };

      function doSave(token) {
        fetch(SUPABASE_URL + '/rest/v1/scanned_jobs', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token,
            'Prefer':        'return=minimal'
          },
          body: JSON.stringify(row)
        })
        .then(function(res) {
          if (res.ok) {
            log('Saved to Supabase!');
            onSaved(1);
          } else if (res.status === 401) {
            // Token expired — try refresh
            log('Token expired, refreshing...');
            refreshToken(function(newToken) {
              if (newToken) {
                doSave(newToken); // Retry with fresh token
              } else {
                onError('Session expired. Please sign in again.');
              }
            });
          } else {
            // Check for duplicate (409 Conflict)
            if (res.status === 409) {
              onError('Job already saved to dashboard');
            } else {
              return res.json().then(function(e) {
                onError(e.message || e.msg || 'Supabase error');
              });
            }
          }
        })
        .catch(function(err) {
          onError(err.message);
        });
      }

      doSave(stored.gj_auth_token);
    });
  }

  function saveViaStorageDirect(jobData, onSaved, onError) {
    try {
      chrome.storage.local.get('savedJobs', function(result) {
        var jobs = (result.savedJobs || []);
        jobs.unshift(Object.assign({ id: Date.now().toString() }, jobData));
        if (jobs.length > 100) jobs.pop();
        chrome.storage.local.set({ savedJobs: jobs }, function() {
          onSaved(jobs.length);
        });
      });
    } catch(e) {
      onError('Could not save: ' + e.message);
    }
  }

  // ─── Popup message handler ────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener(function(request, _sender, sendResponse) {
    if (request.action === 'ping') {
      sendResponse({ success: true, url: location.href });
      return true;
    }
    if (request.action === 'scanFromPopup') {
      var jobData = extractJobData();
      fetchRemoteAnalysis(jobData)
        .catch(function() {
          var a = calculateLocalScore(jobData);
          return Object.assign(a, { ghostScore: a.score, source: 'local' });
        })
        .then(function(data) {
          showGhostScore(data);
          sendResponse({ success: true, data: data });
        });
      return true;
    }
  });

})();