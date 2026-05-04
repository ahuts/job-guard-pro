// GhostJob Popup Script v1.2.1
// Handles scanning from the extension popup + Supabase auth

const SUPABASE_URL = 'https://auevehneizminspolipf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZXZlaG5laXptaW5zcG9saXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTAyMzMsImV4cCI6MjA5MDkyNjIzM30.jWbkBJkQHbVl1ui-47YZrGXT1-C3dL-6WLQrEhB6gfY';
const DASHBOARD_URL = 'https://jobghost.io/dashboard';

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

  chrome.storage.local.get(['gj_auth_token', 'gj_user_email'], (stored) => {
    if (stored.gj_auth_token && stored.gj_user_email) {
      showLoggedIn(stored.gj_user_email);
    }
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
        showLoggedIn(email);
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
      authLoginForm.style.display = 'flex';
      authLoggedIn.style.display = 'none';
      authStatus.textContent = 'Signed out';
      authStatus.style.color = '';
      authEmail.value = '';
      authPassword.value = '';
      dashboardLink.style.display = 'none';
    });
  });

  function showLoggedIn(email) {
    authLoginForm.style.display = 'none';
    authLoggedIn.style.display = 'flex';
    authUserEmail.textContent = '👤 ' + email;
    updateDashboardLink();
  }

  // ─── Pro Status Refresh ──────────────────────────────────────────────
  // Re-check Pro status from Supabase when popup opens (not just on scan)
  // Hide scan counter until Pro status is confirmed to avoid flash of wrong state
  scanCounterCard.style.display = 'none';

  chrome.storage.local.get(['gj_auth_token', 'gj_is_pro'], (stored) => {
    if (stored.gj_auth_token) {
      const token = stored.gj_auth_token;
      fetch(SUPABASE_URL + '/auth/v1/user', {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + token
        }
      })
      .then(res => res.json())
      .then(user => {
        if (!user.id) return;
        return fetch(SUPABASE_URL + '/rest/v1/profiles?select=subscription_tier&id=eq.' + user.id + '&limit=1', {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token
          }
        });
      })
      .then(res => {
        if (!res || !res.ok) return;
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const isPro = data[0].subscription_tier === 'pro';
          chrome.storage.local.set({ gj_is_pro: isPro }, () => {
            updateScanCounter(); // Re-render with fresh Pro status
          });
        } else {
          updateScanCounter(); // No data — show whatever is cached
        }
      })
      .catch(() => {
        // Network error — show cached value
        updateScanCounter();
      });
    } else {
      // Not logged in — show free counter immediately
      updateScanCounter();
    }
  });

  // ─── Scan Counter ────────────────────────────────────────────────────
  function updateScanCounter() {
    const now = new Date();
    const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    chrome.storage.local.get(['gj_scans', 'gj_auth_token', 'gj_is_pro'], (stored) => {
      const scans = stored.gj_scans || {};
      const count = scans[monthKey] || 0;

      if (stored.gj_is_pro) {
        // Pro users: hide the counter entirely, show a clean Pro badge
        scanCounterCard.style.display = 'block';
        scanCounter.innerHTML = '<span style="color:#22c55e;font-weight:600">✨ Pro Plan — Unlimited Scans</span>';
      } else if (stored.gj_auth_token) {
        // Logged in free users: show remaining scans
        scanCounterCard.style.display = 'block';
        const remaining = Math.max(0, 3 - count);
        const bar = '█'.repeat(count) + '░'.repeat(remaining);
        const color = remaining === 0 ? '#ef4444' : remaining === 1 ? '#f59e0b' : '#22c55e';
        scanCounter.innerHTML = '<span style="color:' + color + ';font-weight:600">' + bar + '</span> ' + remaining + '/3 remaining';
      } else {
        // Not logged in: show remaining scans
        scanCounterCard.style.display = 'block';
        const remaining = Math.max(0, 3 - count);
        const bar = '█'.repeat(count) + '░'.repeat(remaining);
        const color = remaining === 0 ? '#ef4444' : remaining === 1 ? '#f59e0b' : '#22c55e';
        scanCounter.innerHTML = '<span style="color:' + color + ';font-weight:600">' + bar + '</span> ' + remaining + '/3 remaining';
      }
    });
  }

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
        scanBtn.disabled = false;
        pageStatus.innerHTML = '<strong>LinkedIn job detected! </strong>Click "Check for Ghost Job" on the page for full details, or scan here.';
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
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan Current Job';
    }
  });

  function showResult(data) {
    const scoreCircle = document.getElementById('score-circle');
    const scoreLabel = document.getElementById('score-label');
    const scoreValue = document.getElementById('score-value');

    const score = data.trustScore || data.ghostScore || data.score || 50;
    const isLow = score < 31, isMid = score < 61;
    const color = isLow ? '#ef4444' : isMid ? '#f59e0b' : '#22c55e';
    const label = isLow ? '⚠️ Likely Ghost Job' : isMid ? '⚡ Proceed with Caution' : '✅ Looks Legitimate';

    scoreCircle.style.background = color;
    scoreCircle.textContent = score;
    scoreLabel.textContent = label;

    let detailText = `Based on ${data.signals?.length || 'multiple'} signals`;
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
