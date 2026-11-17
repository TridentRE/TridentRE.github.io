# Website metrics wire contract — 2026-11-17

## Form attribution

The existing contact-form JSON submission gains optional `attribution`:

```json
{
  "formPage": "/contact.html",
  "landingPage": "/services/roofing.html",
  "referrer": "www.google.ca/search",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "winter",
  "utm_term": "roof repair",
  "utm_content": "variant-a",
  "gclid": "truncated-id",
  "firstSeenAt": 1794950000000
}
```

- formPage/landingPage: pathname only, maximum 300 characters, no query/hash;
  invalid paths fall back to `/`.
- referrer: HTTP(S) host + path only (including port if supplied), maximum 300;
  no scheme, credentials, query, or fragment. Missing/invalid => empty string.
- All five UTM fields: trimmed/control-character-stripped strings, maximum 120
  each; omitted when empty. Campaign/click fields containing `@`, `?` or `#`
  are dropped to match the backend privacy guard. Invalid referrers become empty
  and invalid paths fall back to `/`. Do not put personal data in campaign tags.
- gclid/fbclid: strings, maximum 64 each; omitted when empty.
- firstSeenAt: first visit's `Date.now()` timestamp in milliseconds.
- No arbitrary query parameters or form-field contents enter attribution.

Storage: `trident.attribution.v1` = `{firstTouch, lastTouch}`. The firstTouch
object keeps the original campaign and landing/referrer/time. lastTouch contains
campaign fields only. A visit with any non-empty recognized UTM/click-ID replaces
lastTouch as a group (clearing old, missing campaign fields/click IDs); a direct
visit preserves it. Wire attribution uses lastTouch campaign fields and
firstTouch landing/referrer/time. Expiry is 30 days from firstSeenAt, not sliding.
Unavailable/invalid storage degrades to in-memory capture without breaking forms.

## Anonymous event

POST `https://spotted-gnat-928.convex.site/api/website/event`:

```json
{
  "type": "call_tap",
  "page": "/contact.html",
  "landingPage": "/services/roofing.html",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "winter",
  "gclid": true,
  "fbclid": false
}
```

Types: `call_tap`, `form_start`, `form_submit` only. Same path/campaign caps as
above. gclid/fbclid are always booleans here, never raw IDs. No referrer, timestamp,
visitor ID, phone number, form values, UTM term/content or arbitrary query data.

Transport: `navigator.sendBeacon` with JSON in a **text/plain;charset=UTF-8**
Blob. This avoids cross-origin preflight. Server must parse JSON independent of
MIME type. If sendBeacon is absent/throws/returns false, use fetch with the same
body/MIME, `keepalive: true`, `credentials: 'omit'`, `redirect: 'error'`. No retries
or blocking navigation; request failure must not affect intake. Browser beacon
transport itself does not expose a credentials-omit option; no application auth
or visitor identifiers are supplied. CORS restricts the three allowed origins.

`form_start`: first focus of a real input/select/textarea in #consultation-form
per page load (ignore hidden fields and honeypot). `form_submit`: only after the
existing intake responds HTTP success with `{ok:true}`. Retry failures never
count a submit. Tel taps do not prevent default or include the destination.

Allowed hosts: exact www/apex production domain and tridentre.github.io. Preview
metrics intentionally use this production event endpoint; preview lead intake
remains the separate development endpoint. No events on localhost/lookalikes.

## Optional provider configuration

`js/analytics-config.js`, `window.TRIDENT_ANALYTICS_CONFIG`:
`GA4_ID: ''` and `CLARITY_ID: ''`. Both OFF. Non-empty valid IDs activate only
their provider. Enabled GA records page_view (config send_page_view), click_call,
and generate_lead; page/referrer URLs omit queries/fragments. Enabling Clarity
requires its normal privacy/consent review; no session replay loads while OFF.
