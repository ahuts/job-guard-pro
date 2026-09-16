// GhostJob Content Script v4.1
// The content script reads LinkedIn. The extension service worker performs the
// Trust Meter request under its explicit JobGhost host permission.

(function () {
  'use strict';

  if (window.__ghostJobRunning) return;
  window.__ghostJobRunning = true;

  const BTN_ID   = 'ghostjob-scan-btn';
  const FLOAT_ID = 'ghostjob-float-btn';
  const MODAL_ID = 'ghostjob-modal-overlay';
  const SUPABASE_URL = 'https://auevehneizminspolipf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZXZlaG5laXptaW5zcG9saXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTAyMzMsImV4cCI6MjA5MDkyNjIzM30.jWbkBJkQHbVl1ui-47YZrGXT1-C3dL-6WLQrEhB6gfY';
  const FREE_SCAN_LIMIT = 3; // Free tier: 3 scans per month
  const VERSION  = '1.3.1-preview';
  // This unpacked pilot must not write scan observations or saved jobs to the
  // live Lovable Cloud database while it is exercising the Preview API.
  const PREVIEW_BUILD = true;

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
    if (location.pathname.indexOf('/jobs/') !== 0) return;
    var old = document.getElementById(BTN_ID);
    if (old) old.remove();

    poll(function() { return findSaveButton() || findButtonContainer(); }, 300, 15000)
      .then(function() { injectInlineButton(); })
      .catch(function() { log('Inline placement was not found; keeping floating scan button'); })
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
    chrome.storage.local.get(['gj_scans', 'gj_auth_token', 'gj_is_pro'], function(stored) {
      var scans = stored.gj_scans || {};
      var month = getMonthKey();
      var count = scans[month] || 0;

      // If we already know they're Pro (cached), skip limit
      if (stored.gj_is_pro) {
        callback(true, count, null);
        return;
      }

      // If logged in, check subscription status from Supabase
      if (stored.gj_auth_token) {
        checkProStatus(stored.gj_auth_token, function(isPro) {
          if (isPro) {
            // Pro user — unlimited scans
            chrome.storage.local.set({ gj_is_pro: true });
            callback(true, count, null);
          } else {
            // Free authenticated user — same 3/month limit
            if (count >= FREE_SCAN_LIMIT) {
              callback(false, count, FREE_SCAN_LIMIT);
            } else {
              callback(true, count, FREE_SCAN_LIMIT);
            }
          }
        });
      } else if (count >= FREE_SCAN_LIMIT) {
        // Not logged in — enforce free limit
        callback(false, count, FREE_SCAN_LIMIT);
      } else {
        callback(true, count, FREE_SCAN_LIMIT);
      }
    });
  }

  // ─── Check Pro/subscription status ────────────────────────────────────
  function checkProStatus(token, callback) {
    // Check if current user has Pro subscription via profiles table
    // First get user ID from the token, then check their tier
    fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token
      }
    })
    .then(function(res) { return res.json(); })
    .then(function(user) {
      if (!user.id) { callback(false); return; }
      return fetch(SUPABASE_URL + '/rest/v1/profiles?select=subscription_tier&id=eq.' + user.id + '&limit=1', {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + token
        }
      });
    })
    .then(function(res) {
      if (!res) { callback(false); return; }
      if (!res.ok) { callback(false); return; }
      return res.json();
    })
    .then(function(data) {
      if (Array.isArray(data) && data.length > 0 && data[0].subscription_tier === 'pro') {
        callback(true);
      } else {
        callback(false);
      }
    })
    .catch(function() {
      // Network error — assume free
      callback(false);
    });
  }

  function recordScan() {
    if (activeAttempt && activeAttempt.counted) return;
    if (activeAttempt) activeAttempt.counted = true;
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

      var btn = document.getElementById(BTN_ID);
      var origText = btn ? btn.textContent : '👻 Scan for Ghost Job';

    function setLoading(on) {
      if (!btn) return;
      btn.textContent = on ? '⏳ Analysing...' : origText;
      btn.disabled    = on;
      btn.style.opacity = on ? '0.65' : '1';
    }

    setLoading(true);

    prepareJobDataForScan()
      .then(function(jobData) {
        return fetchRemoteAnalysis(jobData);
      })
      .then(function(data) {
        recordScan();
        setLoading(false);
        showGhostScore(data);
      })
      .catch(function(err) {
        setLoading(false);
        warn('Trust Meter API failed:', err.message);
        showVerificationError(err.message);
      });
    }); // end checkScanLimit
  }

  // ─── Scan limit modal ─────────────────────────────────────────────────────
  function showLimitModal(count, limit) {
    // Remove any existing overlay
    var existing = document.getElementById('gj-limit-overlay');
    if (existing) existing.remove();

    // Check if user is logged in — different message for authed free users
    chrome.storage.local.get(['gj_auth_token'], function(auth) {
      var isLoggedIn = !!auth.gj_auth_token;
      var heading = isLoggedIn ? 'Free Plan Limit Reached' : 'Free Scan Limit Reached';
      var bodyText = isLoggedIn
        ? 'You\'ve used <strong>' + count + '/' + limit + '</strong> free scans this month. Upgrade to Pro for unlimited scans.'
        : 'You\'ve used <strong>' + count + '/' + limit + '</strong> free scans this month. Sign in to save jobs and get more scans.';
      var ctaText = isLoggedIn ? '🚀 Upgrade to Pro' : 'Sign In';
      var ctaLink = isLoggedIn ? 'https://www.jobghost.io/#pricing' : null;

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
        '<h3 style="margin:0 0 8px;color:#1e293b;font-size:20px">' + heading + '</h3>',
        '<p style="color:#64748b;font-size:14px;margin:0 0 20px">',
        bodyText,
        '</p>',
        '<div style="display:flex;gap:10px;justify-content:center">',
        '<button id="gj-limit-close" style="padding:10px 20px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:14px;color:#64748b">Close</button>',
        '<button id="gj-limit-cta" style="padding:10px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#667eea,#7c3aed);cursor:pointer;font-size:14px;color:#fff;font-weight:600">' + ctaText + '</button>',
        '</div>'
      ].join('');

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
      document.getElementById('gj-limit-close').addEventListener('click', function() { overlay.remove(); });
      document.getElementById('gj-limit-cta').addEventListener('click', function() {
        overlay.remove();
        if (isLoggedIn && ctaLink) {
          // Logged in free user — open pricing page
          window.open(ctaLink, '_blank');
        } else {
          // Not logged in — show toolbar hint
          var hint = document.createElement('div');
          hint.style.cssText = 'position:fixed;top:20px;right:20px;background:#667eea;color:#fff;padding:12px 20px;border-radius:8px;z-index:2147483647;font-size:14px;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
          hint.textContent = '👆 Click the GhostJob icon in your toolbar to sign in';
          document.body.appendChild(hint);
          setTimeout(function() { hint.remove(); }, 5000);
        }
      });
    });
  }

  // ─── Remote API call ──────────────────────────────────────────────────────
  // The website and extension use this same API as the sole scoring authority.
  function getFirstObservedAt(jobData) {
    var key = (jobData.url || jobData.title + '|' + jobData.company).replace(/[.#$\[\]/]/g, '_');
    return new Promise(function(resolve) {
      chrome.storage.local.get(['gj_scan_observations_v2'], function(stored) {
        var observations = stored.gj_scan_observations_v2 || {};
        var now = new Date().toISOString();
        var firstObservedAt = observations[key] || now;
        observations[key] = firstObservedAt;
        var keys = Object.keys(observations);
        if (keys.length > 250) {
          keys.sort(function(a, b) { return observations[a].localeCompare(observations[b]); });
          while (keys.length > 250) delete observations[keys.shift()];
        }
        chrome.storage.local.set({ gj_scan_observations_v2: observations }, function() {
          resolve(firstObservedAt);
        });
      });
    });
  }

  function fetchRemoteAnalysis(jobData, mode) {
    return getFirstObservedAt(jobData).then(function(firstObservedAt) {
      // Content scripts inherit LinkedIn's network context. Route the request
      // through the extension service worker, which has the explicit JobGhost
      // host permission and can wait through a Vercel cold start.
      var scanRequest = {
        scoringVersion: 3,
        scanMode: mode || 'standard',
        scanAttemptId: jobData.scanAttemptId,
        employerUrl: jobData.employerUrl || undefined,
        requisitionId: jobData.requisitionId || undefined,
        coverageDetails: jobData.coverageDetails,
        url: jobData.url,
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        description: jobData.description,
        salary: jobData.salary,
        applicationUrl: jobData.applicationUrl || undefined,
        companyLinkedInUrl: jobData.companyLinkedInUrl || undefined,
        reposted: jobData.isReposted,
        postedAt: jobData.postedAgo,
        applicants: jobData.applicants,
        employmentType: jobData.employmentType,
        experienceLevel: jobData.experienceLevel,
        promoted: jobData.promoted,
        activelyReviewing: jobData.activelyReviewing,
        applicationMethod: jobData.applicationMethod,
        descriptionCoverage: jobData.descriptionCoverage,
        firstObservedAt: firstObservedAt
      };
      return new Promise(function(resolve, reject) {
        chrome.runtime.sendMessage({ action: 'scanJob', jobData: scanRequest }, function(response) {
          if (chrome.runtime.lastError) {
            reject(new Error('Extension connection failed. Reload GhostJob and retry.'));
            return;
          }
          if (!response || !response.success) {
            reject(new Error(response && response.error ? response.error : 'Trust Meter request failed'));
            return;
          }
          if (jobData.jobId && jobData.jobId !== GhostJobContext.key()) { reject(new Error('The selected job changed. Please scan again.')); return; }
          persistObservationIfSignedIn(jobData, response.data, firstObservedAt);
          resolve(response.data);
        });
      });
    });
  }

  // Signed-out observations remain in extension storage. Once signed in, this
  // best-effort upsert writes only to the current user's RLS-protected history.
  function persistObservationIfSignedIn(jobData, result, firstObservedAt) {
    if (PREVIEW_BUILD) return;
    chrome.storage.local.get(['gj_auth_token', 'gj_user_id'], function(stored) {
      if (!stored.gj_auth_token || !stored.gj_user_id) return;
      var jobKey = (jobData.url || jobData.title + '|' + jobData.company).replace(/[.#$\[\]/]/g, '_');
      fetch(SUPABASE_URL + '/rest/v1/scan_observations?on_conflict=user_id,job_key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + stored.gj_auth_token,
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          user_id: stored.gj_user_id,
          job_key: jobKey,
          job_url: jobData.url,
          job_title: jobData.title,
          company_name: jobData.company,
          company_location: jobData.location,
          first_observed_at: firstObservedAt,
          last_observed_at: new Date().toISOString(),
          reposted: Boolean(jobData.isReposted),
          careers_verification: result.careersVerification || 'unverified',
          scoring_version: result.scoringVersion || 2
        })
      }).catch(function() { /* scanning remains available if history sync fails */ });
    });
  }

  // ─── Extract job data (Bug #4, #5, #6: multiple selectors from original) ──
  function extractJobData() {
    var scope = GhostJobContext.root();
    if (!scope) throw new Error("Job details are still loading. Retry or enter the details manually.");
    var data = { url: location.href, title: '', company: '', location: '', description: '', salary: '', fullPageText: '', postedAgo: '', isReposted: false, applicationUrl: '', companyLinkedInUrl: '', applicants: '', employmentType: '', experienceLevel: '', promoted: false, activelyReviewing: false, applicationMethod: 'unknown', descriptionCoverage: 'unavailable' };

    // Title - LinkedIn uses different class names for the logged-in card,
    // guest card, and its periodic UI experiments.
    var titleSelectors = [
      'h1.top-card-layout__title',
      'h1.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title-link',
      '.job-details-jobs-unified-top-card__job-title-link',
      '[data-test-job-title]',
      'h1[data-testid="job-title"]',
      'h1'
    ];
    for (var i = 0; i < titleSelectors.length; i++) {
      var el = scope.querySelector(titleSelectors[i]);
      if (el && el.textContent.trim()) { data.title = el.textContent.trim(); break; }
    }

    // Company - likewise support the current unified top-card markup before
    // falling back to any company-profile link on the page.
    var companySelectors = [
      '.top-card-layout__card a[href*="/company/"]',
      '.jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '[data-test-company-name]',
      'a[href*="/company/"]',
      '.artdeco-entity-lockup__subtitle'
    ];
    for (var i = 0; i < companySelectors.length; i++) {
      var el = scope.querySelector(companySelectors[i]);
      if (el && el.textContent.trim()) { data.company = el.textContent.trim(); break; }
    }
    var companyLink = scope.querySelector('a[href*="/company/"]');
    if (companyLink && companyLink.href) data.companyLinkedInUrl = companyLink.href;

    // LinkedIn can render the visible top card after the extension has loaded.
    // Its document title and JSON-LD are useful neutral fallbacks while that
    // DOM work is in progress.
    var metadataTitle = scope.querySelector('meta[property="og:title"]');
    var standalone = /\/jobs\/view\//.test(location.pathname) && !new URL(location.href).searchParams.has('currentJobId');
    var titleText = standalone ? ((metadataTitle && metadataTitle.content) || document.title || '') : '';
    var titleMatch = titleText.match(/^(.+?)\s+(?:at|@)\s+(.+?)\s*(?:\||\u2013|\u2014)\s*LinkedIn/i);
    if (titleMatch) {
      if (!data.title) data.title = titleMatch[1].trim();
      if (!data.company) data.company = titleMatch[2].trim();
    }
    // Current logged-in LinkedIn pages use "Role | Company | LinkedIn - URL"
    // instead of placing the title in an h1.
    var pipeTitleMatch = titleText.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*LinkedIn(?:\s*[-|].*)?$/i);
    if (pipeTitleMatch) {
      if (!data.title) data.title = pipeTitleMatch[1].trim();
      if (!data.company) data.company = pipeTitleMatch[2].trim();
    }

    if (!data.title || !data.company) {
      var schemaScripts = scope.querySelectorAll('script[type="application/ld+json"]');
      for (var schemaIndex = 0; schemaIndex < schemaScripts.length; schemaIndex++) {
        try {
          var schema = JSON.parse(schemaScripts[schemaIndex].textContent || '{}');
          var entries = Array.isArray(schema) ? schema : (schema['@graph'] || [schema]);
          for (var entryIndex = 0; entryIndex < entries.length; entryIndex++) {
            var entry = entries[entryIndex] || {};
            var type = entry['@type'];
            var isJobPosting = type === 'JobPosting' || (Array.isArray(type) && type.indexOf('JobPosting') !== -1);
            if (!isJobPosting) continue;
            if (!data.title && typeof entry.title === 'string') data.title = entry.title.trim();
            if (!data.company && entry.hiringOrganization && typeof entry.hiringOrganization.name === 'string') {
              data.company = entry.hiringOrganization.name.trim();
            }
            break;
          }
        } catch (_) { /* Skip malformed third-party JSON-LD. */ }
        if (data.title && data.company) break;
      }
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
      var el = scope.querySelector(locationSelectors[i]);
      if (el && el.textContent.trim()) {
        data.location = el.textContent.trim();
        break;
      }
    }
    // Fallback 1: LinkedIn's bullet-separated metadata pattern
    // Pattern: <p>...<span>Ogden, UT</span> · <span>2 months ago</span> · <span>100 applicants</span></p>
    // The first <span> in a ·-separated <p> that isn't a date/applicant count is the location
    if (!data.location) {
      var paragraphs = scope.querySelectorAll('p');
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
      var companyEl = scope.querySelector('a[href*="/company/"]');
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
    var postedSpans = scope.querySelectorAll('span');
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
    var pageText = scope.innerText || scope.textContent || '';
    var applicantMatch = pageText.match(/(?:over\s+)?([\d,]+)\s+applicants?/i);
    if (applicantMatch) data.applicants = applicantMatch[0].trim();
    var employmentMatch = pageText.match(/\b(Full-time|Part-time|Contract|Temporary|Internship)\b/i);
    if (employmentMatch) data.employmentType = employmentMatch[1];
    var experienceMatch = pageText.match(/\b(Entry level|Associate|Mid-Senior level|Director|Executive)\b/i);
    if (experienceMatch) data.experienceLevel = experienceMatch[1];
    data.promoted = /promoted by hirer/i.test(pageText);
    data.activelyReviewing = /actively reviewing applicants/i.test(pageText);

    // Salary — class-agnostic extraction (like location)
    // Strategy: (1) specific selectors, (2) scan page for salary patterns in spans, (3) regex on full page text
    var salarySelectors = [
      '[data-testid="job-salary"]',
      '.job-details-jobs-unified-top-card__salary',
      '.salary-info',
      '.top-card-layout__salary'
    ];
    for (var i = 0; i < salarySelectors.length; i++) {
      var el = scope.querySelector(salarySelectors[i]);
      if (el && el.textContent.trim()) { data.salary = el.textContent.trim(); break; }
    }
    // Fallback: scan all spans for salary patterns like $120K/yr, $85,000 - $120,000, etc.
    if (!data.salary) {
      var allSpans = scope.querySelectorAll('span');
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
      var paras = scope.querySelectorAll('p');
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
      var el = scope.querySelector(descSelectors[i]);
      if (el && el.textContent.trim()) {
        data.description = el.textContent.trim().substring(0, 4000);
        break;
      }
    }
    data.descriptionCoverage = data.description ? 'partial' : 'unavailable';

    // Full page text — for signal detection beyond just the description.
    data.fullPageText = (data.description + ' ' + data.salary).trim();

    Object.assign(data, GhostJobContext.application(scope));
    var applyControls = Array.from(scope.querySelectorAll('button, a, [role="button"]'));
    var applyText = applyControls.map(function(el) { return ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')).trim(); }).join(' ');
    if (/easy apply/i.test(applyText)) data.applicationMethod = 'linkedin_easy_apply';
    else if (data.applicationUrl) data.applicationMethod = 'external_apply';
    else if (/\bapply\b/i.test(applyText)) data.applicationMethod = 'linkedin_apply';

    data.jobId = GhostJobContext.key();
    if (data.jobId) data.url = 'https://www.linkedin.com/jobs/view/' + data.jobId + '/';

    return data;
  }

  var lastScannedJob = null;
  var activeAttempt = null;
  function prepareJobDataForScan() {
    var expectedKey = GhostJobContext.key();
    if (!activeAttempt || activeAttempt.key !== expectedKey) activeAttempt = { key: expectedKey, id: crypto.randomUUID(), counted: false };
    return waitForJobIdentity(5000).then(async function(data) {
      var description = await GhostJobContext.readDescription(expectedKey);
      if (GhostJobContext.key() !== expectedKey) throw new Error('The selected job changed. Please scan again.');
      Object.assign(data, description);
      data.fullPageText = (data.description + ' ' + data.salary).trim();
      data.scanAttemptId = activeAttempt.id;
      lastScannedJob = data;
      return data;
    });
  }

  function waitForJobIdentity(timeoutMs) {
    return new Promise(function(resolve, reject) {
      var elapsed = 0;
      var interval = 250;
      function read() {
        var jobData;
        try { jobData = extractJobData(); } catch (_) { return false; }
        if (jobData.title && jobData.company) {
          resolve(jobData);
          return true;
        }
        return false;
      }
      if (read()) return;
      var timer = setInterval(function() {
        elapsed += interval;
        if (read()) {
          clearInterval(timer);
          return;
        }
        if (elapsed >= timeoutMs) {
          clearInterval(timer);
          reject(new Error('Could not read the job title or company from LinkedIn. Refresh the job page, wait for its details to load, then retry.'));
        }
      }, interval);
    });
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

  var SIGNAL_CATALOG = [
    { id:'reposted_job', category:'Red Flags', label:'Reposted Job', type:'red', scoreImpact:-10, matchTitles:['Reposted Job'], checkText:'Checked whether LinkedIn marked this listing as reposted.' },
    { id:'urgency_language', category:'Red Flags', label:'Urgency Language', type:'red', scoreImpact:-10, matchTitles:['Urgency Language'], checkText:'Looked for urgent hiring language like ASAP, immediate, or hiring now.' },
    { id:'buzzy_titles', category:'Red Flags', label:'Buzzy Job Titles', type:'red', scoreImpact:-10, matchTitles:['Buzzy Job Titles'], checkText:'Looked for unclear title words like rockstar, ninja, guru, wizard, or unicorn.' },
    { id:'vague_salary', category:'Red Flags', label:'Vague Salary Info', type:'red', scoreImpact:-8, matchTitles:['Vague Salary Info'], checkText:'Looked for vague pay language like competitive salary without numbers.' },
    { id:'understaffed_code', category:'Red Flags', label:'Code for Understaffed', type:'red', scoreImpact:-8, matchTitles:['Code for Understaffed'], checkText:'Looked for workload euphemisms like wear many hats or all hands on deck.' },
    { id:'unlimited_pto', category:'Red Flags', label:'"Unlimited" PTO', type:'red', scoreImpact:-6, matchTitles:['"Unlimited" PTO'], checkText:'Looked for unlimited PTO or take time as needed language.' },
    { id:'high_experience', category:'Red Flags', label:'High Experience Requirements', type:'red', scoreImpact:-6, matchTitles:['High Experience Requirements'], checkText:'Checked for high years-of-experience requirements.' },
    { id:'unrealistic_experience', category:'Red Flags', label:'Unrealistic Experience Combo', type:'red', scoreImpact:-8, matchTitles:['Unrealistic Experience Combo'], checkText:'Checked for unusually high experience requirements or conflicting senior/junior level signals.' },
    { id:'vague_description', category:'Red Flags', label:'Vague Description', type:'red', scoreImpact:-6, matchTitles:['Vague Description'], checkText:'Measured whether the job description has enough role-specific substance.' },
    { id:'no_salary_range', category:'Yellow Flags', label:'No Salary Range Listed', type:'yellow', scoreImpact:-4, matchTitles:['No Salary Range Listed'], checkText:'Checked the posting and page text for a concrete salary range or number.' },
    { id:'no_team_manager', category:'Yellow Flags', label:'No Team or Manager Mentioned', type:'yellow', scoreImpact:-4, matchTitles:['No Team or Manager Mentioned'], checkText:'Looked for team, manager, reporting, supervisor, or mentor context.' },
    { id:'vague_location', category:'Yellow Flags', label:'Vague Location', type:'yellow', scoreImpact:-3, matchTitles:['Vague Location'], checkText:'Looked for vague location language like various locations or location flexible.' },
    { id:'no_location', category:'Yellow Flags', label:'No Location Listed', type:'yellow', scoreImpact:-3, matchTitles:['No Location Listed'], checkText:'Checked whether a usable location was extracted from the listing.' },
    { id:'ai_language', category:'Yellow Flags', label:'AI-Generated Language Patterns', type:'yellow', scoreImpact:-3, matchTitles:['AI-Generated Language Patterns'], checkText:'Looked for clusters of generic AI-style phrases and business buzzwords.' },
    { id:'culture_contradiction', category:'Yellow Flags', label:'Culture Buzzwords + Red Flags', type:'yellow', scoreImpact:-4, matchTitles:['Culture Buzzwords + Red Flags'], checkText:'Checked whether positive culture claims appear alongside stronger red flags.' },
    { id:'stale_listing', category:'Yellow Flags', label:'Stale Listing', type:'yellow', scoreImpact:-6, matchTitles:['Stale Listing'], checkText:'Checked whether the listing age is 30 days or older when posted-age data is available.' },
    { id:'salary_transparency', category:'Green Flags', label:'Salary Transparency', type:'green', scoreImpact:10, matchTitles:['Salary Transparency'], checkText:'Looked for specific salary numbers or ranges.' },
    { id:'flexible_work', category:'Green Flags', label:'Flexible Work Options', type:'green', scoreImpact:5, matchTitles:['Flexible Work Options'], checkText:'Looked for remote, hybrid, flexible, WFH, or work-from-home options.' },
    { id:'benefits', category:'Green Flags', label:'Benefits Mentioned', type:'green', scoreImpact:6, matchTitles:['Benefits Mentioned'], checkText:'Looked for concrete benefits like health insurance, 401k, dental, or vision.' },
    { id:'growth', category:'Green Flags', label:'Growth Opportunities', type:'green', scoreImpact:5, matchTitles:['Growth Opportunities'], checkText:'Looked for training, learning budget, professional development, or growth opportunities.' },
    { id:'hiring_contact', category:'Green Flags', label:'Hiring Manager Contact', type:'green', scoreImpact:4, matchTitles:['Hiring Manager Contact'], checkText:'Looked for a hiring manager, direct contact, DM, or recruiter contact language.' },
    { id:'clear_requirements', category:'Green Flags', label:'Clear, Specific Requirements', type:'green', scoreImpact:6, matchTitles:['Clear, Specific Requirements'], checkText:'Checked for concrete responsibilities, qualifications, tools, bullets, and measurable scope.' }
  ];

  var API_SIGNAL_CATALOG = [
    { id:'api_active_careers_page', category:'Enhanced/API Signals', label:'Active Careers Page', type:'green', scoreImpact:5, matchTitles:['Active Careers Page'], checkText:'Checked whether the company appears to have an active careers page.' },
    { id:'api_layoff_language', category:'Enhanced/API Signals', label:'Layoff Language Detected', type:'red', scoreImpact:-8, matchTitles:['Layoff Language Detected'], checkText:'Checked company-level context for layoff or hiring-freeze language.' },
    { id:'api_reposted_job', category:'Enhanced/API Signals', label:'API Reposted Job Listing', type:'red', scoreImpact:-8, matchTitles:['Reposted Job Listing', 'API Reposted Job Listing'], checkText:'Checked API/company context for reposted-listing signals.' }
  ];

  function normalizeSignalTitle(title) {
    return String(title || '').toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').trim();
  }

  function signalMatchesCatalog(signal, item) {
    var title = normalizeSignalTitle(signal && (signal.title || signal.name));
    return (item.matchTitles || [item.label]).some(function(matchTitle) {
      return title === normalizeSignalTitle(matchTitle);
    });
  }

  function buildSignalChecklist(signals, overrides, includeApiSignals) {
    var detectedSignals = signals || [];
    var checklist = SIGNAL_CATALOG.map(function(item) {
      var detected = detectedSignals.some(function(signal) { return signalMatchesCatalog(signal, item); });
      var status = detected
        ? (item.type === 'green' ? 'Found' : 'Detected')
        : (item.type === 'green' ? 'Not found' : 'Passed');
      if (overrides && overrides[item.id]) status = overrides[item.id];
      return Object.assign({}, item, {
        status: status,
        checked: status !== 'Not enough data'
      });
    });

    if (includeApiSignals) {
      checklist = checklist.concat(API_SIGNAL_CATALOG.map(function(item) {
        var detected = detectedSignals.some(function(signal) { return signalMatchesCatalog(signal, item); });
        var status = detected
          ? (item.type === 'green' ? 'Found' : 'Detected')
          : (item.type === 'green' ? 'Not found' : 'Passed');
        return Object.assign({}, item, {
          status: status,
          checked: true
        });
      }));
    }

    return checklist;
  }

  function appendApiSignalChecklist(checklist, signals, companyData) {
    var detectedSignals = signals || [];
    return (checklist || []).concat(API_SIGNAL_CATALOG.map(function(item) {
      var detected = detectedSignals.some(function(signal) { return signalMatchesCatalog(signal, item); });
      var status = detected
        ? (item.type === 'green' ? 'Found' : 'Detected')
        : (item.type === 'green' ? 'Not found' : 'Passed');
      if (item.id === 'api_active_careers_page' && companyData && companyData.hasCareersPage === null) {
        status = 'Not enough data';
      }
      if (item.id === 'api_layoff_language' && companyData && companyData.recentLayoffs === null) {
        status = 'Not enough data';
      }
      return Object.assign({}, item, {
        status: status,
        checked: status !== 'Not enough data'
      });
    }));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Local scoring (v4.2 - bugs fixed + 8 new signals + quotes) ────────────
  // Retained only to read older locally saved payloads; v2 never calls it.
  function calculateLegacyScoreUnused(jobData) {
    var score = 50, signals = [];
    var checklistOverrides = {};
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
      } else {
        checklistOverrides.stale_listing = 'Not enough data';
      }
    } else {
      checklistOverrides.stale_listing = 'Not enough data';
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
    // Clear, specific requirements
    var requirementMarkerRe = /requirements?|qualifications?|responsibilities|what you'?ll do|you will|we'?re looking for|preferred qualifications|must have|nice to have/i;
    var specificDetailRe = /responsible for|experience with|proficiency in|knowledge of|build|design|implement|manage|own|collaborate|partner|support|deliver/i;
    var toolSkillRe = /\b(react|typescript|javascript|python|sql|aws|azure|gcp|salesforce|hubspot|excel|tableau|figma|node|java|kubernetes|docker|postgres|graphql|api|crm|saas|jira)\b/i;
    var measurableScopeRe = /\b\d+\+?\s*(users|customers|clients|employees|years|projects|systems|markets|accounts)|\b\d+%|\$\d/i;
    var bulletMatches = descOrig.match(/(^|\n)\s*(?:[-*•]|\d+\.)\s+\S/g) || [];
    var detailSignals = 0;
    if (requirementMarkerRe.test(desc)) detailSignals++;
    if (specificDetailRe.test(desc)) detailSignals++;
    if (toolSkillRe.test(desc)) detailSignals++;
    if (measurableScopeRe.test(desc)) detailSignals++;
    if (bulletMatches.length >= 3) detailSignals++;

    if (desc.length >= 500 && detailSignals >= 3) {
      var q = extractQuote(descOrig, requirementMarkerRe) ||
              extractQuote(descOrig, toolSkillRe) ||
              descOrig.substring(0, 140).trim() + (descOrig.length > 140 ? '...' : '');
      score += 6;
      signals.push({ type:'green', icon:'ðŸ“‹', title:'Clear, Specific Requirements',
        description:'The posting includes concrete responsibilities, qualifications, tools, or measurable scope.',
        impact:'Specific requirements usually mean the team understands the role and is actively hiring for a real need.',
        advice:'Use these details to tailor your application and ask sharper interview questions.',
        quote: q });
    }

    // Finalize - higher = safer (Trust Score)
    // ═══════════════════════════════════════════════════════════════════════
    score = Math.max(0, Math.min(100, score));
    var trustScore = score;
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
    return {
      score: trustScore,
      signals: signals,
      summary: summary,
      recommendation: recommendation,
      auditChecklist: buildSignalChecklist(signals, checklistOverrides, false)
    };
  }

  // Legacy renderer retained for backward compatibility with old saved payloads.
  // The v2 showGhostScore implementation below is the only active renderer.
  function showLegacyGhostScoreUnused(result) {
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
            '<span style="font-size:16px">'+escapeHtml(s.icon || '')+'</span>' +
            '<span style="font-weight:600;color:#333;font-size:13px">'+escapeHtml(s.title)+'</span>' +
            '<span style="margin-left:auto;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;background:'+tbg+';color:'+tfg+'">'+escapeHtml(s.type)+'</span>' +
          '</div>' +
          '<div style="font-size:12px;color:#555;margin-bottom:4px;padding-left:24px">'+escapeHtml(s.description)+'</div>' +
          (s.quote ? '<div style="font-size:11px;color:#6b7280;padding:6px 10px;margin:4px 0 4px 24px;background:#f3f4f6;border-radius:4px;border-left:2px solid '+bdr+';font-style:italic">💬 "'+escapeHtml(s.quote)+'"</div>' : '') +
          '<div style="font-size:11px;color:#666;padding-left:24px;margin-bottom:4px"><strong>Impact:</strong> '+escapeHtml(s.impact)+'</div>' +
          '<div style="font-size:11px;color:#2563eb;padding-left:24px"><strong>💡 Tip:</strong> '+escapeHtml(s.advice)+'</div>' +
        '</div>';
      }).join('');
      signalsHtml = '<div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:16px">' +
        '<div style="font-size:14px;font-weight:600;color:#333;margin-bottom:12px">📊 Signals Detected ('+result.signals.length+')</div>' +
        '<div style="max-height:300px;overflow-y:auto">'+rows+'</div></div>';
    }

    var checklistHtml = '';
    if (result.auditChecklist && result.auditChecklist.length) {
      var grouped = {};
      result.auditChecklist.forEach(function(item) {
        var category = item.category || 'Other Signals';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(item);
      });
      var categoryOrder = ['Red Flags', 'Yellow Flags', 'Green Flags', 'Enhanced/API Signals'];
      var checkedCount = result.auditChecklist.filter(function(item) { return item.checked !== false; }).length;
      var groupsHtml = categoryOrder.filter(function(category) {
        return grouped[category] && grouped[category].length;
      }).map(function(category) {
        var rows = grouped[category].map(function(item) {
          var isDetected = item.status === 'Detected';
          var isFound = item.status === 'Found';
          var isUnknown = item.status === 'Not enough data';
          var statusBg = isDetected ? '#fee2e2' : isFound ? '#dcfce7' : isUnknown ? '#f3f4f6' : '#eef2ff';
          var statusFg = isDetected ? '#b91c1c' : isFound ? '#15803d' : isUnknown ? '#6b7280' : '#3730a3';
          var dot = item.type === 'red' ? '#ef4444' : item.type === 'green' ? '#22c55e' : '#eab308';
          var scoreText = item.scoreImpact > 0 ? '+' + item.scoreImpact : String(item.scoreImpact || 0);
          return '<div style="display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:8px;align-items:start;padding:8px 0;border-bottom:1px solid #f3f4f6">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:'+dot+';margin-top:5px"></span>' +
            '<div style="min-width:0">' +
              '<div style="display:flex;gap:6px;align-items:center;min-width:0">' +
                '<span style="font-size:12px;font-weight:600;color:#374151;overflow-wrap:anywhere">'+escapeHtml(item.label)+'</span>' +
                '<span style="font-size:10px;color:#6b7280;white-space:nowrap">'+escapeHtml(scoreText)+'</span>' +
              '</div>' +
              '<div style="font-size:11px;color:#6b7280;margin-top:2px;line-height:1.35">'+escapeHtml(item.checkText)+'</div>' +
            '</div>' +
            '<span style="padding:2px 6px;border-radius:999px;background:'+statusBg+';color:'+statusFg+';font-size:10px;font-weight:700;white-space:nowrap">'+escapeHtml(item.status)+'</span>' +
          '</div>';
        }).join('');
        return '<div style="margin-bottom:12px">' +
          '<div style="font-size:12px;font-weight:700;color:#111827;margin-bottom:4px">'+escapeHtml(category)+'</div>' +
          rows +
        '</div>';
      }).join('');
      checklistHtml = '<div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:16px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">' +
          '<div style="font-size:14px;font-weight:600;color:#333">Signal Checklist ('+checkedCount+' checked)</div>' +
          '<div style="font-size:11px;color:#6b7280">Transparency audit</div>' +
        '</div>' +
        '<div style="max-height:360px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;background:#fff">'+groupsHtml+'</div>' +
      '</div>';
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
        (result.summary ? '<div style="font-size:14px;color:#444;margin-bottom:16px;padding:12px;background:#f9fafb;border-radius:8px;border-left:3px solid '+color+'"><strong>Summary:</strong> '+escapeHtml(result.summary)+'</div>' : '') +
        signalsHtml +
        checklistHtml +
        (result.recommendation ? '<div style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:8px;border-left:3px solid '+color+'"><div style="font-size:14px;color:#444"><strong>🎯 Recommendation:</strong> '+escapeHtml(result.recommendation)+'</div></div>' : '') +
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
  // Replaces the legacy panel above. It intentionally consumes only the v2 API
  // response so extension and website present the same score and evidence.
  function showGhostScore(result) {
    var old = document.getElementById(MODAL_ID);
    if (old) old.remove();

    var score = Number(result.trustScore);
    if (!isFinite(score)) score = 50;
    var presentation = {
      highly_verified: { label: 'Highly Verified', risk: 'Low Ghost Risk', color: '#16a34a', ghost: '👻' },
      positive: { label: 'Positive Signals', risk: 'Low–Moderate Ghost Risk', color: '#d97706', ghost: '👻' },
      unverified: { label: 'Needs Verification', risk: 'Ghost Risk: Unclear', color: '#64748b', ghost: '👻?' },
      weak: { label: 'Weakly Supported', risk: 'High Ghost Risk', color: '#dc2626', ghost: '👻' },
      contradictory: { label: 'Contradictory Evidence', risk: 'Very High Ghost Risk', color: '#b91c1c', ghost: '👻!' }
    }[result.trustBand] || { label: 'Needs Verification', risk: 'Ghost Risk: Unclear', color: '#64748b', ghost: '👻?' };

    var allEvidence = result.evidence || [];

    function pointsPill(points) {
      var numericPoints = Number(points || 0);
      var color = numericPoints > 0 ? '#15803d' : numericPoints < 0 ? '#b91c1c' : '#475569';
      var background = numericPoints > 0 ? '#dcfce7' : numericPoints < 0 ? '#fee2e2' : '#f1f5f9';
      var label = numericPoints > 0 ? '+' + numericPoints + ' points' : numericPoints < 0 ? numericPoints + ' points' : 'Neutral';
      return '<span style="display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;background:' + background + ';color:' + color + ';font-size:10px;font-weight:800;white-space:nowrap">' + label + '</span>';
    }

    function groupRows(group, heading, icon, accent) {
      var evidence = allEvidence.filter(function(item) { return item.group === group; });
      if (!evidence.length) return '';
      return '<section style="margin-top:18px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px;font-weight:800;color:#1f2937;margin-bottom:8px"><span>' + icon + ' ' + heading + '</span><span style="font-size:11px;color:#64748b;font-weight:600">' + evidence.length + '</span></div>' +
        evidence.map(function(item) {
          return '<div style="padding:12px;margin:7px 0;border-radius:10px;background:#fff;border:1px solid #e2e8f0;border-left:3px solid ' + accent + '">' +
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px"><div style="font-size:13px;font-weight:750;color:#1e293b;line-height:1.35">' + escapeHtml(item.label || item.title || 'Signal') + '</div>' + pointsPill(item.points) + '</div>' +
            '<div style="font-size:12px;color:#475569;margin-top:5px;line-height:1.45">' + escapeHtml(item.description || '') + '</div>' +
            (item.sourceUrl ? '<a href="' + escapeHtml(item.sourceUrl) + '" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:7px;font-size:12px;font-weight:700;color:#4338ca;text-decoration:underline">View public source ↗</a>' : '') +
          '</div>';
        }).join('') + '</section>';
    }

    function hasEvidence(id) {
      return allEvidence.some(function(item) { return item.id === id; });
    }

    var verificationChecks = [
      { id: 'exact-role-match', label: 'Exact employer or ATS role match', points: 25, hint: 'Needs the same normalized title and compatible location on a live public employer or ATS source.' },
      { id: 'application-active', label: 'Active application destination', points: 10, hint: 'Needs a live application path for that verified role.' },
      { id: 'company-identity', label: 'Company identity match', points: 5, hint: 'Needs LinkedIn and the public source to identify the same company.' },
      { id: 'current-source', label: 'Current source evidence', points: 5, hint: 'Needs current posting or update evidence from the public source.' },
      { id: 'concrete-details', label: 'Concrete responsibilities and qualifications', points: 5, hint: 'Needs specific role scope, responsibilities, and qualifications in the listing.' }
    ];
    var verificationChecklist = verificationChecks.map(function(check) {
      var verified = hasEvidence(check.id);
      return '<div style="display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:8px;align-items:start;padding:9px 0;border-bottom:1px solid #eef2f7">' +
        '<span aria-hidden="true" style="width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:' + (verified ? '#dcfce7' : '#f1f5f9') + ';color:' + (verified ? '#15803d' : '#64748b') + ';font-size:12px;font-weight:800">' + (verified ? '✓' : '?') + '</span>' +
        '<div><div style="font-size:12px;font-weight:750;color:#334155;line-height:1.35">' + escapeHtml(check.label) + '</div><div style="font-size:11px;color:#64748b;line-height:1.4;margin-top:2px">' + escapeHtml(verified ? 'Verified from this scan.' : check.hint) + '</div></div>' +
        '<span style="font-size:11px;font-weight:800;color:' + (verified ? '#15803d' : '#64748b') + ';white-space:nowrap">' + (verified ? '+' + check.points : '+' + check.points + ' available') + '</span>' +
      '</div>';
    }).join('');
    var scoredEvidence = allEvidence.filter(function(item) { return Number(item.points || 0) !== 0; });
    var calculationRows = '<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #e2e8f0"><span style="font-size:12px;font-weight:750;color:#334155">Neutral starting point</span><span style="font-size:12px;font-weight:800;color:#334155">50</span></div>' +
      (scoredEvidence.length ? scoredEvidence.map(function(item) {
        var points = Number(item.points || 0);
        return '<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eef2f7"><span style="font-size:12px;color:#475569">' + escapeHtml(item.label || item.title || 'Evidence') + '</span><span style="font-size:12px;font-weight:800;color:' + (points > 0 ? '#15803d' : '#b91c1c') + '">' + (points > 0 ? '+' : '') + points + '</span></div>';
      }).join('') : '<div style="padding:10px 0;font-size:12px;line-height:1.45;color:#64748b">No public verification points or concrete deductions were found in this scan, so the score remains neutral.</div>');
    var quality = (result.qualityBadges || []).map(function(item) {
      return '<span style="display:inline-block;margin:4px 4px 0 0;padding:5px 8px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:600">' + escapeHtml(item.label || item.title || item) + '</span>';
    }).join('');
    var coverage = result.descriptionCoverage;
    var coverageLabel = { expanded: 'Expanded full job details', complete: 'Analyzed full job details', partial: 'Partial job details available', unavailable: 'Job details unavailable' }[coverage] || 'Coverage unavailable';
    var coverageColor = coverage === 'expanded' || coverage === 'complete' ? '#15803d' : coverage === 'partial' ? '#a16207' : '#64748b';
    var insightGroups = [
      { id: 'role', label: 'Role Snapshot', icon: '📋' },
      { id: 'quality', label: 'Job Quality', icon: '✨' },
      { id: 'application', label: 'Application Path', icon: '↗' },
      { id: 'posting', label: 'Posting Context', icon: '◷' }
    ];
    var insightsHtml = insightGroups.map(function(group) {
      var items = (result.jobInsights || []).filter(function(item) { return item.group === group.id; });
      if (!items.length) return '';
      return '<details style="margin-top:18px"><summary style="font-size:14px;font-weight:800;color:#1f2937;margin-bottom:8px;cursor:pointer">' + group.icon + ' ' + group.label + '</summary><div style="border:1px solid #e2e8f0;border-radius:10px;padding:2px 12px;background:#fff">' +
        items.map(function(item) { return '<div style="padding:9px 0;border-bottom:1px solid #eef2f7"><div style="font-size:12px;font-weight:750;color:#334155">' + escapeHtml(item.label) + '</div><div style="font-size:12px;line-height:1.45;color:#64748b;margin-top:2px">' + escapeHtml(item.detail) + '</div></div>'; }).join('') +
      '</div></details>';
    }).join('');
    var questionsHtml = (result.suggestedQuestions || []).length ? '<details style="margin-top:18px;padding:14px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a"><summary style="font-size:14px;font-weight:800;color:#713f12;cursor:pointer">💬 Questions to Ask</summary><ul style="margin:8px 0 0;padding-left:18px;font-size:12px;line-height:1.55;color:#713f12">' + result.suggestedQuestions.map(function(question) { return '<li>' + escapeHtml(question) + '</li>'; }).join('') + '</ul><div style="margin-top:7px;font-size:11px;color:#854d0e">Helpful next steps, not Trust Score factors.</div></details>' : '';

    var overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:2147483646;display:flex;align-items:flex-start;justify-content:flex-end;padding:80px 20px 20px;box-sizing:border-box';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    var ghostOpacity = score < 20 ? '.45' : score < 40 ? '.62' : score < 60 ? '.78' : '1';
    var panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;border-radius:16px 0 0 16px;width:580px;max-width:92vw;max-height:calc(100vh - 100px);overflow-y:auto;box-shadow:-4px 0 24px rgba(0,0,0,.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    panel.innerHTML = '<div style="padding:24px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:20px;font-weight:750;color:#0f172a">GhostJob Trust Meter</div><button id="gj-close-x" aria-label="Close Trust Meter" style="border:0;background:none;font-size:22px;cursor:pointer">×</button></div>' +
      '<div style="display:flex;align-items:center;gap:16px;padding:16px;margin-top:18px;border-radius:12px;background:' + presentation.color + '12;border:1px solid ' + presentation.color + '33">' +
        '<div aria-hidden="true" style="font-size:46px;opacity:' + ghostOpacity + ';filter:' + (score < 20 ? 'grayscale(1)' : 'none') + '">' + presentation.ghost + '</div>' +
        '<div><div style="font-size:32px;line-height:1;font-weight:800;color:#0f172a">' + score + ' <span style="font-size:16px;color:#64748b">/ 100</span></div><div style="margin-top:7px;font-size:15px;font-weight:700;color:' + presentation.color + '">' + presentation.label + '</div><div style="margin-top:3px;font-size:13px;color:#475569">' + presentation.risk + '</div></div>' +
      '</div>' +
      '<div style="margin-top:10px;height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden"><div style="height:100%;width:' + score + '%;border-radius:999px;background:' + presentation.color + '"></div></div>' +
      (result.summary ? '<p style="font-size:13px;color:#475569;line-height:1.5">' + escapeHtml(result.summary) + '</p>' : '') +
      '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:' + coverageColor + '12;color:' + coverageColor + ';font-size:11px;font-weight:800">◉ ' + escapeHtml(coverageLabel) + '</div>' +
      '<details style="margin-top:18px;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0"><summary style="font-size:14px;font-weight:800;color:#1f2937;cursor:pointer">Score Calculation</summary><div style="margin-top:5px;font-size:12px;color:#64748b;line-height:1.45">GhostJob starts neutral at 50 and changes the score only when public evidence supports a verification or contradiction.</div><div style="margin-top:8px">' + calculationRows + '</div></details>' +
      '<details style="margin-top:18px"><summary style="font-size:14px;font-weight:800;color:#1f2937;margin-bottom:7px;cursor:pointer">Verification checklist</summary><div style="font-size:12px;color:#64748b;line-height:1.45;margin-bottom:6px">These are the positive checks that can raise Trust Score. Missing evidence is neutral—it is not a ghost-job finding.</div><div style="border:1px solid #e2e8f0;border-radius:10px;padding:2px 12px;background:#fff">' + verificationChecklist + '</div></details>' +
      groupRows('verified', 'Verified signals', '✓', '#22c55e') +
      groupRows('caution', 'Cautions', '⚠', '#f59e0b') +
      groupRows('unverified', 'Not enough data', '?', '#94a3b8') +
      insightsHtml +
      (quality ? '<section style="margin-top:16px"><div style="font-size:14px;font-weight:700;color:#1f2937">Job Quality</div><div style="font-size:12px;color:#64748b;margin-top:3px">Helpful details, not Trust Score factors.</div>' + quality + '</section>' : '') +
      questionsHtml +
      '<p style="margin-top:18px;font-size:11px;line-height:1.45;color:#64748b">This is an estimate based on available public evidence, not a verdict about an employer.</p>' +
      '<div style="margin-top:20px;display:flex;gap:12px"><button id="gj-save-btn"' + (PREVIEW_BUILD ? ' disabled title="Preview scans are not saved"' : '') + ' style="flex:1;padding:11px;background:' + (PREVIEW_BUILD ? '#94a3b8' : '#4f46e5') + ';color:#fff;border:0;border-radius:8px;font-weight:700;cursor:' + (PREVIEW_BUILD ? 'not-allowed' : 'pointer') + '">' + (PREVIEW_BUILD ? 'Preview scan — not saved' : 'Save to Dashboard') + '</button><button id="gj-close-btn" style="padding:11px 18px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:8px;font-weight:600;cursor:pointer">Close</button></div><div id="gj-save-status" style="margin-top:10px;font-size:13px;text-align:center">' + (PREVIEW_BUILD ? 'Preview mode: your scan is not saved to the live dashboard.' : '') + '</div>' +
      '</div>';
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    document.getElementById('gj-close-x').addEventListener('click', function() { overlay.remove(); });
    document.getElementById('gj-close-btn').addEventListener('click', function() { overlay.remove(); });
    if (!PREVIEW_BUILD) document.getElementById('gj-save-btn').addEventListener('click', function() { handleSaveJob(result); });
    addVerificationActions(panel, result);
  }

  function addVerificationActions(panel, result) {
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'GhostJob Trust Meter'); panel.tabIndex = -1;
    panel.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') { panel.parentElement.remove(); return; }
      if (event.key !== 'Tab') return;
      var focusable = Array.from(panel.querySelectorAll('button:not([disabled]),a[href],summary,input,textarea')).filter(function(el) { return el.getClientRects().length > 0; });
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); if (last) last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); if (first) first.focus(); }
    });
    var finding = result.verification;
    var box = document.createElement('section');
    box.style.cssText = 'margin:16px 0;padding:14px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;color:#334155';
    var labels = { matched: 'Matching employer posting found', board_no_match: 'Employer careers page found; exact role not confirmed', identity_unresolved: 'Employer identity unresolved', source_unavailable: 'Employer source unavailable', closed: 'Employer source reports this role closed' };
    if (finding) {
      var heading = document.createElement('strong'); heading.textContent = labels[finding.outcome] || 'Verification finding'; box.appendChild(heading);
      var reason = document.createElement('p'); reason.textContent = finding.reason; box.appendChild(reason);
      if (finding.sourceUrl && /^https:\/\//.test(finding.sourceUrl)) { var source = document.createElement('a'); source.href = finding.sourceUrl; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.textContent = finding.outcome === 'matched' ? 'View employer posting ↗' : 'View employer source ↗'; box.appendChild(source); }
      var checked = document.createElement('p'); checked.textContent = 'Checked ' + new Date(finding.checkedAt).toLocaleString() + ' · Scoring v' + result.scoringVersion; box.appendChild(checked);
    }
    var details = document.createElement('details');
    var summary = document.createElement('summary'); summary.textContent = 'View analyzed description'; details.appendChild(summary);
    var description = document.createElement('pre'); description.style.cssText = 'white-space:pre-wrap;max-height:220px;overflow:auto;font-family:inherit'; description.textContent = lastScannedJob ? lastScannedJob.description : 'Description unavailable'; details.appendChild(description);
    if (result.coverageDetails && result.coverageDetails.truncated) { var limit = document.createElement('p'); limit.textContent = 'Analysis capped at 12,000 characters.'; details.appendChild(limit); }
    box.appendChild(details);
    if (finding) {
      var sources = document.createElement('details'); var sourcesTitle = document.createElement('summary'); sourcesTitle.textContent = 'Sources Checked'; sources.appendChild(sourcesTitle);
      (finding.sources || []).forEach(function(item) { var p = document.createElement('p'); p.textContent = item.url + ' — ' + item.reason + ' (' + new Date(item.checkedAt).toLocaleString() + (item.cached ? ', cached' : '') + ')'; sources.appendChild(p); }); box.appendChild(sources);
    }
    function action(label, callback) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'margin:10px 8px 0 0;padding:8px;border:1px solid #cbd5e1;border-radius:6px;background:white;cursor:pointer'; b.addEventListener('click', callback); box.appendChild(b); return b; }
    action('Review details / Provide employer URL', function() { showScanEditor(); });
    if (finding && finding.outcome !== 'matched' && finding.outcome !== 'closed') {
      var deep = action('Search more sources', async function() {
        deep.disabled = true; deep.textContent = 'Checking more sources…';
        try { var next = await fetchRemoteAnalysis(lastScannedJob, 'deep'); showGhostScore(next); }
        catch (error) { message.textContent = error.message; deep.disabled = false; deep.textContent = 'Retry deeper check'; }
      });
      if (finding.deepSearch === 'disabled') { deep.disabled = true; deep.title = 'Deeper search is not enabled yet.'; }
    }
    var message = document.createElement('p'); message.setAttribute('role', 'status'); message.textContent = 'Deeper checks use separate search capacity and do not use another scan allowance. A completed no-match check is a result.'; box.appendChild(message);
    action('Report a mismatch', function() {
      var report = 'Please describe the mismatch:\n\nJob: ' + (lastScannedJob ? lastScannedJob.url : '') + '\nScoring version: ' + result.scoringVersion + '\nFinding: ' + (finding ? finding.outcome : 'unavailable');
      var draft = document.createElement('a'); draft.href = 'mailto:hello@jobghost.io?subject=' + encodeURIComponent('GhostJob verification mismatch') + '&body=' + encodeURIComponent(report); draft.click();
    });
    var inner = panel.firstElementChild;
    inner.insertBefore(box, inner.children[2] || null);
    panel.focus();
  }

  function showScanEditor() {
    var existing = document.getElementById('gj-scan-editor'); if (existing) existing.remove();
    var editor = document.createElement('dialog'); editor.id = 'gj-scan-editor'; editor.style.cssText = 'width:min(540px,90vw);border:1px solid #cbd5e1;border-radius:12px;padding:24px;font-family:system-ui';
    var title = document.createElement('h2'); title.textContent = 'Review job details'; editor.appendChild(title);
    var fields = {};
    ['title', 'company', 'location', 'employerUrl', 'description'].forEach(function(name) {
      var label = document.createElement('label'); label.textContent = { title: 'Job title', company: 'Company', location: 'Location / eligibility', employerUrl: 'Employer or job URL', description: 'Description (up to 12,000 characters)' }[name]; label.style.display = 'block';
      var input = document.createElement(name === 'description' ? 'textarea' : 'input'); input.value = lastScannedJob && lastScannedJob[name] || ''; input.maxLength = name === 'description' ? 12000 : name === 'employerUrl' ? 2048 : 300; input.style.cssText = 'display:block;width:100%;margin:6px 0 14px;padding:8px;border:1px solid #cbd5e1'; if (name === 'description') input.rows = 7; label.appendChild(input); editor.appendChild(label); fields[name] = input;
    });
    var status = document.createElement('p'); status.setAttribute('role', 'alert'); editor.appendChild(status);
    var submit = document.createElement('button'); submit.textContent = 'Verify these details';
    submit.onclick = function() { checkScanLimit(async function(allowed) {
      if (!allowed && !(activeAttempt && activeAttempt.counted)) { status.textContent = 'Your scan allowance has been reached.'; return; }
      if (!fields.title.value.trim() || !fields.company.value.trim()) { status.textContent = 'Job title and company are required.'; return; }
      if (!activeAttempt) activeAttempt = { key: GhostJobContext.key(), id: crypto.randomUUID(), counted: false };
      var job = Object.assign({}, lastScannedJob || { url: location.href, jobId: GhostJobContext.key() });
      Object.keys(fields).forEach(function(name) { job[name] = fields[name].value.trim(); });
      job.scanAttemptId = activeAttempt.id; job.descriptionCoverage = job.description ? 'partial' : 'unavailable'; job.coverageDetails = { status: job.descriptionCoverage, truncated: false, analyzedCharacters: job.description.length, reason: 'User-reviewed details; full LinkedIn coverage not established.' };
      submit.disabled = true;
      try { var result = await fetchRemoteAnalysis(job); lastScannedJob = job; recordScan(); editor.close(); editor.remove(); showGhostScore(result); }
      catch (error) { status.textContent = error.message; submit.disabled = false; }
    }); }; editor.appendChild(submit);
    var cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.onclick = function() { editor.close(); editor.remove(); }; editor.appendChild(cancel);
    document.body.appendChild(editor); editor.showModal();
  }

  function showVerificationError(message) {
    var old = document.getElementById(MODAL_ID);
    if (old) old.remove();
    var panel = document.createElement('div');
    panel.id = MODAL_ID;
    panel.style.cssText = 'position:fixed;right:20px;top:80px;z-index:2147483646;width:360px;padding:20px;border-radius:12px;background:#fff;border:1px solid #fecaca;box-shadow:0 12px 30px rgba(0,0,0,.18);font-family:-apple-system,BlinkMacSystemFont,sans-serif';
    panel.innerHTML = '<div style="font-size:18px;font-weight:700;color:#991b1b">Trust Meter unavailable</div><p style="font-size:13px;line-height:1.45;color:#475569">GhostJob could not finish the public-evidence check. Your scan was not counted or saved.</p><p style="font-size:12px;line-height:1.4;color:#64748b">' + escapeHtml(message || 'Please retry.') + '</p><button id="gj-error-close" style="padding:8px 12px;border:0;border-radius:6px;background:#334155;color:#fff;cursor:pointer">Close</button>';
    document.body.appendChild(panel);
    document.getElementById('gj-error-close').addEventListener('click', function() { panel.remove(); });
    var edit = document.createElement('button'); edit.textContent = 'Enter job details'; edit.onclick = showScanEditor; panel.appendChild(edit);
  }

  function handleSaveJob(result) {
    var saveBtn   = document.getElementById('gj-save-btn');
    var statusDiv = document.getElementById('gj-save-status');
    if (!saveBtn || !statusDiv) return;
    if (PREVIEW_BUILD) {
      statusDiv.textContent = 'Preview scans are not saved to the live dashboard.';
      statusDiv.style.color = '#64748b';
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';

    var jobData = lastScannedJob || extractJobData();
    var payload = Object.assign({}, jobData, {
      trustScore: result.trustScore,
      trustBand: result.trustBand,
      ghostRisk: result.ghostRisk,
      careersVerification: result.careersVerification,
      evidence: result.evidence,
      qualityBadges: result.qualityBadges,
      scoringVersion: result.scoringVersion,
      summary: result.summary,
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

      var signals = (jobData.evidence || []).map(function(s) {
        return {
          type: s.group || 'not_enough_data',
          title: s.label || s.title || s.name || '',
          description: s.description || '',
          weight: s.points || 0
        };
      });

      var row = {
        user_id:         stored.gj_user_id,
        job_url:         jobData.url || '',
        job_title:       jobData.title || '',
        company_name:    jobData.company || '',
        company_location: jobData.location || '',
        description:     (jobData.description || '').substring(0, 2000),
        trust_score:     jobData.trustScore != null ? jobData.trustScore : null,
        scoring_version: jobData.scoringVersion || 2,
        ghost_risk:      jobData.ghostRisk || 'unclear',
        careers_verification: jobData.careersVerification || 'unverified',
        signals:         signals,
        application_status: 'not_applied'
      };

      function doSave(token) {
        // Check for duplicate first
        var checkUrl = SUPABASE_URL + '/rest/v1/scanned_jobs?select=id&user_id=eq.' + encodeURIComponent(stored.gj_user_id) + '&job_url=eq.' + encodeURIComponent(row.job_url);
        fetch(checkUrl, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token
          }
        })
        .then(function(res) { return res.json(); })
        .then(function(existing) {
          if (Array.isArray(existing) && existing.length > 0) {
            onError('Job already saved to dashboard');
            return;
          }
          // No duplicate — proceed with insert
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
              log('Token expired, refreshing...');
              refreshToken(function(newToken) {
                if (newToken) {
                  doSave(newToken);
                } else {
                  onError('Session expired. Please sign in again.');
                }
              });
            } else {
              return res.json().then(function(e) {
                onError(e.message || e.msg || 'Supabase error');
              });
            }
          })
          .catch(function(err) {
            onError(err.message);
          });
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
      checkScanLimit(function(allowed, count, limit) {
        if (!allowed) {
          showLimitModal(count, limit);
          sendResponse({
            success: false,
            error: 'Free scan limit reached',
            limitReached: true,
            scansUsed: count,
            scanLimit: limit
          });
          return;
        }

        prepareJobDataForScan()
          .then(function(jobData) { return fetchRemoteAnalysis(jobData); })
          .then(function(data) {
            recordScan();
            showGhostScore(data);
            sendResponse({ success: true, data: data });
          })
          .catch(function(err) {
            showVerificationError(err.message);
            sendResponse({ success: false, error: 'Trust Meter unavailable. Please retry.' });
          });
      });
      return true;
    }
  });

})();
