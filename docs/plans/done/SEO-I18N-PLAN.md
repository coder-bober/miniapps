# SEO-Friendly Multilingual Website Plan

## Scope

This plan applies to the public website surface rendered by Next.js.

Current route categories:

- public marketing routes under `src/app/[locale]/(marketing)/...`
- private app routes under `src/app/[locale]/(app)/...`
- auth routes such as sign-in, sign-up, reset-password, and check-email
- backend-only Fastify API routes under `api/`

SEO focus should apply only to:

- public marketing routes

Localized but non-SEO routes:

- private app routes should remain `noindex, nofollow`
- auth routes should remain `noindex, nofollow`

Fastify API notes:

- Fastify routes are backend-only and are not part of the crawlable website
- public API planning is separate from website SEO planning
- the website remains the canonical SEO surface

## 1. Keep locale-based routing with App Router

- Keep pages under `src/app/[locale]/...`
- Keep route groups such as `(marketing)` and `(app)` so public and private surfaces stay clearly separated
- Ensure all public website routes remain locale-prefixed and consistent

## 2. Maintain a central i18n configuration layer

- Keep locale config in `src/lib/i18n/config.ts`
- Define supported locales, default locale, locale labels, and helper utilities
- Keep dictionary loading server-friendly for indexable public content

## 3. Keep SEO-safe localized metadata on public pages

- Use Next.js `generateMetadata` in localized public layouts and pages
- Localize `title`, `description`, Open Graph, Twitter, and canonical URLs
- Add `alternates.languages` so search engines understand language variants

For private and auth routes:

- keep metadata localized where useful for UX
- but keep `robots` set to `noindex, nofollow`

## 4. Keep locale-aware layout and language validation

- In `src/app/[locale]/layout.tsx`, validate the route param and return `notFound()` for unsupported locales
- Set correct `<html lang>` dynamically per locale
- Keep shared providers and theme wiring in the localized layout

## 5. Define a clean URL strategy for public SEO

- Use locale-prefixed URLs like `/en`, `/ru`
- Keep the default locale strategy consistent
- Ensure public internal links preserve locale
- Do not treat private app routes as SEO targets even though they are locale-prefixed

## 6. Keep locale-aware navigation utilities

- Maintain helpers for building localized hrefs
- Keep header, menu, and language switcher locale-preserving
- Ensure switching locale keeps the current public route when possible

For private/auth routes:

- preserve locale for UX consistency
- but do not add them to sitemap as indexable content

## 7. Keep server-rendered dictionary usage for marketing pages

- Keep translated marketing content resolved on the server for indexable HTML
- Avoid client-only translation for primary SEO content
- Keep long-form marketing copy and metadata-oriented copy structured for localization

## 8. Maintain SEO infrastructure pages and metadata assets

- Generate localized `sitemap.ts` for public marketing routes only
- Generate `robots.ts`
- Add localized or shared Open Graph image strategy for public pages
- Add manifest and favicon assets where needed

Do not include:

- private app routes
- auth routes
- Fastify API routes

## 9. Keep canonical and hreflang correctness

- For each public locale page, emit canonical URL for that locale
- Emit alternate language links for all supported locales
- Ensure no duplicate-content ambiguity between locales

For private/auth routes:

- localized canonical handling is acceptable
- but they should not be treated as indexable search targets

## 10. Keep translation content structure scalable

- Keep reusable UI labels separate from long-form marketing copy
- Use namespaces such as `common`, `header`, `home`, `profile`, `seo`, `auth`
- Avoid scattering static strings across components

## 11. Maintain performance and crawlability best practices on public pages

- Keep important marketing content in server components
- Avoid hiding primary public content behind client-only interactivity
- Use semantic headings, structured sections, and descriptive anchor text

## 12. Add structured data where relevant

- Add JSON-LD for organization, website, and software application on public marketing pages
- Localize relevant structured fields where appropriate
- Keep schema aligned with actual public page content

Do not add misleading structured data to:

- private app pages
- auth pages

## 13. Keep redirect and fallback behavior explicit

- Redirect `/` to the default locale or serve the default locale consistently
- If language auto-detection is introduced later, keep it SEO-safe and predictable
- Unsupported locale paths should 404, not silently render the wrong language

## 14. Preserve route separation in project structure

- Public landing and future marketing pages should live under `src/app/[locale]/(marketing)/...`
- Private app pages such as profile, workspace, and settings should live under `src/app/[locale]/(app)/...`
- Keep header and locale-aware navigation in organized component folders
- Keep Fastify API evolution separate under `api/`

## 15. Validate public SEO end-to-end

- Check public localized routes render indexable HTML
- Verify metadata output per public locale page
- Verify sitemap, robots, canonical, and hreflang output
- Verify private app routes and auth routes remain `noindex, nofollow`
- Run `npm run lint`
- Run `npm run build`
- Run public-page smoke checks for `/en` and `/ru`

## 16. Keep the SEO/backend boundary clear

- Next.js public routes are the SEO surface
- Fastify API routes are backend infrastructure, not search targets
- Future public API work should have its own plan for versioning, auth, and documentation, separate from website SEO
