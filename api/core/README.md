# Core

This folder is the home for backend-wide Fastify concerns.

Use `api/core` for code that should remain platform-owned, such as:

- account and session endpoints
- auth verification helpers
- shared storage and queue abstractions
- shared backend configuration
- cross-module infrastructure services

Domain-owned backend code belongs under `api/modules/<module-id>`.
