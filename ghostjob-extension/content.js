// GhostJob Content Script
// Injects "Check for Ghost Job" button on LinkedIn job pages

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.ghostJobInjected) return;
  window.ghostJobInjected = true;

  console.log('[GhostJob] Content script loaded');

  // Create the GhostJob button
  function createGhostButton() {
    const button = document.createElement('button');
    button.id = 'ghostjob-scan-btn';
    button.innerHTML = '🔍 Check for Ghost Job';
    button.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 24px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    });

    button.addEventListener('click', handleScanClick);

    return button;
  }

  // Handle scan button click
  async function handleScanClick() {
    const button = document.getElementById('ghostjob-scan-btn');
    if (!button) return;

    // Show loading state
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Analyzing...';
    button.disabled = true;
    button.style.opacity = '0.7';

    // Get job data from page
    const jobData = extractJobData();
    console.log('[GhostJob] Extracted job data:', jobData);

    // Send to background script for API call
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'scanJob',
        jobData: jobData
      });

      if (response.success) {
        showGhostScore(response.data);
      } else {
        showError(response.error || 'Failed to analyze job');
      }
    } catch (error) {
      console.error('[GhostJob] Scan error:', error);
      showError('Extension error. Please try again.');
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
      button.style.opacity = '1';
    }
  }

  // Extract job data from LinkedIn page
  function extractJobData() {
    const data = {
      url: window.location.href,
      title: '',
      company: '',
      location: '',
      description: ''
    };

    // Try multiple selectors for title
    const titleSelectors = [
      'h1.top-card-layout__title',
      'h1.job-details-jobs-unified-top-card__job-title',
      'h1[data-testid="job-title"]',
      'h1'  // fallback
    ];

    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        data.title = el.textContent.trim();
        break;
      }
    }

    // Try multiple selectors for company
    const companySelectors = [
      '.top-card-layout__card a[href*="/company/"]',
      '.job-details-jobs-unified-top-card__company-name',
      '[data-testid="company-name"]',
      '.artdeco-entity-lockup__subtitle'
    ];

    for (const selector of companySelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        data.company = el.textContent.trim();
        break;
      }
    }

    // Try multiple selectors for location
    const locationSelectors = [
      '.top-card-layout__metadata-item',
      '.job-details-jobs-unified-top-card__bullet',
      '[data-testid="job-location"]'
    ];

    for (const selector of locationSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        const text = el.textContent.trim();
        // Check if it looks like a location (contains city, remote, etc.)
        if (text.match(/remote|hybrid|on-site|[A-Z][a-z]+/i)) {
          data.location = text;
          break;
        }
      }
    }

    // Get description
    const descSelectors = [
      '.description__text',
      '.job-details-jobs-unified-top-card__job-description',
      '[data-testid="job-description"]',
      '.show-more-less-html__markup'
    ];

    for (const selector of descSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        data.description = el.textContent.trim().substring(0, 2000); // Limit size
        break;
      }
    }

    // If we have the URL, we can extract job ID from it
    const jobIdMatch = window.location.href.match(/\/view\/(\d+)/);
    if (jobIdMatch) {
      data.jobId = jobIdMatch[1];
    }

    return data;
  }

  // Show Ghost Score result
  function showGhostScore(result) {
    // Remove existing result
    const existing = document.getElementById('ghostjob-result');
    if (existing) existing.remove();

    const resultDiv = document.createElement('div');
    resultDiv.id = 'ghostjob-result';
    
    const score = result.ghostScore || result.score || 50;
    const isGhost = score > 70;
    const color = isGhost ? '#ef4444' : score > 40 ? '#f59e0b' : '#22c55e';
    const label = isGhost ? '⚠️ Likely Ghost Job' : score > 40 ? '⚡ Proceed with Caution' : '✅ Looks Legitimate';

    resultDiv.style.cssText = `
      margin-top: 16px;
      padding: 16px;
      border-radius: 12px;
      background: linear-gradient(135deg, ${color}15 0%, ${color}05 100%);
      border: 1px solid ${color}40;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    resultDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
        ">${score}</div>
        <div>
          <div style="font-size: 18px; font-weight: 700; color: ${color};">${label}</div>
          <div style="font-size: 13px; color: #666; margin-top: 4px;">Ghost Score: ${score}/100</div>
        </div>
      </div>
      <div style="font-size: 13px; color: #444; line-height: 1.5;">
        ${result.analysis || 'Analysis based on posting patterns, company signals, and description quality.'}
      </div>
    `;

    const button = document.getElementById('ghostjob-scan-btn');
    if (button) {
      button.parentNode.insertBefore(resultDiv, button.nextSibling);
    }
  }

  // Show error message
  function showError(message) {
    const existing = document.getElementById('ghostjob-result');
    if (existing) existing.remove();

    const errorDiv = document.createElement('div');
    errorDiv.id = 'ghostjob-result';
    errorDiv.style.cssText = `
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      background: #fee2e2;
      border: 1px solid #ef4444;
      color: #dc2626;
      font-size: 14px;
    `;
    errorDiv.textContent = `❌ ${message}`;

    const button = document.getElementById('ghostjob-scan-btn');
    if (button) {
      button.parentNode.insertBefore(errorDiv, button.nextSibling);
    }
  }

  // Inject button when page loads
  function injectButton() {
    // Check if we're on a job page
    if (!window.location.href.includes('/jobs/view/')) {
      console.log('[GhostJob] Not on job page, skipping injection');
      return;
    }

    // Remove existing button if any
    const existing = document.getElementById('ghostjob-scan-btn');
    if (existing) existing.remove();

    // Find injection point
    const injectionSelectors = [
      '.top-card-layout__card',
      '.job-details-jobs-unified-top-card__content',
      '.jobs-unified-top-card__content',
      '[data-testid="job-details"]'
    ];

    let injected = false;
    for (const selector of injectionSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        const button = createGhostButton();
        container.appendChild(button);
        console.log('[GhostJob] Button injected into:', selector);
        injected = true;
        break;
      }
    }

    if (!injected) {
      console.log('[GhostJob] Could not find injection point, retrying in 2s...');
      setTimeout(injectButton, 2000);
    }
  }

  // Initial injection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }

  // Re-inject on URL changes (LinkedIn SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[GhostJob] URL changed, re-injecting...');
      setTimeout(injectButton, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ success: true });
    } else if (request.action === 'scanFromPopup') {
      handleScanClick();
      sendResponse({ success: true, message: 'Scan started from popup' });
    }
    return true;
  });

})();