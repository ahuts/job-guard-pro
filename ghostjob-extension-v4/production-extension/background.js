// GhostJob Background Service Worker. /api/scan is the only score authority.
// The production API advertises the scoring version and account allowance.
const SCAN_API_URL = "https://www.jobghost.io/api/scan";
const SCAN_TIMEOUT_MS = 45_000;
const SUPABASE_URL = 'https://auevehneizminspolipf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZXZlaG5laXptaW5zcG9saXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTAyMzMsImV4cCI6MjA5MDkyNjIzM30.jWbkBJkQHbVl1ui-47YZrGXT1-C3dL-6WLQrEhB6gfY';
let refreshPromise = null;

function tokenExpiring(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const expiresAt = JSON.parse(atob(payload)).exp;
    return !Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000 + 60;
  } catch { return true; }
}

async function getAuthToken() {
  const stored = await chrome.storage.local.get(['gj_auth_token', 'gj_refresh_token']);
  if (!stored.gj_auth_token) return null;
  if (!tokenExpiring(stored.gj_auth_token)) return stored.gj_auth_token;
  if (!stored.gj_refresh_token) throw new Error('Your GhostJob session expired. Sign in again in the extension.');
  if (!refreshPromise) refreshPromise = (async () => {
    try {
      const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ refresh_token: stored.gj_refresh_token }), signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          await chrome.storage.local.remove(['gj_auth_token', 'gj_refresh_token', 'gj_user_id', 'gj_user_email', 'gj_is_pro']);
          throw new Error('Your GhostJob session expired. Sign in again in the extension.');
        }
        throw new Error('GhostJob could not refresh your session. Please retry.');
      }
      const data = await response.json();
      if (!data.access_token || !data.refresh_token) throw new Error('GhostJob could not refresh your session. Please retry.');
      await chrome.storage.local.set({ gj_auth_token: data.access_token, gj_refresh_token: data.refresh_token });
      return data.access_token;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Your GhostJob session expired')) throw error;
      throw new Error('GhostJob could not refresh your session. Please retry.');
    }
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function scanCapabilities(token) {
  if (!token) throw new Error('Sign in to GhostJob in the extension before scanning.');
  const response = await fetch(SCAN_API_URL, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('GhostJob service update is not ready. Please try again later.');
  const capabilities = await response.json();
  if (capabilities?.scoringVersion !== 2 && capabilities?.scoringVersion !== 3) {
    throw new Error('GhostJob service returned an unsupported scan version.');
  }
  return capabilities;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === "authStatus") {
        sendResponse({ success: true, authenticated: Boolean(await getAuthToken()) });
        return;
      }
      if (request.action === "scanCapabilities") {
        const token = await getAuthToken();
        if (!token) {
          sendResponse({ success: true, authenticated: false });
          return;
        }
        sendResponse({ success: true, authenticated: true, data: await scanCapabilities(token) });
        return;
      }
      if (request.action === "scanJob") {
        const token = await getAuthToken();
        const scoringVersion = (await scanCapabilities(token)).scoringVersion;
        const response = await fetch(SCAN_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: 'Bearer ' + token },
          body: JSON.stringify({ ...request.jobData, scoringVersion }),
          signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
        });
        const data = await response.json();
        if (!response.ok) {
          sendResponse({ success: false, error: data?.error || `HTTP ${response.status}`, code: data?.code, freeUsage: data?.freeUsage });
          return;
        }
        if (data.scoringVersion !== scoringVersion) throw new Error('GhostJob service changed scan versions. No scan was counted.');
        sendResponse({ success: true, data });
        return;
      }
      if (request.action === "saveJob") {
        const stored = await chrome.storage.local.get("savedJobs");
        const jobs = stored.savedJobs || [];
        jobs.unshift({ id: Date.now().toString(), ...request.jobData, savedAt: new Date().toISOString() });
        if (jobs.length > 100) jobs.pop();
        await chrome.storage.local.set({ savedJobs: jobs });
        sendResponse({ success: true, data: { totalSaved: jobs.length } });
        return;
      }
      if (request.action === "ping") return sendResponse({ success: true, message: "Background ready" });
      sendResponse({ success: false, error: "Unknown action" });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : "Trust Meter unavailable" });
    }
  })();
  return true;
});
