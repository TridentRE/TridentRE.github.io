# Website baseline validation

Compared the original saved baseline (acc2f8a) with the public live website on 2026-11-13.
All 155 existing HTML pages matched byte-for-byte; all 179 HTML/assets fetched successfully.
Of 24 saved assets, the only source difference was a prior staging guard in site-config.js.
The comparison evidence predates subsequent fixes and the additional commercial page.

## Changes for review

- Fixed five malformed relative script references and three dead quote buttons.
- Added a commercial-service page with property-assessment-led copy, homepage navigation,
  service-hub card, structured data and sitemap entry. Existing visual styling and assets retained.
- Added exact-host preview safeguards, static noindex directives and reversible production SEO.
- Replaced the former same-origin form dependency with isolated development/production routing,
  bounded JSON payloads, stable retry IDs, clear error recovery and preview-only success wording.
- Added disabled-by-default submit markup and POST semantics to prevent native GET of contact details.

## Validation scope

Run the documented checks for current results. Original baseline comparison is retained
in live-comparison.json. Existing historical marketing claims were preserved, not newly
substantiated. Preview test requests are synthetic and notification delivery remains disabled.
Actual email receipt is a separate release-verification step, not inferred from an outbox entry.
