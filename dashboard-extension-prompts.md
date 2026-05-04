# GhostJob Dashboard — Extension Install Prompts

## Chrome Web Store Link
https://chromewebstore.google.com/detail/ghostjob-ghost-job-detecto/YOUR_EXTENSION_ID

(Aaron: replace YOUR_EXTENSION_ID with the actual CWS extension ID from the dashboard URL)

---

## 1. Landing Page — Hero CTA Update

Replace the current hero CTA button with a two-button layout:

```tsx
<div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
  <a
    href="https://chromewebstore.google.com/detail/ghostjob-ghost-job-detecto/YOUR_EXTENSION_ID"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold py-3 px-6 rounded-lg transition-colors text-lg shadow-md"
  >
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 3.301A7.144 7.144 0 0 1 12 4.858c1.768 0 3.374.65 4.626 1.724l3.953-3.301C18.462 1.757 15.79 0 12 0z"/>
      <path d="M23.49 12.275c0-.851-.076-1.67-.218-2.455H12v4.643h6.436a5.508 5.508 0 0 1-2.39 3.614l3.953 3.301c2.29-2.066 3.49-5.153 3.49-9.103z"/>
      <path d="M5.265 14.287a7.15 7.15 0 0 1 0-4.574l-3.953-3.3A11.96 11.96 0 0 0 .51 12c0 1.936.465 3.766 1.302 5.387l3.953-3.3z"/>
      <path d="M12 24c3.24 0 5.956-1.075 7.943-2.919l-3.953-3.3A7.144 7.144 0 0 1 12 19.142a7.144 7.144 0 0 1-6.735-4.642l-3.953 3.3C3.044 20.925 6.76 24 12 24z"/>
    </svg>
    Add to Chrome — Free
  </a>
  <a
    href="/dashboard"
    className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors text-lg"
  >
    View Dashboard
  </a>
</div>
```

---

## 2. Dashboard — Extension Install Prompt (for logged-in users with 0 saved jobs)

Add this component near the top of the dashboard page, visible only when user has no saved jobs:

```tsx
function ExtensionInstallBanner({ savedJobsCount }: { savedJobsCount: number }) {
  if (savedJobsCount > 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 flex flex-col sm:flex-row items-center gap-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">
          👋 Next step: Install the Chrome extension
        </h3>
        <p className="text-gray-600 mt-1">
          Scan job postings directly on LinkedIn for ghost job signals. See Trust Scores, red flags, and save jobs to your dashboard.
        </p>
      </div>
      <a
        href="https://chromewebstore.google.com/detail/ghostjob-ghost-job-detecto/YOUR_EXTENSION_ID"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold py-3 px-5 rounded-lg transition-colors whitespace-nowrap shadow-md"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 3.301A7.144 7.144 0 0 1 12 4.858c1.768 0 3.374.65 4.626 1.724l3.953-3.301C18.462 1.757 15.79 0 12 0z"/>
          <path d="M23.49 12.275c0-.851-.076-1.67-.218-2.455H12v4.643h6.436a5.508 5.508 0 0 1-2.39 3.614l3.953 3.301c2.29-2.066 3.49-5.153 3.49-9.103z"/>
          <path d="M5.265 14.287a7.15 7.15 0 0 1 0-4.574l-3.953-3.3A11.96 11.96 0 0 0 .51 12c0 1.936.465 3.766 1.302 5.387l3.953-3.3z"/>
          <path d="M12 24c3.24 0 5.956-1.075 7.943-2.919l-3.953-3.3A7.144 7.144 0 0 1 12 19.142a7.144 7.144 0 0 1-6.735-4.642l-3.953 3.3C3.044 20.925 6.76 24 12 24z"/>
        </svg>
        Add to Chrome — Free
      </a>
    </div>
  );
}
```

---

## 3. Dashboard — Pro Upgrade CTA (for logged-in users with saved jobs)

Once they have saved jobs (meaning extension is installed), replace the install prompt with a Pro upgrade nudge:

```tsx
function ProUpgradeBanner({ isPro }: { isPro: boolean }) {
  if (isPro) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-center gap-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">
          ✨ Unlock unlimited scans
        </h3>
        <p className="text-gray-600 mt-1">
          Free plan includes 3 scans per month. Upgrade to Pro for unlimited scans, priority signal updates, and more.
        </p>
      </div>
      <a
        href="/pricing"  /* or your Stripe checkout URL */
        className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-5 rounded-lg transition-colors whitespace-nowrap shadow-md"
      >
        Upgrade to Pro — $9/mo
      </a>
    </div>
  );
}
```

---

## Logic Summary

| User State | What They See |
|---|---|
| First-time visitor on landing page | "Add to Chrome — Free" primary CTA, "View Dashboard" secondary |
| Logged in, 0 saved jobs | "👋 Next step: Install the Chrome extension" banner |
| Logged in, has saved jobs, free tier | "✨ Unlock unlimited scans" Pro upgrade banner |
| Logged in, has saved jobs, Pro tier | Clean dashboard, no banners |

This way the extension install is front and center for new users, and Pro conversion is the next natural step once they're hooked.