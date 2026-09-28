// GhostJob Dashboard Auth Bridge
// One-time extension-to-dashboard session handoff for jobghost.io.

(function () {
  'use strict';

  const HANDOFF_KEY = 'gj_dashboard_handoff';
  const HANDOFF_TTL_MS = 60 * 1000;
  const MESSAGE_TYPE = 'GHOSTJOB_EXTENSION_SESSION';

  function postHandoffFailure(reason) {
    window.postMessage({
      type: MESSAGE_TYPE,
      error: reason,
    }, window.location.origin);
  }

  function getExtensionLoginNonce() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('extension_login');
    } catch (_error) {
      return null;
    }
  }

  const urlNonce = getExtensionLoginNonce();
  if (!urlNonce) return;

  chrome.storage.local.get([HANDOFF_KEY, 'gj_auth_token', 'gj_refresh_token'], function (stored) {
    const handoff = stored[HANDOFF_KEY];
    const isFresh = handoff && Date.now() - handoff.createdAt <= HANDOFF_TTL_MS;
    const matchesNonce = handoff && handoff.nonce === urlNonce;

    if (!isFresh || !matchesNonce) {
      chrome.storage.local.remove(HANDOFF_KEY);
      postHandoffFailure('invalid_or_expired');
      return;
    }

    chrome.storage.local.remove(HANDOFF_KEY, function () {
      if (!stored.gj_auth_token || !stored.gj_refresh_token) {
        postHandoffFailure('missing_session');
        return;
      }

      window.postMessage({
        type: MESSAGE_TYPE,
        accessToken: stored.gj_auth_token,
        refreshToken: stored.gj_refresh_token,
      }, window.location.origin);
    });
  });
})();
