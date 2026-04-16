// GhostJob Popup Script v1.0.7
// Handles scanning from the extension popup + Supabase auth

const SUPABASE_URL = 'https://auevehneizminspolipf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZXZlaG5laXptaW5zcG9saXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTAyMzMsImV4cCI6MjA5MDkyNjIzM30.jWbkBJkQHbVl1ui-47YZrGXT1-C3dL-6WLQrEhB6gfY';

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

  // ─── Auth ────────────────────────────────────────────────────────────
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
    chrome.storage.local.remove(['gj_auth_token', 'gj_refresh_token', 'gj_user_id', 'gj_user_email'], () => {
      authLoginForm.style.display = 'flex';
      authLoggedIn.style.display = 'none';
      authStatus.textContent = 'Signed out';
      authStatus.style.color = '';
      authEmail.value = '';
      authPassword.value = '';
      document.getElementById('dashboard-link').style.display = 'none';
      document.getElementById('scan-history').style.display = 'none';
    });
  });

  function showLoggedIn(email) {
    authLoginForm.style.display = 'none';
    authLoggedIn.style.display = 'flex';
    authUserEmail.textContent = '👤 ' + email;
    document.getElementById('dashboard-link').style.display = 'block';
    loadScanHistory();
  }

  // ─── Scan History ────────────────────────────────────────────────────
  function loadScanHistory() {
    const historyDiv = document.getElementById('scan-history');
    const historyList = document.getElementById('scan-history-list');

    chrome.storage.local.get('savedJobs', (stored) => {
      const allJobs = stored.savedJobs || [];
      // Clean up old entries without titles
      const cleanJobs = allJobs.filter(j => j.title && j.title !== 'Unknown');
      if (cleanJobs.length !== allJobs.length) {
        chrome.storage.local.set({ savedJobs: cleanJobs });
      }
      const jobs = cleanJobs.slice(0, 5);
      if (jobs.length === 0) {
        historyDiv.style.display = 'none';
        return;
      }

      historyDiv.style.display = 'block';
      historyList.innerHTML = '';

      jobs.forEach((job) => {
        const score = job.ghostScore != null ? job.ghostScore : 50;
        const isLow = score < 31, isMid = score < 61;
        const color = isLow ? '#ef4444' : isMid ? '#f59e0b' : '#22c55e';

        const item = document.createElement('div');
        item.className = 'scan-item';
        item.innerHTML = `
          <div class="scan-item-score" style="background:${color}">${score}</div>
          <div class="scan-item-info">
            <div class="scan-item-title">${job.title || 'Unknown'}</div>
            <div class="scan-item-company">${job.company || 'Unknown'}</div>
          </div>
        `;
        historyList.appendChild(item);
      });
    });
  }

  // Also load scan history on startup (for already-logged-in users)
  loadScanHistory();

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