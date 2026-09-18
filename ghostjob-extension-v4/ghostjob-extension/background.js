// GhostJob Background Service Worker. /api/scan is the only score authority.
// This unpacked pilot build intentionally targets the 1.3 Preview deployment.
// Production remains on its own endpoint until the pilot is approved.
const SCAN_API_URL = "https://jobghost-git-agent-ghostjob-04b415-hutsellaaron-8599s-projects.vercel.app/api/scan";
const SCAN_TIMEOUT_MS = 35_000;

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === "scanJob") {
        const auth = await chrome.storage.local.get('gj_auth_token');
        const response = await fetch(SCAN_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(auth.gj_auth_token ? { Authorization: 'Bearer ' + auth.gj_auth_token } : {}) },
          body: JSON.stringify(request.jobData),
          signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
        if (request.jobData?.scoringVersion === 3 && data.scoringVersion !== 3) throw new Error('The GhostJob 1.3 backend is not deployed yet. No scan was counted.');
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
