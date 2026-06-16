# Service Role Exposure Test

## Purpose

This document describes the Playwright security test that checks whether the Supabase service role key is exposed to the browser or shipped in client build artifacts.

Test file:

- `tests/security/service-role-exposure.spec.ts`

NPM script:

- `npm run test:e2e:security`

## Why this test exists

The Supabase service role key is highly privileged. It must remain server-only.

The app may legitimately use `SUPABASE_SERVICE_ROLE_KEY` in trusted server code, but it must never:

- appear in browser-visible HTML
- appear in JavaScript bundles sent to the client
- appear in client-side storage
- appear in same-origin runtime responses
- become readable through browser-accessible globals

This test is intended to catch accidental leakage caused by:

- importing server-only code into client code
- mistakenly renaming the key to a `NEXT_PUBLIC_*` variable
- serializing sensitive configuration into rendered output
- embedding the key into built client assets

## Test coverage

The test has two parts.

### 1. Runtime browser exposure check

The first test starts the app through Playwright and opens:

- `/en/settings`

It then inspects:

- same-origin `document`, `script`, `fetch`, and `xhr` responses
- `window` values that are practically browser-visible
- `window.process?.env` if present
- `localStorage`
- `sessionStorage`
- `document.cookie`
- rendered page HTML

The test fails if it finds either:

- the actual `SUPABASE_SERVICE_ROLE_KEY` value
- the env var name `SUPABASE_SERVICE_ROLE_KEY`

Checking the env var name as well is useful because code can leak intent or configuration shape even when the exact secret value is not printed.

### 2. Production client build artifact check

The second test scans:

- `.next/static`

It reads text-based client assets such as:

- `.js`
- `.mjs`
- `.json`
- `.map`
- `.css`
- `.html`
- `.txt`

It then fails if any built client asset contains:

- the actual service role key value
- the env var name `SUPABASE_SERVICE_ROLE_KEY`

This catches mistakes that may not be obvious from dev-server behavior alone.

## Why both checks are needed

Checking only the dev server is not enough.

Examples:

- a secret may be absent from rendered HTML but still bundled into client JavaScript
- a secret may not be present in static assets but may leak through a runtime response
- dev and production bundling behavior can differ

The runtime test and the bundle scan complement each other.

## Preconditions

The test expects:

- `SUPABASE_SERVICE_ROLE_KEY` to be present in the current test environment
- a valid Playwright setup that can run the app

The bundle-scan part also expects:

- a production build to exist in `.next`

In practice, the normal validation flow is:

1. `npm run build`
2. `npm run test:e2e:security`

## What the test does not guarantee

This test is a strong guardrail, not a mathematical proof.

It does not guarantee:

- that every future response path is safe in every environment
- that external proxies or browser extensions do not expose secrets
- that server logs, CI logs, or monitoring tools do not contain secrets
- that non-client server code is correctly permissioned

It specifically checks browser exposure and client bundle leakage.

## Design choices

### Why `/en/settings`

The settings route is a good target because it exercises authenticated app rendering paths where server and client concerns are mixed more heavily than on a purely static marketing page.

If a future change makes another route more security-sensitive, the test can be expanded to cover it.

### Why same-origin responses only

The test ignores third-party origins because the primary concern is whether this app exposes the key.

If a third-party script somehow received the key, it would typically still show up through one of the same-origin checks or bundled asset checks first.

### Why scan for both key value and env var name

The key value is the obvious secret.

The env var name matters because:

- it may signal accidental serialization of environment data
- it can indicate dangerous refactors before a real secret leak happens

## Failure interpretation

If the runtime test fails:

- the secret or env name is reaching browser-visible content or browser state
- first inspect recent server/client boundary changes
- check for accidental client imports of server-only modules
- check for serialized config objects in page props or rendered markup

If the build scan fails:

- the secret or env name is embedded in shipped client assets
- inspect recent imports, env usage, and any client component referencing server-only modules
- verify the key is not referenced from code paths that can be bundled for the browser

## Common causes of leakage

- using `NEXT_PUBLIC_` for a privileged secret
- importing a server-only helper from a client component
- passing a config object with sensitive values into rendered JSX
- stringifying environment values in debug UI
- adding the service role key to browser-side auth helpers by mistake

## Current implementation notes

At the time of writing:

- privileged account deletion is owned by the Fastify API under `api/`
- the Next.js app calls that API instead of holding deletion logic itself
- the browser should never receive `SUPABASE_SERVICE_ROLE_KEY`

## Recommended usage

Run this test:

- after changes to auth or Supabase integration
- after adding new server/client boundaries
- in CI together with `lint`, `build`, and the main E2E suites

Recommended local sequence:

1. `npm run lint`
2. `npm run build`
3. `npm run test:e2e:security`

## Possible future extensions

- add checks for other server-only secrets
- scan additional build output locations if the app changes bundling strategy
- run the runtime part against multiple authenticated routes
- fail on suspicious exposure of additional internal env var names, not just the service role key
