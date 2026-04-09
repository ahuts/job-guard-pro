// GhostJob Content Script
// Injects "Check for Ghost Job" button on LinkedIn job pages

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.ghostJobInjected) return;
  window.ghostJobInjected = true;

  console.log('[GhostJob] Content script loaded');

  // Create floating badge button (always visible)
  function createFloatingBadge() {
    const badge = document.createElement('button');
    badge.id = 'ghostjob-float-btn';
    badge.innerHTML = '👻';
    badge.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'scale(1.1)';
      badge.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
    });
    
    badge.addEventListener('mouseleave', () => {
      badge.style.transform = 'scale(1)';
      badge.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });
    
    badge.addEventListener('click', handleScanClick);
    
    return badge;
  }

  // Add floating badge to body
  function addFloatingBadge() {
    // Remove existing if any
    const existing = document.getElementById('ghostjob-float-btn');
    if (existing) existing.remove();
    
    const badge = createFloatingBadge();
    document.body.appendChild(badge);
    console.log('[GhostJob] Floating badge added');
  }

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

  // Show Ghost Score result with detailed signals - as floating modal
  function showGhostScore(result) {
    // Remove existing modal
    const existing = document.getElementById('ghostjob-modal-overlay');
    if (existing) existing.remove();

    // Create overlay backdrop
    const overlay = document.createElement('div');
    overlay.id = 'ghostjob-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    `;
    
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const score = result.ghostScore || result.score || 50;
    const isGhost = score > 70;
    const color = isGhost ? '#ef4444' : score > 40 ? '#f59e0b' : '#22c55e';
    const label = isGhost ? '⚠️ Likely Ghost Job' : score > 40 ? '⚡ Proceed with Caution' : '✅ Looks Legitimate';

    // Build signals HTML
    let signalsHtml = '';
    if (result.signals && result.signals.length > 0) {
      signalsHtml = `
        <div style="margin-top: 20px; border-top: 1px solid ${color}30; padding-top: 16px;">
          <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px;">
            📊 Signals Detected (${result.signals.length})
          </div>
          <div style="max-height: 300px; overflow-y: auto;">
          ${result.signals.map(signal => `
            <div style="
              margin-bottom: 12px;
              padding: 10px;
              border-radius: 8px;
              background: ${signal.type === 'red' ? '#fef2f2' : signal.type === 'green' ? '#f0fdf4' : '#fefce8'};
              border-left: 3px solid ${signal.type === 'red' ? '#ef4444' : signal.type === 'green' ? '#22c55e' : '#eab308'};
            ">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 16px;">${signal.icon}</span>
                <span style="font-weight: 600; color: #333; font-size: 13px;">${signal.title}</span>
                <span style="
                  margin-left: auto;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-size: 10px;
                  font-weight: 600;
                  text-transform: uppercase;
                  background: ${signal.type === 'red' ? '#fecaca' : signal.type === 'green' ? '#bbf7d0' : '#fde047'};
                  color: ${signal.type === 'red' ? '#dc2626' : signal.type === 'green' ? '#16a34a' : '#a16207'};
                ">${signal.type}</span>
              </div>
              <div style="font-size: 12px; color: #555; margin-bottom: 4px; padding-left: 24px;">${signal.description}</div>
              <div style="font-size: 11px; color: #666; padding-left: 24px; margin-bottom: 4px;">
                <strong>Impact:</strong> ${signal.impact}
              </div>
              <div style="font-size: 11px; color: #2563eb; padding-left: 24px;">
                <strong>💡 Tip:</strong> ${signal.advice}
              </div>
            </div>
          `).join('')}
          </div>
        </div>
      `;
    }

    resultDiv.style.cssText = `
      margin-top: 16px;
      padding: 16px;
      border-radius: 12px;
      background: linear-gradient(135deg, ${color}15 0%, ${color}05 100%);
      border: 1px solid ${color}40;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-height: 600px;
      overflow-y: auto;
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
      
      ${result.summary ? `
        <div style="font-size: 14px; color: #444; margin-bottom: 12px; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">
          <strong>Summary:</strong> ${result.summary}
        </div>
      ` : ''}
      
      ${signalsHtml}
      
      ${result.recommendation ? `
        <div style="margin-top: 16px; padding: 12px; background: ${color}10; border-radius: 8px; border-left: 3px solid ${color};">
          <div style="font-size: 13px; color: #444;">
            <strong>🎯 Recommendation:</strong> ${result.recommendation}
          </div>
        </div>
      ` : ''}
      
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button id="ghostjob-save-btn" style="
          flex: 1;
          padding: 10px 16px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">💾 Save to Dashboard</button>
        <button id="ghostjob-refresh-btn" style="
          padding: 10px 16px;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        ">🔄 Rescan</button>
      </div>
      <div id="ghostjob-save-status" style="margin-top: 8px; font-size: 12px; text-align: center;"></div>
    `;

    const button = document.getElementById('ghostjob-scan-btn');
    if (button) {
      button.parentNode.insertBefore(resultDiv, button.nextSibling);
    }

    // Add save button handler
    const saveBtn = document.getElementById('ghostjob-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => handleSaveJob(result));
    }

    // Add refresh button handler
    const refreshBtn = document.getElementById('ghostjob-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', handleScanClick);
    }
  }

  // Handle save job to dashboard
  async function handleSaveJob(result) {
    const saveBtn = document.getElementById('ghostjob-save-btn');
    const statusDiv = document.getElementById('ghostjob-save-status');
    
    if (!saveBtn || !statusDiv) return;

    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
    statusDiv.textContent = '';
    statusDiv.style.color = '#666';

    try {
      const jobData = extractJobData();
      const dataToSave = {
        ...jobData,
        ghostScore: result.ghostScore,
        signals: result.signals,
        summary: result.summary,
        scannedAt: new Date().toISOString()
      };

      const response = await chrome.runtime.sendMessage({
        action: 'saveJob',
        jobData: dataToSave
      });

      if (response.success) {
        saveBtn.textContent = '✅ Saved!';
        saveBtn.style.background = '#22c55e';
        statusDiv.textContent = `Job saved to dashboard (${response.data.totalSaved} total)`;
        statusDiv.style.color = '#22c55e';
        
        setTimeout(() => {
          saveBtn.textContent = '💾 Save to Dashboard';
          saveBtn.style.background = '#667eea';
          saveBtn.disabled = false;
          statusDiv.textContent = '';
        }, 3000);
      } else {
        throw new Error(response.error || 'Save failed');
      }
    } catch (error) {
      console.error('[GhostJob] Save error:', error);
      saveBtn.textContent = '❌ Save Failed';
      saveBtn.style.background = '#ef4444';
      statusDiv.textContent = error.message || 'Could not save job. Try again.';
      statusDiv.style.color = '#ef4444';
      
      setTimeout(() => {
        saveBtn.textContent = '💾 Save to Dashboard';
        saveBtn.style.background = '#667eea';
        saveBtn.disabled = false;
        statusDiv.textContent = '';
      }, 3000);
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

    // Find injection point - expanded selector list
    const injectionSelectors = [
      // Try to find Save button container first (most natural placement)
      '[class*="save"]',  // Save button itself
      'button[aria-label*="Save"]',  // Save by aria-label
      // LinkedIn job detail containers (various layouts)
      '.job-details-jobs-unified-top-card__container',
      '.job-details-jobs-unified-top-card__content',
      '.jobs-unified-top-card__content',
      '.job-details-jobs-unified-top-card',
      '.jobs-details-top-card',
      '[class*="jobs-unified-top-card"]',
      '[class*="job-details"]',
      // Generic fallbacks
      '.jobs-search-results-list',
      '.scaffold-layout__main',
      'main[role="main"]',
      'main',
      // Last resort - body (will need positioning)
      'body'
    ];

    let injected = false;
    for (const selector of injectionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const button = createGhostButton();
        
        // If we found Save button, insert our button into the PARENT container
        // so it appears in the same row
        if (selector.includes('save') || selector.includes('Save')) {
          button.style.cssText = button.style.cssText.replace('margin-top: 16px;', 'margin-left: 8px;');
          button.style.display = 'inline-flex';
          
          // Insert into grandparent (the flex row container)
          const flexRow = element.closest('[class*="flex"]') || element.parentElement?.parentElement;
          if (flexRow) {
            flexRow.appendChild(button);
            console.log('[GhostJob] Button injected into flex row next to Save');
          } else {
            // Fallback: insert after Save button's container
            element.parentElement.parentElement.appendChild(button);
            console.log('[GhostJob] Button injected next to Save button');
          }
        } else if (selector === 'body') {
          // Body fallback - fixed position
          button.style.cssText += 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';
          element.appendChild(button);
          console.log('[GhostJob] Button injected into body (fixed position)');
        } else {
          // Regular container
          element.appendChild(button);
          console.log('[GhostJob] Button injected into:', selector);
        }
        
        injected = true;
        break;
      }
    }

    if (!injected) {
      console.log('[GhostJob] Could not find injection point, will retry on next navigation...');
      // Don't spam retry - LinkedIn is SPA, will re-inject on navigation
    }
  }

  // Initial injection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }

  // Re-inject on URL changes AND DOM changes (LinkedIn SPA navigation)
  let lastUrl = location.href;
  let reinjectTimeout = null;
  
  new MutationObserver(() => {
    const url = location.href;
    
    // URL changed - definitely re-inject
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[GhostJob] URL changed, re-injecting...');
      clearTimeout(reinjectTimeout);
      reinjectTimeout = setTimeout(injectButton, 500);
      return;
    }
    
    // Check if button is missing (LinkedIn re-rendered)
    if (url.includes('/jobs/view/')) {
      const existingBtn = document.getElementById('ghostjob-scan-btn');
      const existingFloat = document.getElementById('ghostjob-float-btn');
      
      if (!existingBtn && !existingFloat) {
        console.log('[GhostJob] Button missing, re-injecting...');
        clearTimeout(reinjectTimeout);
        reinjectTimeout = setTimeout(injectButton, 500);
      }
    }
  }).observe(document, { subtree: true, childList: true });

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ success: true });
    } else if (request.action === 'scanFromPopup') {
      // Do the full scan and return results
      (async () => {
        try {
          const jobData = extractJobData();
          console.log('[GhostJob] Popup scan - extracted:', jobData);
          
          // Send to background for API call
          const response = await chrome.runtime.sendMessage({
            action: 'scanJob',
            jobData: jobData
          });
          
          if (response.success) {
            showGhostScore(response.data);
            sendResponse({ success: true, data: response.data });
          } else {
            showError(response.error || 'Scan failed');
            sendResponse({ success: false, error: response.error });
          }
        } catch (error) {
          console.error('[GhostJob] Popup scan error:', error);
          showError(error.message || 'Scan failed');
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // Keep channel open for async
    }
    return true;
  });

})();