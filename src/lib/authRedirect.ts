const LOVABLE_EDITOR_HOST_SUFFIX = ".lovableproject.com";

export function getPublicAppOrigin(
  currentOrigin = window.location.origin,
  projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID,
) {
  try {
    const url = new URL(currentOrigin);

    if (url.hostname.endsWith(LOVABLE_EDITOR_HOST_SUFFIX) && projectId) {
      return `https://id-preview--${projectId}.lovable.app`;
    }

    return url.origin;
  } catch {
    return currentOrigin;
  }
}

export function getEmailVerificationRedirectUrl(
  currentOrigin = window.location.origin,
  projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID,
) {
  return `${getPublicAppOrigin(currentOrigin, projectId)}/dashboard`;
}