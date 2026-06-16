export function createAuthCallbackRedirectUrl({
  path,
  requestUrl,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
}) {
  const request = new URL(requestUrl);
  const baseUrl = siteUrl && siteUrl.trim().length > 0 ? siteUrl : request.origin;

  return new URL(path, baseUrl);
}
