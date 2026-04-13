# Chrome Web Store Listing — GhostJob

## Name
GhostJob - Ghost Job Detector

## Short Description (132 chars max)
Detect ghost jobs on LinkedIn with Trust Score — one-click scanning for reposted listings, vague salaries, and more.

## Detailed Description

**Stop wasting time on fake job postings.**

GhostJob scans LinkedIn job listings for ghost job signals — positions that were never meant to be filled. With one click, get a Trust Score (0-100) that tells you if a posting is legitimate or likely a ghost job.

**How it works:**
1. Install GhostJob — a "Scan for Ghost Jobs" button appears next to every LinkedIn posting
2. Click the button — instantly analyzes 10+ legitimacy signals
3. See your Trust Score with detailed signal breakdowns and actual quotes from the posting

**What we detect:**

🔴 Red Flags
• Reposted jobs — 30-40% of reposted roles never result in a hire
• Urgency language — "immediate start", "urgent hiring" pressure tactics
• Unrealistic experience requirements
• Vague "competitive salary" with no range
• Generic, could-apply-anywhere descriptions
• High experience required for entry-level roles

🟡 Yellow Flags
• No salary range listed
• No team or hiring manager mentioned
• Vague or missing location
• AI-generated language patterns
• Culture buzzwords paired with red flags
• Stale listings (30+ days old)

🟢 Green Flags
• Salary transparency
• Benefits mentioned
• Flexible work options
• Hiring manager contact info
• Clear, specific requirements

**Why GhostJob?**
- 43% of job postings are ghost jobs (Resume Builder Survey, 2024)
- $737M+ lost to fake job offers in the US since 2019
- The only tool that works directly inside LinkedIn — no copy/paste, no leaving the page

**Privacy first:**
GhostJob runs entirely in your browser. No data is sent to external servers. Your LinkedIn activity stays private.

## Category
Productivity

## Language
English

## Privacy Policy URL
https://jobghost-gamma.vercel.app/privacy

## Single Purpose Description
GhostJob has a single purpose: detecting ghost/fake job postings on LinkedIn. It scans job listing pages for legitimacy signals (repost history, salary transparency, description quality, etc.) and displays a Trust Score. The extension only activates on LinkedIn job pages and does not collect, store, or transmit any user data.

## Permissions Justification

### activeTab
Required to read the content of LinkedIn job posting pages for ghost job signal analysis. The extension only accesses the page content when the user clicks the "Scan for Ghost Jobs" button — it never reads pages automatically or in the background.

### storage
Required to save the user's scan preferences and locally cached Trust Score results. All data is stored locally in the browser using chrome.storage.local — nothing is sent to external servers.

## Host Permissions Justification

### https://www.linkedin.com/*
Required to inject the "Scan for Ghost Jobs" button and analysis overlay into LinkedIn job posting pages. The extension only activates on job listing URLs (linkedin.com/jobs/view/* and linkedin.com/jobs/*). It does not access any other LinkedIn pages, messages, or personal data.

### https://jobghost-gamma.vercel.app/*
Reserved for future dashboard integration where users can save and track scanned jobs. Currently unused.

## Screenshots Needed
- Screenshot 1: LinkedIn job page with "Scan for Ghost Jobs" button visible
- Screenshot 2: Trust Score modal showing red/yellow/green flags with quotes
- Screenshot 3: Close-up of Trust Score breakdown with signal details
- Screenshot 4: Popup showing extension is active on a LinkedIn page

## Promo Images (optional)
- Small tile (440x280): GhostJob logo + "Detect Ghost Jobs"
- Marquee (1400x560): Trust Score display + key stats