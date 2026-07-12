# TanStack Start Migration

The full-stack cutover is complete.

## Runtime Contract

- TanStack Start owns public rendering, admin entry routes, and every `/api/*` request.
- TanStack Router file routes define the application and API surface.
- Server Routes call framework-independent services backed by PostgreSQL.
- Bun 1.4 runs the application process.
- Hono is limited to security headers, rate limiting, CORS, and static file delivery.
- There is no Hono business API registration or compatibility fallback.

## Verification Gates

- `bun run server:check`
- `bun run start:build`
- `bun run start:check`
- `bun test`
- Preview smoke tests must confirm `x-utterlog-renderer: tanstack-start` on API and SSR responses.
- Unknown API paths must return a Start-owned JSON `404`.
- Local HEAD, GitHub `main`, and the deployed revision must match before release completion.
