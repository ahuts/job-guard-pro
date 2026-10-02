// GhostJob Popup Script v1.3.12
// Handles scanning from the extension popup + Supabase auth

const SUPABASE_URL = 'https://auevehneizminspolipf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZXZlaG5laXptaW5zcG9saXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTAyMzMsImV4cCI6MjA5MDkyNjIzM30.jWbkBJkQHbVl1ui-47YZrGXT1-C3dL-6WLQrEhB6gfY';
const DASHBOARD_URL = 'https://www.jobghost.io/dashboard';

function createHandoffNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const scanBtn = document.getElementById('scan-btn');
  const pageStatus = document.getElementById('page-status');
  const resultCard = document.getElementById('result-card');
  const errorMessage = document.getElementById('error-message');
  const authBtn = document.getElementById('auth-btn');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const authStatus = document.getElementById('auth-status');
  const authLoginForm = document.getElementById('login-form');
  const authLoggedIn = document.getElementById('auth-logged-in');
  const authUserEmail = document.getElementById('auth-user-email');
  const authLogout = document.getElementById('auth-logout');
  const dashboardLink = document.getElementById('dashboard-link');
  const scanCounterCard = document.getElementById('scan-counter-card');
  const scanCounter = document.getElementById('scan-counter');
  let signedIn = false;
  let jobTabReady = false;
  let allowanceRequest = 0;
  function updateScanAvailability() {
    scanBtn.disabled = !signedIn || !jobTabReady;
  }

  // ─── Auth ────────────────────────────────────────────────────────────
  function updateDashboardLink() {
    chrome.storage.local.get(['gj_auth_token'], (stored) => {
      if (stored.gj_auth_token) {
        dashboardLink.href = DASHBOARD_URL;
        dashboardLink.style.display = 'block';
      }
    });
  }

  dashboardLink.addEventListener('click', (event) => {
    event.preventDefault();

    chrome.storage.local.get(['gj_auth_token', 'gj_refresh_token'], (stored) => {
      if (!stored.gj_auth_token || !stored.gj_refresh_token) {
        chrome.tabs.create({ url: DASHBOARD_URL });
        return;
      }

      const nonce = createHandoffNonce();
      const dashboardUrl = DASHBOARD_URL + '?extension_login=' + encodeURIComponent(nonce);

      chrome.storage.local.set({
        gj_dashboard_handoff: {
          nonce,
          createdAt: Date.now()
        }
      }, () => {
        chrome.tabs.create({ url: dashboardUrl });
      });
    });
  });

  chrome.runtime.sendMessage({ action: 'authStatus' }, (status) => {
    if (status?.success && status.authenticated) {
      signedIn = true;
      chrome.storage.local.get(['gj_user_email'], (stored) => {
        if (stored.gj_user_email) showLoggedIn(stored.gj_user_email);
      });
    } else if (status?.error?.includes('Sign in again')) {
      authStatus.textContent = 'Session expired. Please sign in again.';
      authStatus.style.color = '#fca5a5';
    }
    updateScanAvailability();
  });

  // Login handler
  authBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      authStatus.textContent = 'Please enter email and password';
      authStatus.style.color = '#fca5a5';
      return;
    }

    authBtn.disabled = true;
    authBtn.textContent = 'Signing in...';
    authStatus.textContent = '';

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error_description || data.msg || 'Login failed');
      }

      chrome.storage.local.set({
        gj_auth_token: data.access_token,
        gj_refresh_token: data.refresh_token,
        gj_user_id: data.user.id,
        gj_user_email: email,
      }, () => {
        signedIn = true;
        showLoggedIn(email);
        updateScanAvailability();
        updateScanCounter();
        authStatus.textContent = '✅ Signed in!';
        authStatus.style.color = '#86efac';
      });

    } catch (err) {
      authStatus.textContent = '❌ ' + err.message;
      authStatus.style.color = '#fca5a5';
    } finally {
      authBtn.disabled = false;
      authBtn.textContent = 'Sign In';
    }
  });

  // Logout handler
  authLogout.addEventListener('click', () => {
    chrome.storage.local.remove(['gj_auth_token', 'gj_refresh_token', 'gj_user_id', 'gj_user_email', 'gj_is_pro'], () => {
      signedIn = false;
      authLoginForm.style.display = 'flex';
      authLoggedIn.style.display = 'none';
      authStatus.textContent = 'Signed out';
      authStatus.style.color = '';
      authEmail.value = '';
      authPassword.value = '';
      dashboardLink.style.display = 'none';
      updateScanAvailability();
      updateScanCounter();
    });
  });

  function showLoggedIn(email) {
    authLoginForm.style.display = 'none';
    authLoggedIn.style.display = 'flex';
    authUserEmail.textContent = '👤 ' + email;
    updateDashboardLink();
  }

  // The server verifies the account and reports the shared Free allowance.
  scanCounterCard.style.display = 'none';
  function updateScanCounter() {
    const requestId = ++allowanceRequest;
    chrome.runtime.sendMessage({ action: 'scanCapabilities' }, (response) => {
      if (requestId !== allowanceRequest) return;
      scanCounterCard.style.display = 'block';
      if (!response?.success) {
        scanCounter.textContent = response?.error || 'Account allowance temporarily unavailable';
        return;
      }
      if (!response.authenticated) {
        scanCounter.textContent = 'Sign in to check jobs';
        return;
      }
      const usage = response.data?.freeUsage;
      if (usage === undefined) {
        scanCounter.textContent = '✨ Pro Plan — Unlimited standard scans';
      } else if (usage && Number.isInteger(usage.remaining) && Number.isInteger(usage.limit)) {
        scanCounter.textContent = `${usage.remaining} of ${usage.limit} new job checks left this month`;
      } else {
        scanCounter.textContent = 'Free scan allowance temporarily unavailable';
      }
    });
  }
  updateScanCounter();

  // ─── LinkedIn detection ─────────────────────────────────────────────────
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      pageStatus.textContent = 'No active tab found. Navigate to LinkedIn.';
      return;
    }

    const isLinkedIn = tab.url?.includes('linkedin.com/jobs/view/');

    if (isLinkedIn) {
      let contentScriptReady = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!contentScriptReady && attempts < maxAttempts) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          contentScriptReady = true;
        } catch (e) {
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (contentScriptReady) {
        jobTabReady = true;
        updateScanAvailability();
        pageStatus.innerHTML = '<strong>LinkedIn job detected! </strong>Sign in to check this job here or on the page.';
      } else {
        scanBtn.disabled = true;
        pageStatus.innerHTML = '<strong>Content script not loaded.</strong> Refresh the LinkedIn page and try again.';
      }
    } else {
      scanBtn.disabled = true;
      pageStatus.innerHTML = '<strong>Navigate to LinkedIn:</strong> Open a job posting at linkedin.com/jobs/view/...';
    }
  } catch (error) {
    pageStatus.textContent = 'Error checking page. Try refreshing.';
  }

  // ─── Scan handler ────────────────────────────────────────────────────
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ Scanning...';
    resultCard.classList.remove('show');
    errorMessage.classList.remove('show');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url?.includes('linkedin.com/jobs/view/')) {
        showError('Please navigate to a LinkedIn job posting first.');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'scanFromPopup'
      });

      if (response?.success) {
        showResult(response.data);
      } else {
        showError(response?.error || 'Scan failed. Check console for details.');
      }
    } catch (error) {
      showError('Extension error. Try refreshing the page and try again.');
    } finally {
      updateScanAvailability();
      scanBtn.textContent = 'Scan Current Job';
      updateScanCounter();
    }
  });

  function showResult(data) {
    const scoreCircle = document.getElementById('score-circle');
    const scoreLabel = document.getElementById('score-label');
    const scoreValue = document.getElementById('score-value');

    const score = Number.isFinite(data.trustScore) ? data.trustScore : 50;
    const presentation = {
      highly_verified: { label: 'Highly Verified', risk: 'Low Ghost Risk', color: '#16a34a' },
      positive: { label: 'Positive Signals', risk: 'Low–Moderate Ghost Risk', color: '#d97706' },
      unverified: { label: 'Needs Verification', risk: 'Ghost Risk: Unclear', color: '#64748b' },
      weak: { label: 'Weakly Supported', risk: 'High Ghost Risk', color: '#dc2626' },
      contradictory: { label: 'Contradictory Evidence', risk: 'Very High Ghost Risk', color: '#b91c1c' }
    }[data.trustBand] || { label: 'Needs Verification', risk: 'Ghost Risk: Unclear', color: '#64748b' };

    scoreCircle.style.background = presentation.color;
    scoreCircle.textContent = `${score}/100`;
    scoreLabel.textContent = `${presentation.label} · ${presentation.risk}`;

    let detailText = `GhostJob Trust Meter · ${data.evidence?.length || 0} evidence items`;
    if (data.summary) {
      detailText += ` • ${data.summary}`;
    }
    scoreValue.textContent = detailText;

    resultCard.classList.add('show');
  }

  function showError(message) {
    errorMessage.textContent = `❌ ${message}`;
    errorMessage.classList.add('show');
  }
});
