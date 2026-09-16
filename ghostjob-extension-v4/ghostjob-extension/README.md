# GhostJob Chrome Extension — Preview Pilot

👻 Detect Ghost Jobs on LinkedIn

## What It Does

Scans LinkedIn job postings and displays the GhostJob **Trust Meter**. This
unpacked pilot uses the v3 Preview API and does not save scans to the live
dashboard or database.

## Installation

### 1. Download Extension Files
Download this folder: `ghostjob-extension/`

### 2. Load in Chrome
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select `ghostjob-extension/` folder
5. Select this exact `ghostjob-extension/` folder. Chrome should display
   **GhostJob - Ghost Job Detector (Preview) 1.3.1**.

### 3. Use It
1. Go to any LinkedIn job posting
2. Click **"Scan for Ghost Job"**.
3. Confirm the result says **Scoring v3** and includes a verification finding.

## Features

✅ One-click scan on any LinkedIn job
✅ 0-100 Trust Meter with evidence, employer verification, and a full job audit
✅ Works directly in browser (no copy/paste)
✅ Beautiful gradient UI
✅ Real-time results

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (Manifest V3) |
| `content.js` | Injects button on LinkedIn |
| `popup.html` | Extension popup UI |
| `popup.js` | Popup logic |
| `background.js` | API calls, service worker |
| `icons/` | Extension icons |

## API Endpoint

Posts to the v3 Preview API:

`https://jobghost-git-agent-ghostjob-04b415-hutsellaaron-8599s-projects.vercel.app/api/scan`

Response includes `scoringVersion: 3`, Trust Meter evidence, verification
findings, and non-scoring job insights.

## Development

To modify:
1. Edit files
2. Go to `chrome://extensions/`
3. Click refresh icon on the **Preview** GhostJob extension
4. Test on LinkedIn

## Chrome Web Store

For submission:
1. Zip `ghostjob-extension/` folder
2. Go to Chrome Developer Dashboard
3. Upload and submit for review
4. Wait 1-2 weeks for approval

---

**Built with ❤️ for job seekers everywhere**
