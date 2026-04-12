# GhostJob Chrome Extension

👻 Detect Ghost Jobs on LinkedIn

## What It Does

Scans LinkedIn job postings and gives you a **Ghost Score** (0-100) based on:
- Job description quality
- Company signals  
- Posting patterns

## Installation

### 1. Download Extension Files
Download this folder: `ghostjob-extension/`

### 2. Load in Chrome
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select `ghostjob-extension/` folder
5. Extension appears in toolbar! 🎉

### 3. Use It
1. Go to any LinkedIn job posting
2. Click 🔍 **"Check for Ghost Job"** button
3. See your Ghost Score instantly!

## Features

✅ One-click scan on any LinkedIn job
✅ 0-100 Ghost Score with analysis
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

Posts to: `https://jobghost-gamma.vercel.app/api/scrape-job`

Response: `{ success: true, data: { title, company, ghostScore, ... } }`

## Development

To modify:
1. Edit files
2. Go to `chrome://extensions/`
3. Click refresh icon on GhostJob extension
4. Test on LinkedIn

## Chrome Web Store

For submission:
1. Zip `ghostjob-extension/` folder
2. Go to Chrome Developer Dashboard
3. Upload and submit for review
4. Wait 1-2 weeks for approval

---

**Built with ❤️ for job seekers everywhere**
