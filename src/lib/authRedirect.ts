const LOVABLE_EDITOR_HOST_SUFFIX = ".lovableproject.com";
const LOVABLE_PREVIEW_HOST_SUFFIX = ".lovable.app";
const CANONICAL_APP_ORIGIN = "https://jobghost.io";

function isLovableInternalHost(hostname: string, projectId?: string) {
  return (
    hostname.endsWith(LOVABLE_EDITOR_HOST_SUFFIX) ||
    hostname.endsWith(LOVABLE_PREVIEW_HOST_SUFFIX) ||
    hostname === "lovable.dev" ||
    (Boolean(projectId) && hostname === `id-preview--${projectId}.lovable.app`)
  );
}

export function getPublicAppOrigin(
  currentOrigin = window.location.origin,
  projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID,
  canonicalOrigin = CANONICAL_APP_ORIGIN,
) {
  try {
    const url = new URL(currentOrigin);
    const preferredOrigin = canonicalOrigin ? new URL(canonicalOrigin).origin : null;

    if (preferredOrigin && isLovableInternalHost(url.hostname, projectId)) {
      return preferredOrigin;
    }

    return url.origin;
  } catch {
    return canonicalOrigin || currentOrigin;
  }
}

export function getEmailVerificationRedirectUrl(
  currentOrigin = window.location.origin,
  projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID,
  canonicalOrigin = CANONICAL_APP_ORIGIN,
) {
  return `${getPublicAppOrigin(currentOrigin, projectId, canonicalOrigin)}/dashboard`;
}