# Trident Roofing & Exteriors

Static website with a separate, write-only lead-intake backend.
The live domain is not changed by this branch.

## Preview

- Preview uses only a separate development lead database. Use synthetic details, never real customer information.
- Notification delivery is disabled in preview; saved test requests do not email the business.
- All preview HTML is noindex,nofollow and robots disallows crawling.
- Production-domain form routing stays disabled until the reviewed release mode is enabled.
- The form fails closed without JavaScript; personal details are never submitted by native GET.

## Checks

```sh
python scripts/validate_site.py --output data/website/validation-after.json
python -m unittest discover -s tests -v
node --test scripts/*.test.cjs
python scripts/prepare-production.py  # dry run, no writes
```

`prepare-production.py --write` restores the recorded production SEO directives and
production-host form routing. It does not publish, deploy a backend or alter DNS.
Run it only for an approved production release. Production backend deployment,
notification activation, DNS zone backup, HTTPS checks and owner approval are separate gates.

## Visual feedback regression

With Playwright and Chromium installed outside the static site:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright FEEDBACK_ARTIFACTS=/path/to/output node tests/render_feedback.cjs
```

This reads the local checkout through a browser route for the preview hostname, blocks
non-GET requests, times two real slide changes at 390px and 1440px, and saves page
screenshots. It also checks hover, focus, pause, manual controls, reduced motion,
preview noindex, image loading and horizontal overflow. No forms are submitted.
Photo approval sources and deliberately retained assets are recorded in
`data/website/photo-provenance-20261114.json`.

## Website attribution / optional analytics

All 156 pages load `js/analytics-config.js` then `js/website-metrics.js` with
`defer`. No visible markup/styles changed. First-touch landing path, referrer
host/path, campaign tags and click IDs are stored under
`localStorage['trident.attribution.v1']` for 30 days; a new campaign replaces
last-touch campaign fields without changing the original landing/time.
Contact submissions include the flattened last-touch attribution plus formPage.
See [the wire contract](data/website/metrics-contract.md) for caps and semantics.

**GA4 and Clarity are OFF.** The only configuration location is
`js/analytics-config.js`: `window.TRIDENT_ANALYTICS_CONFIG.GA4_ID` and
`window.TRIDENT_ANALYTICS_CONFIG.CLARITY_ID`, both empty strings. Empty/invalid
IDs load nothing and create no third-party queues. Set the approved IDs there
(`G-…` for GA4; Clarity project ID only, not a whole script), then release through
the normal backup/review process. Enabled GA4 records a page view, `click_call`
on tel taps and `generate_lead` only after a saved request. GA page URLs and
referrers omit query strings and fragments. Review privacy/consent settings
before enabling either third-party provider.

Anonymous `call_tap`, first `form_start` per page load, and successful
`form_submit` counts POST to the production website-event endpoint from the
three approved hosts, including the GitHub preview. Preview **form submissions**
still go only to the development intake. Automated tests intercept all writes;
do not exercise preview metrics against production casually.

Additional offline browser regression (Playwright installed outside the repo):

```sh
PLAYWRIGHT_MODULE=/path/to/playwright METRICS_ARTIFACTS=/path/to/output node tests/render_metrics.cjs
```

Every network request is served locally or mocked, including failed/successful
form requests and beacons. It cannot create a production lead or metric count.
