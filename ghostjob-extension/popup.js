// GhostJob Popup Script
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
      scanBtn.disabled = false;
      pageStatus.innerHTML = '<strong>LinkedIn job detected! </strong>Click "Scan Current Job" to analyze.';
      
      // Pre-fetch to check if content script is responding
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      } catch (e) {
        // Content script not loaded yet, that's ok
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
    const isGhost = score > 70;
    const color = isGhost ? '#ef4444' : score > 40 ? '#f59e0b' : '#22c55e';
    const label = isGhost ? '⚠️ Likely Ghost Job' : score > 40 ? '⚡ Caution Advised' : '✅ Looks Legitimate';

    scoreCircle.style.background = color;
    scoreCircle.textContent = score;
    scoreLabel.textContent = label;
    scoreValue.textContent = `Based on ${data.signals?.length || 'multiple'} signals`;

    resultCard.classList.add('show');
  }

  function showError(message) {
    errorMessage.textContent = `❌ ${message}`;
    errorMessage.classList.add('show');
  }
});
