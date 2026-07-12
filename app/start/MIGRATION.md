# TanStack Start Migration

Production remains on `UTTERLOG_FRONTEND=bun` until every gate below passes.

## Target

- Bun 1.4 runs TanStack Start as the only HTTP and SSR entry.
- TanStack Router owns public and admin navigation.
- Server Routes and Server Functions call framework-independent services.
- PostgreSQL remains the source of truth.
- Hono web routing, the legacy blog renderer, and the Next shim are removed only after cutover observation.

## Visual Matrix

Test every registered theme: Azure, Flux, Nebula, Renascent, and Utterlog.

Viewports:

- Desktop: 1440 x 900
- Mobile: 390 x 844

Routes:

- `/`
- `/posts/:slug`
- `/moments`
- `/archives`
- `/categories`
- `/tags`
- `/footprints`
- `/albums`
- `/music`
- `/links`
- `/login`
- `/admin`

## Required Document Contract

1. Theme attributes are rendered on `<html>` before hydration.
2. Font Awesome, site fonts, `globals.css`, `client.css`, and theme CSS load in legacy order.
3. The body retains `font-sans antialiased bg-page text-primary`.
4. The shared squircle clip path is present.
5. Providers, navigation context, passport script, slots, widgets, player, and chat mount once.

## Acceptance Gates

- No missing icons, fonts, colors, images, or theme variables.
- No incoherent overlap or horizontal overflow at either viewport.
- No browser console errors or hydration warnings.
- Initial content is present in SSR HTML; client hydration does not blank or replace it.
- Public and admin API response contracts match the legacy implementation.
- Authentication, comments, uploads, email, Telegram, GeoIP, backup, and scheduled jobs pass end-to-end tests.
- Start performance is not worse than the production baseline.
- Local HEAD, GitHub revision, and deployed revision are identical.

## Cutover

1. Run Start in a parallel preview container against a restored database snapshot.
2. Complete the visual matrix and API contract suite.
3. Switch `UTTERLOG_FRONTEND=start` only after all gates pass.
4. Keep the Bun renderer available for one observation release.
5. Remove compatibility code in a separate cleanup release.
