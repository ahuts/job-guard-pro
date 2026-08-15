// GhostJob Background Service Worker. /api/scan is the only score authority.
const SCAN_API_URL = "https://jobghost.io/api/scan";

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === "scanJob") {
        const response = await fetch(SCAN_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request.jobData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
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
