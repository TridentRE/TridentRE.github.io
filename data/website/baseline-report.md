# Website replacement preparation — baseline and preview draft

## Scope and evidence

- Repository: `TridentRE/TridentRE.github.io`, branch `chore/site-import`.
- Starting baseline: `acc2f8aee9269895358d8b658da263f48fff424f`.
- Public comparison performed 2026-11-13 against `https://www.tridentroofingandexteriors.ca`, using GET requests only, four concurrent requests, no authentication.
- **No downloaded website scripts were executed.** JavaScript was inspected and syntax-checked only. No form was submitted.
- This work did not deploy, publish Pages, change a Pages source, change DNS, create a PR, or change repository access. Parent owns preview activation, endpoint work and browser/visual QA.
- Existing brand/style and imagery were retained. `css/style.css`, all 21 image assets and `js/app.js` are unchanged.

## Current-live comparison: original saved baseline

`live-comparison.json` records individual URLs, final URLs, statuses and SHA-256 hashes.

| Check | Result |
|---|---|
| Original HTML pages fetched | 155/155 HTTP 200 |
| HTML source bytes matching live | **155/155 identical** |
| HTML visible text matching live | **155/155 identical** |
| Saved CSS/JS/image files fetched | 24/24 HTTP 200 |
| Saved CSS/JS/image bytes matching live | 23/24 identical |
| Only differing baseline asset | `js/site-config.js` |

The previously imported `site-config.js` already differed from live: live rewrites root-relative links to production on every non-local host; saved code added a staging guard using a hostname substring. This was the only baseline asset delta, aside from line endings in that file. The substring check has now been replaced by exact-host membership.

The comparison JSON was captured **before** this run changed source robots directives, repaired links or added the commercial page. It is deliberately an immutable saved-baseline comparison, not a claim that the new preview files are byte-identical to live. Existing claims in baseline copy were preserved, not independently substantiated.

## Reproduced defects and narrow repairs

`validation-before.json` records eight failures:

1. Excessive-relative `js/site-config.js` script paths in:
   - `index.html`
   - `contact.html`
   - `certifications.html`
   - `faq.html`
   - `guides/storm-damage.html`
2. Nonexistent `#quote` destinations in `services/flat-roofing.html`, `services/siding.html`, `services/skylights.html`.

The five script paths now use the actual file-relative path (`js/site-config.js` or `../js/site-config.js`). The three dead quote CTAs now point to `../contact.html`, matching their existing lower-page inspection CTAs. Browsers may clamp excess `../` at the origin root; the validator deliberately rejects this malformed dependency rather than hiding it with URL normalization.

## Separately authorized preview safeguards

- `js/site-config.js` now recognizes production **only** by exact membership in `tridentroofingandexteriors.ca` and `www.tridentroofingandexteriors.ca`. Look-alike hostname substrings cannot trigger production rewriting.
- Protocol-relative external links are not prefixed with the production origin.
- On **exactly** `tridentre.github.io`, same-site production-absolute navigation anchors are made root-relative, retaining path, query and fragment. External URLs and links containing credentials are not rewritten.
- Canonical, Open Graph and structured-data production URLs remain unchanged for all existing pages.
- On exactly `tridentre.github.io`, JavaScript adds/maintains `noindex,nofollow` and displays a non-interactive bottom notice: **“Website preview. Please do not submit real customer information.”** It uses the existing site's steel-blue/white CSS tokens. The notice has no click-blocking overlay.
- At parent's additional request, **all 156 HTML source files also contain static `noindex,nofollow`**, and preview `robots.txt` is `User-agent: *` / `Disallow: /`. These source directives are intentionally preview-only, not a production SEO change. Robots directives are not access controls and are not a guarantee that a URL cannot appear in search.
- `production-seo.json` saves each page's exact previous production robots meta tag plus the original `robots.txt`. The new commercial page's recorded launch value is `index, follow`.
- `scripts/prepare-production.py` defaults to a **dry run** and checks manifest coverage and exactly one robots meta per page before planning writes. It restores only robots directives; it never commits, pushes, changes Pages, deploys or changes DNS. **`--write` was not run against this checkout.** Do not run it until the owner explicitly approves production launch.
- The dry run currently proposes 157 files: 156 HTML files plus `robots.txt`.

## Separately authorized commercial draft

Parent relayed Garnet's explicit commercial-content request (Slack timestamp `1793291867.746179`, 2026-10-29).

- Added `services/commercial.html` using the service hub's existing header, footer, layout classes, logo and CSS. No new library, font, stock image or stylesheet.
- Audience: business owners and property managers.
- Copy is limited to roof inspections/leak repairs, assessment-led flat roof options, siding/soffit/fascia/eavestroughs, and storm damage documentation.
- No new material-system claims (TPO/EPDM/mod-bit), certifications, client counts, prices, maintenance contracts, builder/multiunit claims, zero-risk guarantees or turnaround promises.
- CTA: **Request a Commercial Inspection** → `/contact.html?project=commercial#consultation-form`.
- The query currently supplies navigation context only; **the existing form does not prefill or submit `project`**. Parent owns that integration.
- Added Commercial to the homepage's existing responsive `.desktop-nav`. This same navigation becomes the hamburger menu on mobile, so the single link serves desktop and mobile menus.
- Added service-hub card, schema ItemList entry, commercial Service/Breadcrumb schema, and sitemap entry (now 156 URLs).
- No visualizer or AI/spend functionality was added.

## Exact current contact-form contract

**Markup:** `contact.html`, `<form id="consultation-form" class="premium-form">`.

**Submit handler:** final contact-form `DOMContentLoaded` listener in `js/app.js` (baseline starts at line 718, `fetch` at line 746; app.js remains unchanged).

1. Finds `#consultation-form`; returns when absent.
2. Registers async `submit`, calls `event.preventDefault()`.
3. Saves button HTML, shows “Sending…” and disables the button.
4. Builds `Object.fromEntries(new FormData(form).entries())`.
5. Replaces `services` with an array of checked `.custom-dropdown-content input[type="checkbox"]` values, if any are checked.
6. Normalizes `insurance_claim` to string `"yes"` or `"no"`.
7. Calls same-origin `fetch('/api/submit', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)})`.
8. Parses response JSON. Any `res.ok` is treated as success, turns the button green and resets the form. A non-2xx JSON error uses `result.error` or “Failed to send”. Network errors/non-JSON bodies go to the red error state. Button state resets after 3 seconds.

Example payload (example values only; no real customer data was submitted):

```json
{
  "name": "Example Customer",
  "phone": "2265550100",
  "email": "customer@example.com",
  "address": "Example property address",
  "insurance_claim": "no",
  "services": ["roofing", "eavestroughs"],
  "message": "Inspection request"
}
```

- `name`, `phone`, `email`, `address`, `message` are HTML-required fields; only email has browser email-format validation.
- Allowed checkbox values currently in markup: `roofing`, `siding`, `eavestroughs`, `skylights`, `specialty`, `emergency`.
- With no services checked, `services` is **absent**, not `[]`. One or more checked values become an array.
- No attachment input, CAPTCHA, honeypot, explicit consent field, project type, source URL, idempotency key or request timeout is currently present.
- `fetch` uses browser default credentials behavior (`same-origin`); no custom authorization header.
- **Privacy defect requiring parent form work:** the form has no `method` or `action`. If JavaScript is disabled or the handler fails to attach, native HTML submission defaults to **GET of the current page**, potentially putting PII in URL/history. This was escalated to parent; it was not silently changed outside this run's form/backend scope.
- A GitHub Pages static site cannot implement `/api/submit`; this preview is **not production-ready for lead capture**.

## Proposed safe configurable endpoint (design only — not implemented)

Use a public HTTPS intake route on the owner-controlled pipeline backend, configured as an explicit `window.TRIDENT_SITE.formEndpoint` value after parent confirms the real deployment URL, for example:

```js
// Proposed configuration shape only; no endpoint exists from this work:
formEndpoint: '' // fail closed until a reviewed owner-controlled HTTPS URL is set
```

Suggested route name: `/api/public/website-lead`. **This is a proposed path, not a live endpoint or confirmed backend URL.** Do not use the former vendor's same-origin Vercel handler as a preview fallback.

Safety requirements for parent implementation:

- Keep preview submission disabled by default; use only synthetic test data and a separate explicit test mode/sink.
- Fail closed for missing/invalid endpoint; do not silently fall back to `/api/submit` or production. Fix native-GET fallback with explicit safe form semantics and a no-JS notice/disabled-by-default controls.
- Allow only configured owner-controlled HTTPS endpoints, no embedded credentials or browser secrets.
- Backend validates/limits required fields, email/phone, service allowlist, insurance flag and message length; do not rely on browser validation.
- Rate limit, enforce request/body limits, add appropriate bot/abuse protection and duplicate suppression, sanitize stored/rendered values.
- Explicit approved origin allowlist for production and optionally exact preview origin; do not treat CORS as authentication or bot prevention. Restrict methods/content type and provide correct OPTIONS behavior if cross-origin JSON is used.
- Persist the lead before acknowledging success; queue/record notification to `info@` with observable delivery status. Return JSON success only for durable accepted leads; use generic JSON errors without stack traces or PII.
- Keep provider credentials and mail sending server-side. Avoid logging whole submissions unnecessarily. Define retention/access and a user-facing privacy/consent approach.
- Prefer a timeout/abort and recoverable errors in the client. Do not clear user-entered data until the backend acknowledges acceptance. Separate preview test leads from production pipeline/notifications.

## Repeatable validation and results

Run from repository root:

```sh
python scripts/validate_site.py --output data/website/validation-after.json
python -m unittest discover -s tests -v
python scripts/prepare-production.py          # dry run ONLY
python -m py_compile scripts/validate_site.py scripts/prepare-production.py tests/test_site.py
# Optional read-only comparison against live at the time you rerun:
python scripts/validate_site.py --live --output data/website/live-comparison-new.json
```

Final results:

- **156 HTML pages**, **156 sitemap URLs**.
- **4,511 HTML/CSS/meta references** classified and checked; external references are inventoried but not treated as local files.
- All local asset paths, internal HTML targets and HTML anchor fragments resolved; zero excessive-relative paths; **zero audit errors**.
- **2 saved JavaScript files parsed with `node --check`**; no imported script evaluated. Validator also syntax-checks executable inline script/event-handler blocks if present; these pages have none.
- **304 JSON-LD blocks parsed** successfully.
- **10/10 regression tests passed**, including traversal detection, same-site URL/query/fragment handling, parser behavior, preview-host source contracts, commercial scope/navigation/schema, static noindex coverage, unchanged form contract, dry-run no-write verification, and production-restore planning/idempotence in disposable fixtures.
- Python compilation passed.
- Baseline files have mixed LF/CRLF. Existing line endings were preserved instead of reformatting the entire site. Standard `git diff --check` reports CR-only line-ending warnings; the Git tool refuses configuration overrides, so that raw check remains nonzero. A separate staged-diff check strips line-ending CR/LF only and verifies there are no added trailing spaces/tabs. This does not change Git configuration.

Evidence files:

- `data/website/live-comparison.json` — pre-change baseline vs current-live status/hash evidence.
- `data/website/validation-before.json` — original eight path/fragment failures.
- `data/website/validation-after.json` — final full static audit.
- `data/website/tests.log` — ten passing tests.
- `data/website/production-dry-run.log` — production restoration dry run, no writes.
- `data/website/production-seo.json` — exact reversible production robots directives.

## Explicit limitations and parent handoff

- No browser visual/responsive QA or JavaScript runtime/integration test was performed, to honor the instruction not to run downloaded scripts. Static source assertions do not prove runtime behavior. Parent owns safe preview browser testing, especially the six-item desktop/mobile menu and preview notice placement.
- No live form submission, backend/email/pipeline delivery, external CDN availability, third-party Maps/Facebook/reviews interactions or Search Console verification was tested.
- Commercial page and preview safeguards are drafts for owner's preview; no live-site content was changed.
- Form handler, endpoint implementation, privacy/fail-closed fallback and commercial prefill remain with parent.
- Worker `ws-DxMBGyBkwVJkon859RDfDi` remains **private** to requester `U0C1EA3GL9G`; parent confirmed visibility, so access was not broadened. Leave it paused for parent to continue on the same branch. Terminate after merge/abandonment when parent no longer needs it.
