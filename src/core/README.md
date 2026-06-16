# Core

This folder is the home for platform-wide application concerns.

Use `src/core` for code that the whole product depends on, such as:

- auth and current-user flows
- settings and account management
- storage abstractions
- queue abstractions
- app shell and shared navigation primitives
- i18n, permissions, and theme infrastructure

Do not move domain-specific product areas here. Those belong in `src/modules`.
