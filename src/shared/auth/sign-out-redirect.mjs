export function createSignOutRedirectUrl({
  requestUrl,
  referer,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
}) {
  const request = new URL(requestUrl);
  const refererUrl = new URL(referer ?? requestUrl, request);
  const locale = refererUrl.pathname.split("/").filter(Boolean)[0] ?? "en";
  const baseUrl = siteUrl && siteUrl.trim().length > 0 ? siteUrl : request.origin;

  return new URL(`/${locale}`, baseUrl);
}
