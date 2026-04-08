// GhostJob Background Service Worker
// Handles API calls and cross-origin requests

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'scanJob') {
        const result = await scanJob(request.jobData);
        sendResponse(result);
      } else if (request.action === 'saveJob') {
        const result = await saveJob(request.jobData);
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
  return true;
});

// Scan job via API
async function scanJob(jobData) {
  try {
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

    // Calculate Ghost Score with detailed signals
    const analysis = calculateDetailedScore(data.data || jobData);

    return {
      success: true,
      data: {
        ...data.data,
        ghostScore: analysis.score,
        signals: analysis.signals,
        summary: analysis.summary,
        recommendation: analysis.recommendation
      }
    };
  } catch (error) {
    console.error('[Background] Scan failed:', error);
    // Fallback to local calculation
    const analysis = calculateDetailedScore(jobData);
    return {
      success: true,
      data: {
        ...jobData,
        ghostScore: analysis.score,
        signals: analysis.signals,
        summary: analysis.summary,
        recommendation: analysis.recommendation,
        source: 'local-fallback'
      }
    };
  }
}

// Save job to dashboard
async function saveJob(jobData) {
  try {
    // For now, save to extension storage
    // In production, this would POST to your dashboard API
    const savedJobs = await chrome.storage.local.get('savedJobs');
    const jobs = savedJobs.savedJobs || [];
    
    const jobToSave = {
      id: Date.now().toString(),
      ...jobData,
      savedAt: new Date().toISOString()
    };
    
    jobs.unshift(jobToSave);
    
    // Keep only last 100 jobs
    if (jobs.length > 100) jobs.pop();
    
    await chrome.storage.local.set({ savedJobs: jobs });
    
    return {
      success: true,
      data: { jobId: jobToSave.id, totalSaved: jobs.length }
    };
  } catch (error) {
    console.error('[Background] Save failed:', error);
    return { success: false, error: error.message };
  }
}

// Detailed Ghost Score calculation with signal explanations
function calculateDetailedScore(jobData) {
  let score = 50;
  const signals = [];
  const title = (jobData.title || '').toLowerCase();
  const desc = (jobData.description || '').toLowerCase();
  const company = (jobData.company || '').toLowerCase();

  // 🚩 RED FLAGS (decrease score)
  
  if (/urgent|immediate|asap|start today|start immediately/i.test(title + ' ' + desc)) {
    score -= 12;
    signals.push({
      type: 'red',
      icon: '🚨',
      title: 'Urgency Language',
      description: 'Words like "urgent" or "ASAP" often indicate high turnover or poor planning.',
      impact: 'May signal desperation hiring or replacing someone who left suddenly.',
      advice: 'Ask why the position is urgent. Legitimate urgent roles exist but warrant extra scrutiny.'
    });
  }

  if (/rockstar|ninja|guru|wizard|superstar|unicorn/i.test(title + ' ' + desc)) {
    score -= 10;
    signals.push({
      type: 'red',
      icon: '🎸',
      title: 'Buzzy Job Titles',
      description: 'Terms like "rockstar" or "ninja" often mask unclear role expectations.',
      impact: 'May indicate the company doesn\'t know what they actually need.',
      advice: 'Ask for specific responsibilities. Vague titles often lead to role confusion.'
    });
  }

  if (/competitive salary|commensurate with experience|pay is competitive/i.test(desc)) {
    score -= 8;
    signals.push({
      type: 'red',
      icon: '💰',
      title: 'Vague Salary Info',
      description: '"Competitive" without numbers usually means below market rate.',
      impact: 'Companies confident in their pay typically share ranges upfront.',
      advice: 'Research salary ranges for this role. Ask for the budget early in the process.'
    });
  }

  if (/wear many hats|fast.?paced|dynamic environment|all.?hands on deck/i.test(desc)) {
    score -= 8;
    signals.push({
      type: 'red',
      icon: '🎩',
      title: 'Code for Understaffed',
      description: '"Wear many hats" often means doing 2-3 jobs for 1 salary.',
      impact: 'High burnout risk. Fast-paced usually means overworked.',
      advice: 'Ask about team size and workload. Clarify expectations during interviews.'
    });
  }

  if (/years?.?(of)?.?experience|\d+\+?\s*years/i.test(desc)) {
    const yearMatches = desc.match(/\d+\+?/g);
    if (yearMatches) {
      const years = Math.max(...yearMatches.map(y => parseInt(y)));
      if (years >= 5) {
        score -= 6;
        signals.push({
          type: 'red',
          icon: '📅',
          title: 'High Experience Requirements',
          description: `Requires ${years}+ years of experience - may be unrealistic.`,
          impact: 'Could indicate they want senior talent at junior/mid-level pay.',
          advice: 'Apply anyway if you\'re close. Experience requirements are often flexible.'
        });
      }
    }
  }

  if (/unlimited pto|unlimited vacation|take time as needed/i.test(desc)) {
    score -= 6;
    signals.push({
      type: 'red',
      icon: '🏖️',
      title: '"Unlimited" PTO',
      description: '"Unlimited" PTO often results in employees taking LESS time off.',
      impact: 'No payout for unused time, social pressure not to take breaks.',
      advice: 'Ask about average days taken. Get it in writing if possible.'
    });
  }

  if (/family|work.?life balance|flexible hours/i.test(desc)) {
    // This is actually good, but watch for contradictions
    const hasRedFlags = signals.some(s => s.type === 'red');
    if (hasRedFlags) {
      score -= 4;
      signals.push({
        type: 'yellow',
        icon: '⚠️',
        title: 'Culture Buzzwords + Red Flags',
        description: 'Claims work-life balance but shows signs of overwork.',
        impact: 'Marketing language that may not match reality.',
        advice: 'Ask current employees about actual hours and culture anonymously.'
      });
    }
  }

  // ✅ GREEN FLAGS (increase score)
  
  if (/\$\d{2,3},?\d{3}|\$\d+k|\d{3,3}\s*-\s*\d{3,3}/i.test(desc)) {
    score += 10;
    signals.push({
      type: 'green',
      icon: '✅',
      title: 'Salary Transparency',
      description: 'Specific salary numbers or ranges mentioned.',
      impact: 'Shows confidence in compensation and respect for candidate time.',
      advice: 'Great sign! Transparent companies tend to have fairer practices overall.'
    });
  }

  if (/remote|hybrid|flexible|work from home|wfh/i.test(desc)) {
    score += 5;
    signals.push({
      type: 'green',
      icon: '🏠',
      title: 'Flexible Work Options',
      description: 'Remote or hybrid options mentioned.',
      impact: 'Modern work culture that values autonomy and work-life balance.',
      advice: 'Verify flexibility is real and not just marketing. Ask about expectations.'
    });
  }

  if (/health insurance|401k|dental|vision|benefits package/i.test(desc)) {
    score += 6;
    signals.push({
      type: 'green',
      icon: '🏥',
      title: 'Benefits Mentioned',
      description: 'Specific benefits like health insurance or 401k listed.',
      impact: 'Investment in employee wellbeing. Easier to evaluate total compensation.',
      advice: 'Ask for details on coverage and employer contributions.'
    });
  }

  if (/professional development|learning|training|growth|opportunities/i.test(desc)) {
    score += 5;
    signals.push({
      type: 'green',
      icon: '📚',
      title: 'Growth Opportunities',
      description: 'Mentions professional development or learning opportunities.',
      impact: 'Company invests in employee growth, not just immediate output.',
      advice: 'Ask about specific programs, budgets, or career paths.'
    });
  }

  // Calculate final score
  score = Math.max(0, Math.min(100, score));

  // Generate summary and recommendation
  let summary, recommendation;
  if (score >= 70) {
    summary = 'Multiple red flags detected. Proceed with extreme caution.';
    recommendation = 'This job shows several warning signs. Consider applying only if desperate, and ask tough questions in interviews.';
  } else if (score >= 40) {
    summary = 'Mixed signals. Some concerns but also positive indicators.';
    recommendation = 'Worth investigating further. Ask specific questions about the red flags during interviews.';
  } else {
    summary = 'Strong positive indicators. Likely a legitimate opportunity.';
    recommendation = 'Good signs overall. Still do your due diligence, but this looks promising!';
  }

  return {
    score,
    signals,
    summary,
    recommendation
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
