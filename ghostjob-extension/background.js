// GhostJob Background Service Worker
// Handles API calls and cross-origin requests

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'scanJob') {
        // Forward to our API endpoint
        const result = await scanJob(request.jobData);
        sendResponse(result);
      } else if (request.action === 'ping') {
        sendResponse({ success: true, message: 'Background ready' });
      } else {
        sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true; // Keep channel open for async
});

// Scan job via API
async function scanJob(jobData) {
  try {
    // Your GhostJob API endpoint
    const API_URL = 'https://jobghost-gamma.vercel.app/api/scrape-job';
    
    console.log('[Background] Scanning job:', jobData.url);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: jobData.url,
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        description: jobData.description
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API returned unsuccessful');
    }

    // Calculate Ghost Score locally if needed
    const ghostScore = data.data?.ghostScore || calculateLocalScore(data.data);

    return {
      success: true,
      data: {
        ...data.data,
        ghostScore: ghostScore.score || ghostScore,
        analysis: ghostScore.analysis || ghostScore.reason || 'Analysis complete'
      }
    };
  } catch (error) {
    console.error('[Background] Scan failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze job'
    };
  }
}

// Local score calculation as fallback
function calculateLocalScore(jobData) {
  let score = 50;
  const signals = [];

  // Check for ghost job signals
  const title = jobData.title || '';
  const desc = jobData.description || '';
  const company = jobData.company || '';

  // Red flags
  if (/urgent|immediate|asap|start today/i.test(title)) {
    score -= 15;
    signals.push('Urgency signals in title');
  }

  if (/\$\d+k|\d{3,}|competitive|market.?rate/i.test(desc)) {
    score += 10;
    signals.push('Salary mentioned');
  }

  if (/years? experience|expert|senior|lead/i.test(desc)) {
    score -= 10;
    signals.push('High experience requirements');
  }

  if (/unlimited|flexible|great|awesome|amazing/i.test(desc)) {
    score -= 10;
    signals.push('Vague superlatives');
  }

  // Return calculated score
  return {
    score: Math.max(0, Math.min(100, score)),
    reason: signals.join('; ') || 'Based on local analysis'
  };
}

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('GhostJob extension installed');
});

// Keep service worker alive
setInterval(() => {
  console.log('Service worker heartbeat');
}, 20000);
