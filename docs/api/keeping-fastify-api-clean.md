# Keeping the Fastify API Clean

## Purpose

This guide defines the default structure and maintenance rules for the Fastify API as it grows beyond the first backend-owned features.

The goal is simple:

- keep route files thin
- keep contracts stable
- keep privileged logic isolated
- make new backend features easy to add without spreading logic across the repo

## Current Direction

The API already has the beginning of a clean split:

- `api/routes/`
- `api/services/`
- `api/plugins/`
- `api/lib/`
- `src/shared/api/`

That shape should be preserved and extended, not bypassed.

## Core Rules

### 1. Keep routes thin

Route files should mostly do transport work:

- parse request input
- call a service/helper
- return a response

Route files should not accumulate:

- direct Supabase client setup
- large business rules
- repeated auth parsing
- repeated error-shaping logic

If a route starts repeating logic from another route, extract it immediately into:

- `api/lib/` for transport helpers
- `api/services/` for backend/domain operations
- `api/plugins/` for Fastify wiring concerns

### 2. Treat `src/shared/api/` as the contract layer

If Next.js and Fastify share request/response shapes, define them once in:

- `src/shared/api/`

Put there:

- `zod` schemas
- shared error-code enums
- request/response contracts

Do not duplicate payload shapes in:

- `api/routes/...`
- `src/lib/api/...`

When an API contract changes, update shared schemas first.

### 3. Keep privileged operations inside services

Anything using service-role credentials or backend-only integrations belongs in:

- `api/services/`

Examples:

- account deletion
- global sign-out
- future admin actions
- queue/job orchestration

Routes should call services. They should not contain service-role logic inline.

### 4. Use plugins only for Fastify-specific wiring

`api/plugins/` should hold framework wiring concerns such as:

- decorating the app instance
- registering shared hooks
- attaching common services
- auth-related request decoration later if needed

Do not put business logic into plugins.

### 5. Keep `api/lib/` focused on reusable transport helpers

`api/lib/` is for small helpers that support route behavior, for example:

- bearer token extraction
- standardized reply builders
- request normalization
- shared route guard helpers

If code is not Fastify-transport-oriented, it probably belongs in `api/services/` instead.

## Recommended Folder Boundaries

### `api/routes/`

Use for:

- HTTP endpoint registration
- request parsing
- response sending

Do not use for:

- direct database/admin operations
- large business workflows

### `api/services/`

Use for:

- Supabase operations
- backend-owned business logic
- integration with future workers/queues

Prefer one service file per concern when the API grows:

- `account-service.mjs`
- `session-service.mjs`
- `jobs-service.mjs`

### `api/plugins/`

Use for:

- app decorations
- shared hooks
- auth/request context wiring

### `api/lib/`

Use for:

- small helpers shared by multiple routes
- response helpers
- auth parsing helpers

### `src/shared/api/`

Use for:

- shared `zod` schemas
- typed error-code definitions
- stable contract utilities used by both Next.js and Fastify

Never place server secrets or backend-only code here.

## Naming Guidelines

- Prefer domain names over generic names.
- Good:
  - `account-replies.mjs`
  - `services/supabase.mjs`
  - `shared/api/account.mjs`
- Weak:
  - `utils.mjs`
  - `helpers.mjs`
  - `common.mjs`

If a file name becomes vague, the file probably contains too many unrelated things.

## How to Add a New Endpoint

Recommended order:

1. Define or extend the shared contract in `src/shared/api/`
2. Add or extend service logic in `api/services/`
3. Add route-local helpers in `api/lib/` only if needed
4. Register the endpoint in `api/routes/`
5. Update the Next.js internal client in `src/lib/api/`
6. Add tests:
   - mocked route test
   - real integration test if the feature is backend-sensitive
   - browser E2E if it is user-facing

## Error Handling Rules

- Keep backend error codes stable and explicit.
- Map backend error codes to UI messages in the Next.js layer, not in route files.
- Avoid raw string branching in UI actions when a shared error mapping module can own it.

When adding a new error:

1. define it in `src/shared/api/`
2. return it from the API route/service
3. map it in the internal client/UI layer
4. add tests for it

## Testing Expectations

Every backend-owned feature should ideally have three levels where relevant:

1. Route-level test with mocked services
2. Real backend integration test against Supabase
3. Browser E2E if the feature is user-facing

This keeps feedback fast while still covering real infrastructure paths.

## Refactoring Triggers

Refactor immediately when one of these happens:

- the same auth or reply logic appears in two routes
- a route file grows beyond simple transport responsibilities
- a request/response shape is duplicated
- Next.js and Fastify disagree on payload shape
- a service starts handling unrelated domains

Do not wait for a “big cleanup phase” if the duplication is already obvious.

## Future Growth Guidance

As the API grows toward:

- public API
- workers and queues
- cron jobs
- frontend/backend separation

prefer to expand the current structure rather than replace it abruptly.

Likely future additions:

- `api/routes/public/`
- `api/services/jobs/`
- `api/plugins/auth-context.mjs`
- `api/lib/validation.mjs`

But keep growth incremental. Avoid building a large framework around features that do not exist yet.

## Practical Rule of Thumb

Before adding code, ask:

- Is this transport logic?
  - put it in `api/routes/` or `api/lib/`
- Is this backend/domain logic?
  - put it in `api/services/`
- Is this a shared contract?
  - put it in `src/shared/api/`
- Is this Fastify app wiring?
  - put it in `api/plugins/`

If the answer is unclear, the boundary probably needs to be clarified before adding more code.
