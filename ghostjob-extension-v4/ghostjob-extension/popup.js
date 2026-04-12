// GhostJob Popup Script v1.0.4
// Handles scanning from the extension popup

document.addEventListener('DOMContentLoaded', async () => {
  const scanBtn = document.getElementById('scan-btn');
  const pageStatus = document.getElementById('page-status');
  const resultCard = document.getElementById('result-card');
  const errorMessage = document.getElementById('error-message');

  // Check current tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      pageStatus.textContent = 'No active tab found. Navigate to LinkedIn.';
      return;
    }

    const isLinkedIn = tab.url?.includes('linkedin.com/jobs/view/');
    
    if (isLinkedIn) {
      // Try to ping content script - retry a few times
      let contentScriptReady = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!contentScriptReady && attempts < maxAttempts) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          contentScriptReady = true;
          console.log('[Popup] Content script ready after', attempts + 1, 'attempts');
        } catch (e) {
          attempts++;
          if (attempts < maxAttempts) {
            console.log('[Popup] Waiting for content script, attempt', attempts);
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
    console.error('Tab query error:', error);
    pageStatus.textContent = 'Error checking page. Try refreshing.';
  }

  // Handle scan button
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

      // Send scan request to content script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'scanFromPopup' 
      });

      if (response?.success) {
        showResult(response.data);
      } else {
        showError(response?.error || 'Scan failed. Check console for details.');
      }
    } catch (error) {
      console.error('Scan error:', error);
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

    const score = data.ghostScore || data.score || 50;
    const isLow = score <= 30, isMid = score <= 60;
    const color = isLow ? '#ef4444' : isMid ? '#f59e0b' : '#22c55e';
    const label = isLow ? '⚠️ Likely Ghost Job' : isMid ? '⚡ Proceed with Caution' : '✅ Looks Legitimate';

    scoreCircle.style.background = color;
    scoreCircle.textContent = score;
    scoreLabel.textContent = label;
    
    // Show signal count and summary
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
